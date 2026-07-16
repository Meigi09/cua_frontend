// ============================================
// C3UA — AUTH
// Loaded by: login.html, dashboard.html
// Real page navigation (window.location) is used instead of an
// in-page "fake page" swap, so sign-in always lands cleanly at the
// top of the dashboard with no leftover scroll position.
// ============================================

let selectedRole = 'admin';

function selectRole(role, el) {
    selectedRole = role;
    document.querySelectorAll('.role-option').forEach(r => r.classList.remove('active'));
    el.classList.add('active');
    const emails = {
        admin: 'admin@gsmk.edu.rw',
        teacher: 'teacher@gsmk.edu.rw',
        student: 'student@gsmk.edu.rw',
        authority: 'authority@gsmk.edu.rw',
    };
    document.getElementById('login-email').value = emails[role] || '';
}

// Teacher and Student each get their own portal. Authority doesn't have
// one yet, so it lands on the admin shell for now (see README for status).
function destinationForRole(role) {
    if (role === 'teacher') return 'teacher-dashboard.html';
    if (role === 'student') return 'student-dashboard.html';
    return 'dashboard.html';
}

async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');

    errEl.classList.remove('show');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    const goToDashboard = () => { window.location.href = destinationForRole(STATE.role); };

    try {
        const data = await POST('/api/auth/login/', { email, password });
        STATE.token = data.access;
        STATE.refresh = data.refresh;
        const user = await GET('/api/accounts/users/me/');
        STATE.user = user;
        STATE.role = user.role || selectedRole;
        persistSession();
        goToDashboard();
    } catch (e) {
        errEl.textContent = '⚠️ ' + e.message;
        errEl.classList.add('show');
        if (e.message.includes('Cannot reach') || e.message.includes('server')) {
            toastOrAlert('⚠️ Backend offline — continuing in demo mode', 'warning');
            STATE.user = { first_name: selectedRole, role: selectedRole, email };
            STATE.role = selectedRole;
            persistSession();
            setTimeout(goToDashboard, 500);
            return;
        }
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

function persistSession() {
    try {
        localStorage.setItem('c3ua_session', JSON.stringify({
            token: STATE.token,
            refresh: STATE.refresh,
            user: STATE.user,
        }));
    } catch (e) { /* storage unavailable, session just won't persist */ }
}

function doLogout() {
    try { localStorage.removeItem('c3ua_session'); } catch (e) {}
    STATE.token = null;
    STATE.refresh = null;
    STATE.user = null;
    if (STATE.guidesInterval) clearInterval(STATE.guidesInterval);
    window.location.href = 'login.html';
}

// Used on dashboard.html: if nobody is signed in, bounce to login.
function requireAuth() {
    if (!STATE.user) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Used at the top of each portal page (dashboard.html, teacher-dashboard.html)
// to make sure a signed-in user is actually on *their* portal. Admins can
// preview any portal; everyone else gets bounced to their own page.
function enforceRolePage(allowedRoles) {
    if (!requireAuth()) return false;
    if (STATE.role === 'admin') return true;
    if (!allowedRoles.includes(STATE.role)) {
        window.location.href = destinationForRole(STATE.role);
        return false;
    }
    return true;
}

// toast() only exists on pages that load ui-helpers.js (the dashboard).
// On login.html there's no toast tray, so fall back to the inline error box.
function toastOrAlert(message, type) {
    if (typeof toast === 'function') toast(message, type);
}
