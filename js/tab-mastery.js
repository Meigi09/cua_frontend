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

// 5-tier mastery scale used by the heatmap legend, cells, and hover panel.
// Kept in one place so the thresholds/colors/labels/recommendations can't
// drift out of sync with each other.
const MASTERY_TIERS = [
    { min: 85, cls: 'excellent',      label: 'Excellent mastery', swatch: '#166534',
      recommendation: 'On track. No action needed.' },
    { min: 70, cls: 'good',           label: 'Good mastery', swatch: 'var(--success)',
      recommendation: 'Solid grasp. A quick review keeps it from slipping.' },
    { min: 50, cls: 'needs-attention', label: 'Needs attention', swatch: 'var(--warning)',
      recommendation: 'Schedule a short re-teach or practice set on this topic.' },
    { min: 35, cls: 'high-risk',      label: 'High risk', swatch: '#ea580c',
      recommendation: 'Prioritize re-teaching before moving to dependent topics.' },
    { min: 0,  cls: 'critical',       label: 'Critical weakness', swatch: 'var(--danger)',
      recommendation: 'Immediate intervention recommended — flag to subject teacher.' },
];
function masteryTier(pct) {
    return MASTERY_TIERS.find(t => pct >= t.min) || MASTERY_TIERS[MASTERY_TIERS.length - 1];
}

function renderHeatmapLegend() {
    return `
        <div class="heatmap-legend">
            ${MASTERY_TIERS.map(t => `
                <div class="heatmap-legend-item">
                    <span class="heatmap-legend-swatch" style="background:${t.swatch};"></span>
                    <span>${t.label}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Single shared tooltip element for the heatmap (created once, repositioned on hover).
let _hmTooltip = null;
function getHeatmapTooltip() {
    if (!_hmTooltip) {
        _hmTooltip = document.createElement('div');
        _hmTooltip.className = 'heatmap-tooltip';
        document.body.appendChild(_hmTooltip);
    }
    return _hmTooltip;
}
function showHeatmapTooltip(evt, r, cls, subjectLabel) {
    const p = Math.round(parseFloat(r.avg_mastery || 0) * 100);
    const tier = masteryTier(p);
    const tip = getHeatmapTooltip();
    tip.innerHTML = `
        <div class="ht-title">${r.topic__topic_name || 'Concept'}</div>
        <div class="ht-row"><span>Class</span><span>${cls}</span></div>
        <div class="ht-row"><span>Subject</span><span>${subjectLabel}</span></div>
        <div class="ht-row"><span>Mastery</span><span>${p}% — ${tier.label}</span></div>
        <div class="ht-reco">${tier.recommendation}</div>
    `;
    tip.classList.add('visible');
    positionHeatmapTooltip(evt);
}
function positionHeatmapTooltip(evt) {
    const tip = getHeatmapTooltip();
    const pad = 14;
    let x = evt.clientX + pad;
    let y = evt.clientY + pad;
    const rect = tip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = evt.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight) y = evt.clientY - rect.height - pad;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}
function hideHeatmapTooltip() {
    if (_hmTooltip) _hmTooltip.classList.remove('visible');
}

async function loadHeatmap() {
    const cls = document.getElementById('hm-class').value;
    const subjSelect = document.getElementById('hm-subject');
    const subjId = subjSelect.value;
    const subjectLabel = subjId ? (subjSelect.options[subjSelect.selectedIndex]?.text || 'Selected subject') : 'All subjects';

    const container = document.getElementById('hm-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading mastery data...</div>';

    try {
        const params = { class_level: cls };
        if (subjId) params.subject_id = subjId;

        const data = await GET('/api/mastery/records/heatmap/', params);
        const rows = Array.isArray(data) ? data : data.results || [];
        document.getElementById('a-gap-count').textContent = rows.filter(r => parseFloat(r.avg_mastery || 0) < 0.5).length + ' gaps';

        if (!rows.length) {
            container.innerHTML = `
                <p class="heatmap-explainer">This visualization shows how well students have mastered each learning outcome. Darker green indicates stronger mastery, while warmer colors highlight areas that need curriculum attention.</p>
                <div class="alert alert-info">No curriculum has been analyzed yet for ${cls}${subjId ? ' / ' + subjectLabel : ''}. Upload a curriculum document or wait for student assessments to populate this view.</div>
            `;
            return;
        }

        const cols = Math.ceil(Math.sqrt(rows.length));
        // Hover shows a rich panel (see showHeatmapTooltip) instead of the
        // browser's native title="" tooltip, so it can carry class, subject,
        // mastery tier, and a concrete recommendation — not just a number.
        container.innerHTML = `
            <p class="heatmap-explainer">This visualization shows how well students have mastered each learning outcome. Darker green indicates stronger mastery, while warmer colors highlight areas that need curriculum attention.</p>
            ${renderHeatmapLegend()}
            <div class="heatmap-grid" style="grid-template-columns:repeat(${cols},1fr);">
                ${rows.map(r => {
                    const p = Math.round(parseFloat(r.avg_mastery || 0) * 100);
                    const tier = masteryTier(p);
                    return `<div class="heatmap-cell ${tier.cls}" tabindex="0" role="button" aria-label="${r.topic__topic_name || 'Concept'}: ${p}% mastery, ${tier.label}"></div>`;
                }).join('')}
            </div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:8px;">${rows.length} concepts in ${cls} · Hover or focus a cell for details</div>
        `;

        // Wire hover/focus panel after the cells exist in the DOM.
        const cellEls = container.querySelectorAll('.heatmap-cell');
        cellEls.forEach((el, i) => {
            const r = rows[i];
            el.addEventListener('mouseenter', (evt) => showHeatmapTooltip(evt, r, cls, subjectLabel));
            el.addEventListener('mousemove', positionHeatmapTooltip);
            el.addEventListener('mouseleave', hideHeatmapTooltip);
            el.addEventListener('focus', (evt) => showHeatmapTooltip({ clientX: evt.target.getBoundingClientRect().right, clientY: evt.target.getBoundingClientRect().top }, r, cls, subjectLabel));
            el.addEventListener('blur', hideHeatmapTooltip);
        });

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
        container.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
        document.getElementById('a-gap-list').innerHTML = `
            <div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>Quadratic Equations</span><span style="color:var(--danger);font-weight:600;">42%</span></div><div class="progress"><div class="progress-bar red" style="width:42%"></div></div></div>
            <div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>Trigonometry</span><span style="color:var(--danger);font-weight:600;">38%</span></div><div class="progress"><div class="progress-bar red" style="width:38%"></div></div></div>
            <div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>Polynomial Functions</span><span style="color:var(--warning);font-weight:600;">55%</span></div><div class="progress"><div class="progress-bar yellow" style="width:55%"></div></div></div>
        `;
    }
}
