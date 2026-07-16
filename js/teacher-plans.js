// ============================================
// C3UA — TEACHER PORTAL: MY LESSON PLANS TAB
// Loaded by: teacher-dashboard.html
// ============================================

function initPlanUploadFilters() {
    wireCascadingFilters('plan', () => loadTopicsForPlan());
}

async function loadTopicsForPlan() {
    const cls = document.getElementById('plan-class').value;
    const subjectId = document.getElementById('plan-subject').value;
    const topicEl = document.getElementById('plan-topic');
    topicEl.innerHTML = '<option value="">Loading topics...</option>';
    topicEl.disabled = true;

    if (!subjectId || !cls) {
        topicEl.innerHTML = '<option value="">Pick a class and subject first</option>';
        return;
    }
    try {
        const data = await GET('/api/curriculum/topics/', { subject: subjectId, class_level: cls });
        const topics = data.results || data || [];
        topicEl.innerHTML = topics.length
            ? topics.map(t => `<option value="${t.id}">${t.topic_name}${t.week_start ? ` (Wk ${t.week_start}-${t.week_end})` : ''}</option>`).join('')
            : '<option value="">No topics found for this class/subject</option>';
        topicEl.disabled = false;
    } catch (e) {
        topicEl.innerHTML = '<option value="">Could not load topics</option>';
    }
}

async function submitLessonPlan() {
    const topicId = document.getElementById('plan-topic').value;
    const fileInput = document.getElementById('plan-file');
    const btn = document.getElementById('plan-submit-btn');
    if (!topicId) { toast('Pick a topic first', 'warning'); return; }
    if (!fileInput.files.length) { toast('Choose a lesson plan file', 'warning'); return; }

    const fd = new FormData();
    fd.append('topic', topicId);
    fd.append('file', fileInput.files[0]);

    btn.disabled = true; btn.textContent = 'Uploading...';
    try {
        await POST('/api/compliance/lesson-plans/', fd);
        toast('Lesson plan submitted for analysis', 'success');
        fileInput.value = '';
        loadMyLessonPlans();
    } catch (e) {
        toast('Upload failed: ' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '📤 Submit for Analysis';
    }
}

async function loadMyLessonPlans() {
    const container = document.getElementById('my-plans-list');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const data = await GET('/api/compliance/lesson-plans/');
        const plans = data.results || data || [];
        container.innerHTML = plans.length ? `
            <div class="table-wrap table-scroll">
                <table>
                    <thead><tr><th>Topic</th><th>Subject</th><th>File</th><th>Submitted</th><th>Compliance</th><th>Status</th></tr></thead>
                    <tbody>${plans.map(p => `
                        <tr>
                            <td>${p.topic_name || '—'}</td>
                            <td>${p.subject_name || '—'}</td>
                            <td class="text-sm">${p.original_filename || '—'}</td>
                            <td class="text-sm">${p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : '—'}</td>
                            <td style="color:${scoreColor(p.compliance_score)};">${fmtPct(p.compliance_score)}</td>
                            <td><span class="badge ${p.status === 'reviewed' ? 'badge-success' : p.status === 'flagged' ? 'badge-danger' : p.status === 'analyzed' ? 'badge-info' : 'badge-warning'}">${p.status}</span></td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        ` : '<div class="text-muted text-sm">You haven\'t submitted any lesson plans yet.</div>';
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}
