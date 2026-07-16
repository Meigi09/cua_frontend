// ============================================
// C3UA — STUDENT PORTAL: GIVE FEEDBACK TAB
// Loaded by: student-dashboard.html
// ============================================

function initFeedbackFormFilters() {
    wireCascadingFilters('fb', () => loadTopicsForFeedback(), { classOptional: false });
    const myClass = STATE.user?.class_level;
    if (myClass) {
        const classEl = document.getElementById('fb-class');
        if (classEl) { classEl.value = myClass; classEl.dispatchEvent(new Event('change')); }
    }
}

async function loadTopicsForFeedback() {
    const cls = document.getElementById('fb-class').value;
    const subjectId = document.getElementById('fb-subject').value;
    const topicEl = document.getElementById('fb-topic');
    if (!subjectId || !cls) {
        topicEl.innerHTML = '<option value="">Pick a subject first</option>';
        return;
    }
    try {
        const data = await GET('/api/curriculum/topics/', { subject: subjectId, class_level: cls });
        const topics = data.results || data || [];
        topicEl.innerHTML = topics.length
            ? topics.map(t => `<option value="${t.id}">${t.topic_name}</option>`).join('')
            : '<option value="">No topics found</option>';
    } catch (e) {
        topicEl.innerHTML = '<option value="">Could not load topics</option>';
    }
}

async function submitFeedback() {
    const topicId = document.getElementById('fb-topic').value;
    const difficulty = document.getElementById('fb-difficulty').value;
    const comment = document.getElementById('fb-comment').value.trim();
    const btn = document.getElementById('fb-submit-btn');

    if (!topicId) { toast('Pick a topic first', 'warning'); return; }

    btn.disabled = true; btn.textContent = 'Submitting...';
    try {
        await POST('/api/feedback/submit/', { topic: topicId, difficulty_level: difficulty, comment });
        toast('Thanks — feedback submitted!', 'success');
        document.getElementById('fb-comment').value = '';
        loadMyFeedbackHistory();
    } catch (e) {
        toast('Could not submit: ' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '📨 Submit Feedback';
    }
}

async function loadMyFeedbackHistory() {
    const container = document.getElementById('fb-history');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const data = await GET('/api/feedback/submit/');
        const rows = data.results || data || [];
        container.innerHTML = rows.length ? rows.map(f => `
            <div style="padding:8px 12px;background:var(--gray-50);border-radius:var(--radius);margin-bottom:6px;font-size:13px;">
                <strong>${f.topic_name || '—'}</strong> <span class="text-muted">· ${f.subject_name || ''}</span>
                <span class="badge ${f.difficulty_level === 'high' ? 'badge-danger' : f.difficulty_level === 'medium' ? 'badge-warning' : 'badge-success'}" style="margin-left:6px;">${f.difficulty_level}</span>
                ${f.comment ? `<div class="text-muted mt-2">"${f.comment}"</div>` : ''}
            </div>
        `).join('') : '<div class="text-muted text-sm">You haven\'t given any feedback yet.</div>';
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}
