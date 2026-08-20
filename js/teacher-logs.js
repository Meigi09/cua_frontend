// ============================================
// C3UA — TEACHER PORTAL: MY CLASS LOGS TAB
// Loaded by: teacher-dashboard.html
// ============================================

function initLogFilters() {
    wireCascadingFilters('log', () => loadTopicsForLog());
}

async function loadTopicsForLog() {
    const cls = document.getElementById('log-class').value;
    const subjectId = document.getElementById('log-subject').value;
    const topicEl = document.getElementById('log-topic');
    if (!subjectId || !cls) {
        topicEl.innerHTML = '<option value="">Pick a class and subject first</option>';
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

async function submitClassLog() {
    const cls = document.getElementById('log-class').value;
    const topicId = document.getElementById('log-topic').value;
    const date = document.getElementById('log-date').value;
    const attendance = document.getElementById('log-attendance').value;
    const total = document.getElementById('log-total').value;
    const notes = document.getElementById('log-notes').value;
    const onPlan = document.getElementById('log-on-plan').checked;
    const btn = document.getElementById('log-submit-btn');

    if (!cls || !topicId || !date || !attendance || !total) { toast('Fill in class, topic, date and attendance', 'warning'); return; }

    btn.disabled = true; btn.textContent = 'Saving...';
    try {
        await POST('/api/compliance/class-logs/', {
            topic: topicId, class_level: cls, session_date: date,
            attendance_count: Number(attendance), total_students: Number(total),
            session_notes: notes, is_on_plan: onPlan,
        });
        toast('Class log saved', 'success');
        document.getElementById('log-notes').value = '';
        loadMyClassLogs();
    } catch (e) {
        toast('Could not save log: ' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = '<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> Save Log';
    }
}

async function loadMyClassLogs() {
    const container = document.getElementById('my-logs-list');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const data = await GET('/api/compliance/class-logs/');
        const logs = data.results || data || [];
        container.innerHTML = logs.length ? `
            <div class="table-wrap table-scroll">
                <table>
                    <thead><tr><th>Date</th><th>Topic</th><th>Class</th><th>Attendance</th><th>On Plan</th></tr></thead>
                    <tbody>${logs.map(l => `
                        <tr>
                            <td class="text-sm">${l.session_date}</td>
                            <td>${l.topic_name || '—'}</td>
                            <td>${l.class_level}${l.stream ? ' ' + l.stream : ''}</td>
                            <td>${l.attendance_count}/${l.total_students} <span class="text-muted text-sm">(${Math.round(l.attendance_rate || 0)}%)</span></td>
                            <td>${l.is_on_plan ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-warning">No</span>'}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        ` : '<div class="text-muted text-sm">No class logs yet.</div>';
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
    }
}
