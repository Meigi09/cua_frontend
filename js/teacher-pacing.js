// ============================================
// C3UA — TEACHER PORTAL: MY PACING TAB
// Loaded by: teacher-dashboard.html
// ============================================

function initPacingFilters() {
    wireCascadingFilters('tp', () => {}, { classOptional: false });
    const subjectEl = document.getElementById('tp-subject');
    if (subjectEl && !subjectEl.dataset.pacingWired) {
        subjectEl.addEventListener('change', loadMyPacing);
        subjectEl.dataset.pacingWired = '1';
    }
}

async function loadMyPacing() {
    const cls = document.getElementById('tp-class').value;
    const subjectId = document.getElementById('tp-subject').value;
    const result = document.getElementById('tp-result');

    if (!subjectId) {
        result.innerHTML = '<div class="alert alert-info">Pick a subject above to check your pacing for that class.</div>';
        return;
    }

    result.innerHTML = '<div class="loading"><div class="spinner"></div>Checking pacing...</div>';
    try {
        const r = await GET('/api/compliance/lesson-plans/my_pacing/', { subject_id: subjectId, class_level: cls });
        result.innerHTML = `
            <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);">
                <div class="stat-card"><div class="stat-label">Topics Delivered</div><div class="stat-value">${r.topics_delivered ?? '—'}</div></div>
                <div class="stat-card"><div class="stat-label">Topics Due</div><div class="stat-value">${r.topics_due ?? '—'}</div></div>
                <div class="stat-card"><div class="stat-label">Pacing</div><div class="stat-value" style="color:${paceColor(r.pacing_days)};font-size:18px;">${paceLabel(r.pacing_days)}</div></div>
                <div class="stat-card"><div class="stat-label">Coverage</div><div class="stat-value" style="color:${scoreColor(r.coverage_pct)};">${fmtPct(r.coverage_pct)}</div></div>
            </div>
            <div class="card mt-3">
                <div class="progress"><div class="progress-bar ${parseFloat(r.coverage_pct || 0) >= 75 ? 'green' : parseFloat(r.coverage_pct || 0) >= 50 ? 'yellow' : 'red'}" style="width:${Math.min(100, r.coverage_pct || 0)}%"></div></div>
                <div class="text-muted text-sm mt-2">Class ${cls} · Computed from the current academic calendar</div>
            </div>
        `;
    } catch (e) {
        result.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
    }
}
