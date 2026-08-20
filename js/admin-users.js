// ============================================
// C3UA — ADMIN: MANAGE USERS TAB
// Loaded by: dashboard.html
//
// Backend note: /api/accounts/users/ is a full ModelViewSet. create,
// list and destroy require IsAdminRole; retrieve/update only require
// IsAuthenticated (apps/accounts/views.py) — so this tab is the
// intended, safe way to manage accounts rather than hitting the API
// directly. The user list/edit serializer has no password field, so
// editing a user does not touch their password; only creation sets one.
// ============================================

const usersState = { page: 1, pageSize: 50, count: 0, totalPages: 1, rows: [] };

async function loadUsers(page = 1) {
    const tbody = document.getElementById('a-users-tbody');
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading"><div class="spinner"></div></div></td></tr>';
    try {
        const data = await GET('/api/accounts/users/', { page, page_size: usersState.pageSize });
        usersState.rows = data.results || data || [];
        usersState.count = data.count ?? usersState.rows.length;
        usersState.totalPages = data.total_pages || 1;
        usersState.page = page;
        renderUsersTable();
        renderUsersPager();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div></td></tr>`;
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('a-users-tbody');
    const roleFilter = document.getElementById('users-role-filter')?.value || '';
    const search = (document.getElementById('users-search')?.value || '').toLowerCase();

    let rows = usersState.rows;
    if (roleFilter) rows = rows.filter(u => u.role === roleFilter);
    if (search) rows = rows.filter(u =>
        (u.full_name || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search));

    tbody.innerHTML = rows.length ? rows.map(u => `
        <tr>
            <td><strong>${u.full_name || (u.first_name + ' ' + u.last_name)}</strong></td>
            <td>${u.email}</td>
            <td><span class="badge ${roleBadgeClass(u.role)}">${roleLabel(u.role)}</span></td>
            <td>${u.role === 'student' ? (u.class_level || '—') + (u.stream ? ' / ' + u.stream : '') : '—'}</td>
            <td>${u.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Inactive</span>'}</td>
            <td style="white-space:nowrap;">
                <button class="btn btn-secondary btn-sm" onclick="openUserModal(${u.id})"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">edit</span> Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id}, '${(u.full_name || u.email).replace(/'/g, "\\'")}')"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">delete</span></button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gray-500);">No users match</td></tr>';
}

function renderUsersPager() {
    const el = document.getElementById('a-users-pager');
    el.innerHTML = `
        <span class="text-muted text-sm">${usersState.count} users · Page ${usersState.page} of ${usersState.totalPages}</span>
        <div class="gap-2 flex">
            <button class="btn btn-secondary btn-sm" ${usersState.page <= 1 ? 'disabled' : ''} onclick="loadUsers(${usersState.page - 1})"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">arrow_back</span> Prev</button>
            <button class="btn btn-secondary btn-sm" ${usersState.page >= usersState.totalPages ? 'disabled' : ''} onclick="loadUsers(${usersState.page + 1})">Next <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">arrow_forward</span></button>
        </div>
    `;
}

function roleBadgeClass(role) {
    return { admin: 'badge-info', teacher: 'badge-success', student: 'badge-warning', authority: 'badge-neutral' }[role] || 'badge-neutral';
}

function openUserModal(userId) {
    const editing = !!userId;
    const u = editing ? usersState.rows.find(x => x.id === userId) : null;

    openModal(editing ? 'Edit User' : 'New User', `
        <div class="form-group"><label class="form-label">First Name</label><input class="form-control" id="um-first" value="${u?.first_name || ''}"></div>
        <div class="form-group"><label class="form-label">Last Name</label><input class="form-control" id="um-last" value="${u?.last_name || ''}"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="um-email" type="email" value="${u?.email || ''}" ${editing ? 'disabled' : ''}></div>
        <div class="form-group"><label class="form-label">Role</label>
            <select class="form-control" id="um-role" onchange="toggleStudentFields()">
                <option value="admin" ${u?.role === 'admin' ? 'selected' : ''}>School Admin</option>
                <option value="teacher" ${u?.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                <option value="student" ${(!u || u?.role === 'student') ? 'selected' : ''}>Student</option>
                <option value="authority" ${u?.role === 'authority' ? 'selected' : ''}>Education Authority</option>
            </select>
        </div>
        <div id="um-student-fields" style="display:${(!u || u?.role === 'student') ? 'block' : 'none'};">
            <div class="form-group"><label class="form-label">Class</label>
                <select class="form-control" id="um-class"><option value="">Select class...</option></select>
            </div>
            <div class="form-group"><label class="form-label">Stream (optional)</label><input class="form-control" id="um-stream" value="${u?.stream || ''}" placeholder="e.g. MPC, MEG, HEG"></div>
        </div>
        ${editing ? '' : `<div class="form-group"><label class="form-label">Temporary Password</label><input class="form-control" id="um-password" type="password" placeholder="At least 8 characters"></div>`}
        <div class="flex gap-2 mt-4">
            <button class="btn btn-primary btn-block" id="um-save-btn" onclick="saveUser(${userId || 'null'})">${editing ? 'Save Changes' : 'Create User'}</button>
        </div>
    `);

    // Populate the class dropdown from the curriculum tree and pre-select.
    const classEl = document.getElementById('um-class');
    const classes = STATE.curriculumTree.flatMap(l => l.grades);
    classEl.innerHTML = '<option value="">Select class...</option>' +
        classes.map(g => `<option value="${g.class_code}" ${u?.class_level === g.class_code ? 'selected' : ''}>${g.name || g.class_code}</option>`).join('');
}

function toggleStudentFields() {
    const role = document.getElementById('um-role').value;
    document.getElementById('um-student-fields').style.display = role === 'student' ? 'block' : 'none';
}

async function saveUser(userId) {
    const btn = document.getElementById('um-save-btn');
    const payload = {
        first_name: document.getElementById('um-first').value.trim(),
        last_name: document.getElementById('um-last').value.trim(),
        role: document.getElementById('um-role').value,
        class_level: document.getElementById('um-role').value === 'student' ? document.getElementById('um-class').value : '',
        stream: document.getElementById('um-role').value === 'student' ? document.getElementById('um-stream').value.trim() : '',
    };
    if (!payload.first_name || !payload.last_name) { toast('First and last name are required', 'warning'); return; }

    btn.disabled = true; btn.textContent = 'Saving...';
    try {
        if (userId) {
            await PUT(`/api/accounts/users/${userId}/`, payload);
            toast('User updated', 'success');
        } else {
            payload.email = document.getElementById('um-email').value.trim();
            payload.language = 'en';
            payload.password = document.getElementById('um-password').value;
            if (!payload.email || !payload.password || payload.password.length < 8) {
                toast('Email and an 8+ character password are required', 'warning');
                btn.disabled = false; btn.textContent = 'Create User';
                return;
            }
            await POST('/api/accounts/users/', payload);
            toast('User created', 'success');
        }
        closeModal();
        loadUsers(usersState.page);
    } catch (e) {
        toast('Could not save: ' + e.message, 'error');
        btn.disabled = false; btn.textContent = userId ? 'Save Changes' : 'Create User';
    }
}

async function deleteUser(userId, name) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
        await DELETE(`/api/accounts/users/${userId}/`);
        toast('User deleted', 'success');
        loadUsers(usersState.page);
    } catch (e) {
        toast('Could not delete: ' + e.message, 'error');
    }
}

function filterUsersTable() { renderUsersTable(); }
