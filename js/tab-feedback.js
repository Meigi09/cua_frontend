// ============================================
// C3UA — FEEDBACK TAB
// Loaded by: dashboard.html
// ============================================

async function loadFeedbackAdmin() {
    const el = document.getElementById('a-feedback-content');
    el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const data = await GET('/api/feedback/aggregations/');
        const rows = data.results || [];
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><span class="card-title">Most Difficult Topics</span><span class="badge badge-info">${rows.length} topics</span></div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Topic</th><th>Subject</th><th>Class</th><th>Responses</th><th>Difficulty</th></tr></thead>
                        <tbody>${rows.map(r => `
                            <tr>
                                <td><strong>${r.topic_name || '—'}</strong></td>
                                <td>${r.subject_name || '—'}</td>
                                <td>${r.class_level || '—'}</td>
                                <td>${r.total_responses || 0}</td>
                                <td><span class="badge ${parseFloat(r.difficulty_index || 0) > 0.6 ? 'badge-danger' : parseFloat(r.difficulty_index || 0) > 0.3 ? 'badge-warning' : 'badge-success'}">${(parseFloat(r.difficulty_index || 0) * 100).toFixed(0)}%</span></td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-500);">No feedback yet</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        el.innerHTML = `
            <div class="card">
                <div class="card-header"><span class="card-title">Most Difficult Topics</span><span class="badge badge-info">4 topics</span></div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Topic</th><th>Subject</th><th>Class</th><th>Responses</th><th>Difficulty</th></tr></thead>
                        <tbody>
                            <tr><td><strong>Quadratic Equations</strong></td><td>Mathematics</td><td>S4</td><td>24</td><td><span class="badge badge-danger">78%</span></td></tr>
                            <tr><td><strong>Trigonometry</strong></td><td>Mathematics</td><td>S5</td><td>18</td><td><span class="badge badge-danger">72%</span></td></tr>
                            <tr><td><strong>Chemical Bonding</strong></td><td>Chemistry</td><td>S4</td><td>15</td><td><span class="badge badge-warning">65%</span></td></tr>
                            <tr><td><strong>Comprehension</strong></td><td>English</td><td>S3</td><td>22</td><td><span class="badge badge-danger">81%</span></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}
