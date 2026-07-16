// ============================================
// C3UA — STUDENT APP SHELL v3
// Teachers auto-assigned — no manual picker
// ============================================

function initStudent() {
    if (!STATE.user) return;
    const name = ((STATE.user.first_name||'') + ' ' + (STATE.user.last_name||'')).trim() || STATE.user.email;
    const avatarEl = document.getElementById('student-avatar');
    const nameEl   = document.getElementById('student-name');
    const classEl  = document.getElementById('student-class');
    if (avatarEl) avatarEl.textContent = initials(name);
    if (nameEl)   nameEl.textContent = name;
    if (classEl)  classEl.textContent = STATE.user.class_level
        ? `${STATE.user.class_level}${STATE.user.stream ? ' / '+STATE.user.stream : ''}`
        : 'Student';

    loadCurriculumTree().then(() => {
        initStudentMasteryFilters?.();
        initQuizFilters?.();
        initFeedbackFormFilters?.();
    });
    loadMyMasteryOverview();
}

function showStudentTab(tabId, el) {
    document.querySelectorAll('#page-student .tab-content').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.add('active');
    document.querySelectorAll('#student-sidebar .sidebar-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelector('.main-content').scrollTop = 0;

    const loaders = {
        's-mastery':    loadMyMasteryOverview,
        's-quiz':       () => {},
        's-results':    loadMyResults,
        's-feedback':   loadMyFeedbackHistory,
        's-simulation': loadSimulationList,
    };
    if (loaders[tabId]) setTimeout(loaders[tabId], 50);
}

document.addEventListener('DOMContentLoaded', () => {
    if (!enforceRolePage(['student'])) return;
    initStudent();
});