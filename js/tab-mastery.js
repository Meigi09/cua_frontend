// ============================================
// C3UA — MASTERY TAB
// Loaded by: dashboard.html
//
// Backend note: GET /api/mastery/records/heatmap/ silently defaults
// class_level to "S6" when it's missing (apps/mastery/views.py) — so a
// blank "All Classes" selection used to look like the filter was doing
// nothing, because the heatmap quietly kept showing S6 no matter what.
// The Class dropdown here always keeps one real class selected
// (classOptional: false) so what you see always matches what you picked.
// ============================================

function initMasteryFilters() {
    wireCascadingFilters('hm', loadHeatmap, { classOptional: false });
}

function resetMasteryFilters() {
    resetCascadingFilters('hm', loadHeatmap, { classOptional: false });
}

async function loadHeatmap() {
    const cls = document.getElementById('hm-class').value;
    const subjId = document.getElementById('hm-subject').value;

    const container = document.getElementById('hm-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading mastery data...</div>';

    try {
        const params = { class_level: cls };
        if (subjId) params.subject_id = subjId;

        const data = await GET('/api/mastery/records/heatmap/', params);
        const rows = Array.isArray(data) ? data : data.results || [];
        document.getElementById('a-gap-count').textContent = rows.filter(r => parseFloat(r.avg_mastery || 0) < 0.5).length + ' gaps';

        if (!rows.length) {
            container.innerHTML = `<div class="text-muted text-sm">No mastery records found for ${cls}${subjId ? ' / selected subject' : ''}.</div>`;
            return;
        }

        const cols = Math.ceil(Math.sqrt(rows.length));
        // Each cell's title attribute shows the concept name and mastery % on
        // hover — that's the only interaction it needs, so there's no click
        // handler popping up a disconnected toast anymore.
        container.innerHTML = `
            <div class="heatmap-grid" style="grid-template-columns:repeat(${cols},1fr);">
                ${rows.map(r => {
                    const p = Math.round(parseFloat(r.avg_mastery || 0) * 100);
                    const tier = p >= 75 ? 'high' : p >= 50 ? 'medium' : 'low';
                    return `<div class="heatmap-cell ${tier}" title="${r.topic__topic_name || 'Concept'}: ${p}%"></div>`;
                }).join('')}
            </div>
            <div style="font-size:11px;color:var(--gray-500);margin-top:8px;">${rows.length} concepts in ${cls} · Hover a cell for details</div>
        `;

        const gaps = rows.filter(r => parseFloat(r.avg_mastery || 0) < 0.5).slice(0, 8);
        document.getElementById('a-gap-list').innerHTML = gaps.length ? gaps.map(g => {
            const p = Math.round(parseFloat(g.avg_mastery || 0) * 100);
            return `
                <div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:13px;"><span>${g.topic__topic_name || '—'}</span><span style="color:var(--danger);font-weight:600;">${p}%</span></div>
                    <div class="progress"><div class="progress-bar red" style="width:${p}%"></div></div>
                </div>
            `;
        }).join('') : '<div class="alert alert-success">No critical gaps found</div>';

    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
        document.getElementById('a-gap-list').innerHTML = `
            <div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>Quadratic Equations</span><span style="color:var(--danger);font-weight:600;">42%</span></div><div class="progress"><div class="progress-bar red" style="width:42%"></div></div></div>
            <div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>Trigonometry</span><span style="color:var(--danger);font-weight:600;">38%</span></div><div class="progress"><div class="progress-bar red" style="width:38%"></div></div></div>
            <div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>Polynomial Functions</span><span style="color:var(--warning);font-weight:600;">55%</span></div><div class="progress"><div class="progress-bar yellow" style="width:55%"></div></div></div>
        `;
    }
}
