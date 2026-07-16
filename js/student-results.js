// ============================================
// C3UA — STUDENT PORTAL: MY RESULTS TAB
// Loaded by: student-dashboard.html
// ============================================

async function loadMyResults() {
    const container = document.getElementById('sr-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const data = await GET('/api/assessment/sessions/');
        const rows = data.results || data || [];
        container.innerHTML = rows.length ? `
            <div class="table-wrap table-scroll">
                <table>
                    <thead><tr><th>Assessment</th><th>Date</th><th>Score</th><th>Percentage</th><th>Status</th></tr></thead>
                    <tbody>${rows.map(r => `
                        <tr>
                            <td>${r.assessment_title || '—'}</td>
                            <td class="text-sm">${r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : (r.started_at ? new Date(r.started_at).toLocaleDateString() : '—')}</td>
                            <td>${r.total_score ?? '—'} / ${r.max_score ?? '—'}</td>
                            <td style="color:${scoreColor(r.percentage)};font-weight:600;">${fmtPct(r.percentage)}</td>
                            <td><span class="badge ${r.status === 'graded' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        ` : '<div class="text-muted text-sm">No quiz attempts yet — try a Practice Quiz!</div>';
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}
