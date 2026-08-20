// ============================================
// C3UA — NESA READINESS TAB v2
// Real data + subject-level breakdown
// ============================================

let _nesaTimer = null;

function startCountdown(targetDate, elementId) {
    if (_nesaTimer) clearInterval(_nesaTimer);
    function tick() {
        const el = document.getElementById(elementId);
        if (!el) { clearInterval(_nesaTimer); return; }
        const diff = targetDate - new Date();
        if (diff <= 0) { el.innerHTML = '<strong style="color:var(--danger)">NESA Examinations are underway!</strong>'; return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        el.innerHTML = `
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;padding:16px 0;">
                ${[['Days',d],['Hours',h],['Minutes',m],['Seconds',s]].map(([label,val]) => `
                    <div style="text-align:center;background:var(--gray-50);border:1px solid var(--gray-200);
                                border-radius:12px;padding:16px 20px;min-width:80px;">
                        <div style="font-size:32px;font-weight:800;color:var(--accent);line-height:1;">${String(val).padStart(2,'0')}</div>
                        <div style="font-size:11px;font-weight:600;color:var(--gray-500);text-transform:uppercase;margin-top:4px;">${label}</div>
                    </div>
                `).join('')}
            </div>`;
    }
    tick();
    _nesaTimer = setInterval(tick, 1000);
}

async function loadNesaAdmin() {
    const el = document.getElementById('a-nesa-content');
    el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading readiness data...</div>';

    const nesaDate = CONFIG.NESA_DATE || new Date('2026-11-01');
    const days = Math.max(0, Math.floor((nesaDate - new Date()) / 86400000));

    try {
        const [sessions, mastery, topics, pacing] = await Promise.all([
            GET('/api/assessment/sessions/').catch(() => ({})),
            GET('/api/mastery/records/').catch(() => ({})),
            GET('/api/curriculum/topics/').catch(() => ({ count: 0 })),
            GET('/api/compliance/pacing/').catch(() => ({})),
        ]);

        const sessData    = sessions.results || sessions || [];
        const mastData    = mastery.results  || mastery  || [];
        const paceData    = pacing.results   || pacing   || [];
        const graded      = sessData.filter(s => s.status === 'graded');
        const avg         = graded.length
            ? Math.round(graded.reduce((s,x) => s + parseFloat(x.percentage||0), 0) / graded.length)
            : 0;
        const avgMastery  = mastData.length
            ? Math.round(mastData.reduce((s,r) => s + parseFloat(r.mastery_score||0), 0) / mastData.length * 100)
            : 0;
        const readiness   = avgMastery >= 75 ? 'High' : avgMastery >= 55 ? 'Moderate' : 'Needs Attention';
        const readColor   = avgMastery >= 75 ? 'var(--success)' : avgMastery >= 55 ? 'var(--warning)' : 'var(--danger)';
        const avgCoverage = paceData.length
            ? Math.round(paceData.reduce((s,p) => s + parseFloat(p.coverage_pct||0), 0) / paceData.length)
            : 0;

        el.innerHTML = `
            <!-- STAT CARDS -->
            <div class="stats-grid" style="margin-bottom:20px;">
                <div class="stat-card" style="cursor:default;">
                    <div class="stat-icon"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">edit_note</span></div>
                    <div class="stat-value">${graded.length}</div>
                    <div class="stat-label">Graded Sessions</div>
                    <div class="stat-change neutral">${sessData.length} total</div>
                </div>
                <div class="stat-card" style="cursor:default;">
                    <div class="stat-icon"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">psychology</span></div>
                    <div class="stat-value">${avgMastery}%</div>
                    <div class="stat-label">Avg Mastery</div>
                    <div class="stat-change ${avgMastery >= 55 ? 'up' : 'down'}">${readiness}</div>
                </div>
                <div class="stat-card" style="cursor:default;">
                    <div class="stat-icon"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">bar_chart</span></div>
                    <div class="stat-value">${avg}%</div>
                    <div class="stat-label">Avg Quiz Score</div>
                    <div class="stat-change ${avg >= 50 ? 'up' : 'down'}">${avg >= 50 ? 'On track' : 'Below target'}</div>
                </div>
                <div class="stat-card" style="cursor:default;">
                    <div class="stat-icon"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">calendar_month</span></div>
                    <div class="stat-value">${days}</div>
                    <div class="stat-label">Days to NESA</div>
                    <div class="stat-change ${days > 60 ? 'up' : days > 30 ? 'neutral' : 'down'}">${days > 60 ? 'Plenty of time' : days > 30 ? 'Approaching' : 'Urgent!'}</div>
                </div>
            </div>

            <!-- COUNTDOWN -->
            <div class="card mb-4">
                <div class="card-header">
                    <span class="card-title">⏳ Countdown to National Examinations</span>
                    <span class="badge badge-danger" style="font-size:12px;">${nesaDate.toLocaleDateString('en-RW',{year:'numeric',month:'long',day:'numeric'})}</span>
                </div>
                <div id="nesa-countdown"></div>
            </div>

            <!-- READINESS OVERVIEW -->
            <div class="grid-2">
                <div class="card">
                    <div class="card-header"><span class="card-title"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">track_changes</span> Overall Readiness</span></div>
                    <div style="text-align:center;padding:20px 0;">
                        <div style="font-size:48px;font-weight:800;color:${readColor};">${avgMastery}%</div>
                        <div style="font-size:14px;font-weight:700;color:${readColor};margin:4px 0 16px;">${readiness} Readiness</div>
                        <div style="background:var(--gray-100);height:10px;border-radius:99px;overflow:hidden;margin:0 20px;">
                            <div style="background:${readColor};height:100%;width:${avgMastery}%;border-radius:99px;transition:width 0.8s ease;"></div>
                        </div>
                        <div class="text-muted text-sm" style="margin-top:10px;">Based on ${mastData.length} mastery records across ${topics.count||0} topics</div>
                    </div>
                    <div style="padding:0 8px 8px;">
                        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 8px;background:var(--gray-50);border-radius:var(--radius);margin-bottom:4px;">
                            <span>Syllabus Coverage</span><strong style="color:${avgCoverage>=72?'var(--success)':'var(--warning)'};">${avgCoverage}%</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 8px;background:var(--gray-50);border-radius:var(--radius);margin-bottom:4px;">
                            <span>CBC Benchmark</span><strong>72% minimum</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 8px;background:var(--gray-50);border-radius:var(--radius);">
                            <span>Status vs Benchmark</span>
                            <strong style="color:${avgCoverage>=72?'var(--success)':'var(--danger)'};">
                                ${avgCoverage>=72?'<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check</span> Met':'<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">close</span> Below target'}
                            </strong>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><span class="card-title"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">menu_book</span> Subject Readiness</span></div>
                    <div id="nesa-subject-breakdown" class="panel-scroll-lg">
                        ${paceData.slice(0,8).map(p => {
                            const cov = parseFloat(p.coverage_pct||0);
                            const c   = cov>=72?'var(--success)':cov>=50?'var(--warning)':'var(--danger)';
                            return `
                                <div style="margin-bottom:10px;">
                                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                                        <span><strong>${p.subject_name||'—'}</strong> ${p.class_level||''}</span>
                                        <span style="color:${c};font-weight:700;">${Math.round(cov)}%</span>
                                    </div>
                                    <div style="background:var(--gray-100);height:6px;border-radius:99px;overflow:hidden;">
                                        <div style="background:${c};height:100%;width:${cov}%;border-radius:99px;"></div>
                                    </div>
                                </div>`;
                        }).join('') || '<div class="text-muted text-sm">No pacing data yet</div>'}
                    </div>
                </div>
            </div>

            <!-- CBC COMPETENCES REMINDER -->
            <div class="card mt-4">
                <div class="card-header"><span class="card-title"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">account_balance</span> CBC Competences Assessed in National Exams</span></div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;padding:4px 0;">
                    ${['Critical Thinking','Creativity & Innovation','Research & Problem Solving','Communication','Co-operation & Life Skills','Lifelong Learning'].map((comp,i) => `
                        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:10px;padding:10px 12px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;">
                            <span style="font-size:18px;">${['<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">psychology</span>','<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">lightbulb</span>','<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">search</span>','<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">chat</span>','<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">handshake</span>','<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">menu_book</span>'][i]}</span>${comp}
                        </div>`).join('')}
                </div>
            </div>
        `;
        startCountdown(nesaDate, 'nesa-countdown');

    } catch (e) {
        el.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
    }
}