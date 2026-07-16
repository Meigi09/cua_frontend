// ============================================
// C3UA — STUDENT PORTAL: MY TEACHER TAB
// Loaded by: student-dashboard.html
// ============================================

function initTeacherSubjectFilter() {
    const el = document.getElementById('mt-subject');
    if (!el || el.dataset.wired) return;
    const myClass = STATE.user?.class_level;
    const subjects = getSubjectsFor(null, myClass);
    el.innerHTML = '<option value="">All my subjects</option>' +
        subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    el.dataset.wired = '1';
    el.addEventListener('change', loadAvailableTeachers);
}

async function loadAvailableTeachers() {
    const listEl = document.getElementById('mt-list');
    const currentEl = document.getElementById('mt-current');
    listEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    const currentTeacherId = STATE.user?.teacher;
    if (currentTeacherId) {
        currentEl.style.display = 'block';
        currentEl.textContent = `Your current teacher: ${STATE.user.teacher_name || '(selected)'}`;
    } else {
        currentEl.style.display = 'none';
    }

    try {
        const subjectId = document.getElementById('mt-subject').value;
        const params = subjectId ? { subject_id: subjectId } : {};
        const teachers = await GET('/api/accounts/users/available_teachers/', params);

        if (!teachers.length) {
            listEl.innerHTML = '<div class="text-muted text-sm">No teachers found for your class/subject yet.</div>';
            return;
        }

        listEl.innerHTML = teachers.map(t => `
            <div class="card mb-2" style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:600;">${t.name}</div>
                    <div class="text-muted text-sm">${t.subjects.join(', ') || '—'}</div>
                </div>
                <button class="btn ${currentTeacherId === t.id ? 'btn-secondary' : 'btn-primary'} btn-sm"
                        ${currentTeacherId === t.id ? 'disabled' : ''}
                        onclick="pickTeacher(${t.id})">
                    ${currentTeacherId === t.id ? '✓ Selected' : 'Select'}
                </button>
            </div>
        `).join('');
    } catch (e) {
        listEl.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}

async function pickTeacher(teacherId) {
    try {
        const updated = await POST('/api/accounts/users/set_teacher/', { teacher_id: teacherId });
        STATE.user.teacher = updated.teacher;
        STATE.user.teacher_name = updated.teacher_name;
        const saved = JSON.parse(localStorage.getItem('c3ua_session') || '{}');
        saved.user = STATE.user;
        localStorage.setItem('c3ua_session', JSON.stringify(saved));
        toast('Teacher updated', 'success');
        loadAvailableTeachers();
    } catch (e) {
        toast(e.message, 'warning');
    }
}
