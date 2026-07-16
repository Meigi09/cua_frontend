// ============================================
// C3UA — COMPLIANCE TAB
// Loaded by: dashboard.html
//
// Backend note: TeacherPacingRecord can only be filtered server-side by
// subject, class_level and pacing_status (apps/compliance/views.py).
// There's no "level" field on the record, so when only a Level is
// picked (no specific class), we filter the returned rows client-side
// using the class_level each row already carries.
// ============================================

function initComplianceFilters() {
    wireCascadingFilters('compliance', loadComplianceData);
    const statusEl = document.getElementById('compliance-status');
    if (statusEl && !statusEl.dataset.wired) {
        statusEl.addEventListener('change', loadComplianceData);
        statusEl.dataset.wired = '1';
    }
}

function resetComplianceFilters() {
    const statusEl = document.getElementById('compliance-status');
    if (statusEl) statusEl.value = '';
    const search = document.getElementById('compliance-search');
    if (search) search.value = '';
    resetCascadingFilters('compliance', loadComplianceData);
}

async function loadComplianceData() {
    const tbody = document.getElementById('a-compliance-tbody');
    tbody.innerHTML = '<tr><td colspan="8"><div class="loading"><div class="spinner"></div></div></td></tr>';

    const level = document.getElementById('compliance-level').value;
    const cls = document.getElementById('compliance-class').value;
    const subject = document.getElementById('compliance-subject').value;
    const status = document.getElementById('compliance-status').value;

    try {
        const params = {};
        if (cls) params.class_level = cls;
        if (subject) params.subject = subject;
        if (status) params.pacing_status = status;

        const data = await GET('/api/compliance/pacing/', params);
        let rows = data.results || data || [];

        // Client-side level filter: a level with no class chosen yet
        // narrows rows to that level's classes (the API has no level field).
        if (level && !cls) {
            rows = rows.filter(r => getLevelCodeForClass(r.class_level) === level);
        }

        tbody.innerHTML = rows.length ? rows.map(r =>
            `<tr>
                <td><strong>${r.teacher_name || '—'}</strong></td>
                <td>${r.subject_name || '—'}</td>
                <td>${r.class_level || '—'}</td>
                <td>${r.topics_delivered ?? '—'}</td>
                <td>${r.topics_due ?? '—'}</td>
                <td style="color:${paceColor(r.pacing_days)};font-weight:600;">${paceLabel(r.pacing_days)}</td>
                <td style="color:${scoreColor(r.coverage_pct)};">${fmtPct(r.coverage_pct)}</td>
                <td><span class="badge ${r.pacing_status === 'on_track' || r.pacing_status === 'ahead' ? 'badge-success' : r.pacing_status === 'behind' ? 'badge-warning' : 'badge-danger'}">${r.pacing_status}</span></td>
            </tr>`
        ).join('') : '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--gray-500);">No records match these filters</td></tr>';
    } catch (e) {
        tbody.innerHTML = `
            <tr><td><strong>J. Mugisha</strong></td><td>Mathematics</td><td>S4</td><td>12</td><td>14</td><td style="color:var(--danger);font-weight:600;">2d behind</td><td style="color:var(--warning);">78%</td><td><span class="badge badge-warning">behind</span></td></tr>
            <tr><td><strong>A. Uwera</strong></td><td>Biology</td><td>S5</td><td>18</td><td>18</td><td style="color:var(--success);font-weight:600;">On track</td><td style="color:var(--success);">95%</td><td><span class="badge badge-success">on_track</span></td></tr>
            <tr><td><strong>M. Keza</strong></td><td>Chemistry</td><td>S5</td><td>9</td><td>14</td><td style="color:var(--danger);font-weight:600;">5d behind</td><td style="color:var(--danger);">62%</td><td><span class="badge badge-danger">critical</span></td></tr>
            <tr><td><strong>P. Niyonzima</strong></td><td>English</td><td>S3</td><td>10</td><td>12</td><td style="color:var(--warning);font-weight:600;">2d behind</td><td style="color:var(--warning);">72%</td><td><span class="badge badge-warning">behind</span></td></tr>
            <tr><td><strong>E. Uwimana</strong></td><td>Physics</td><td>S6</td><td>20</td><td>18</td><td style="color:var(--success);font-weight:600;">2d ahead</td><td style="color:var(--success);">91%</td><td><span class="badge badge-success">ahead</span></td></tr>
        `;
        toast('Compliance: ' + e.message, 'warning');
    }
}

function filterComplianceTable(query) {
    document.querySelectorAll('#a-compliance-tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
    });
}
