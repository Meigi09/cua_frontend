// ============================================
// C3UA — UI HELPERS v2
// Toasts, modals, empty-state hiding,
// curriculum popup, downloadable reports
// ============================================

/* ---- STATE ---- */
window.STATE = window.STATE || { user: null, token: null, curriculumTree: [], allSubjects: [] };

/* ---- TOASTS ---- */
function toast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toasts') || (() => {
        const el = document.createElement('div'); el.id = 'toasts';
        el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(el); return el;
    })();
    const colors = { success: '#059669', warning: '#d97706', danger: '#dc2626', info: '#4f46e5' };
    const t = document.createElement('div');
    t.style.cssText = `background:${colors[type]||colors.info};color:white;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:320px;animation:slideUp 0.2s ease;`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), duration);
}

/* ---- MODAL ---- */
function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.add('active');
}
function closeModal() { document.getElementById('modal-overlay')?.classList.remove('active'); }

/* ---- EMPTY STATE HIDING ---- */
// Call after any data render — hides cards/sections with no real content
function hideEmptySections() {
    document.querySelectorAll('[data-hide-if-empty]').forEach(container => {
        const target = document.getElementById(container.dataset.hideIfEmpty) || container;
        const empty = !target.textContent.trim() ||
                      target.querySelector('.loading') ||
                      target.textContent.includes('No records') ||
                      target.textContent.includes('No data') ||
                      target.textContent.includes('—') && target.textContent.replace(/[—\s]/g,'') === '';
        container.style.display = empty ? 'none' : '';
    });
}

/* ---- CURRICULUM SUBJECT POPUP ---- */
async function showSubjectPopup(subjectId, subjectName, classCode) {
    const overlay = document.createElement('div');
    overlay.className = 'curriculum-popup-overlay';
    overlay.innerHTML = `
        <div class="curriculum-popup">
            <button class="cp-close" onclick="this.closest('.curriculum-popup-overlay').remove()">✕</button>
            <h3>${subjectName}</h3>
            <div class="cp-meta">🎓 ${classCode || '—'}</div>
            <div id="cp-body"><div class="loading"><div class="spinner"></div></div></div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    try {
        const [topicsRes, masteryRes] = await Promise.all([
            GET(`/api/curriculum/topics/?subject=${subjectId}&page_size=50`).catch(() => ({ results: [] })),
            GET(`/api/mastery/records/?topic__subject=${subjectId}&page_size=50`).catch(() => ({ results: [] })),
        ]);
        const topics  = topicsRes.results  || topicsRes  || [];
        const mastery = masteryRes.results || masteryRes || [];

        const masteryMap = {};
        mastery.forEach(m => { masteryMap[m.topic] = parseFloat(m.mastery_score || 0); });

        const totalTopics   = topics.length;
        const coveredTopics = Object.keys(masteryMap).length;
        const avgMastery    = mastery.length
            ? Math.round(mastery.reduce((s,m) => s + parseFloat(m.mastery_score||0),0) / mastery.length * 100)
            : 0;
        const progress = totalTopics ? Math.round(coveredTopics / totalTopics * 100) : 0;

        document.getElementById('cp-body').innerHTML = `
            <div class="cp-section">
                <div class="cp-section-title">📊 Progress</div>
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                    <span>${coveredTopics} of ${totalTopics} topics assessed</span>
                    <strong>${progress}%</strong>
                </div>
                <div class="cp-progress-bar"><div class="cp-progress-fill" style="width:${progress}%"></div></div>
                ${mastery.length ? `<div style="font-size:12px;color:var(--gray-500);margin-top:6px;">Average mastery: ${avgMastery}%</div>` : ''}
            </div>

            <div class="cp-section">
                <div class="cp-section-title">📚 Topics / Modules (${totalTopics})</div>
                ${topics.length ? `
                    <div style="max-height:260px;overflow-y:auto;">
                        ${topics.map((t,i) => {
                            const m = masteryMap[t.id];
                            const pct = m != null ? Math.round(m*100) : null;
                            const color = pct == null ? 'var(--gray-300)' : pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
                            return `
                                <div style="padding:8px 10px;border-radius:8px;margin-bottom:4px;background:var(--gray-50);display:flex;align-items:center;gap:10px;font-size:13px;">
                                    <span style="background:var(--primary);color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${t.topic_code||i+1}</span>
                                    <span style="flex:1;">${t.topic_name}</span>
                                    ${pct != null ? `<span style="color:${color};font-weight:700;font-size:12px;">${pct}%</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : '<div class="text-muted text-sm">No topics extracted yet — run the topic extractor for this subject.</div>'}
            </div>

            ${topics[0]?.learning_objectives ? `
            <div class="cp-section">
                <div class="cp-section-title">🎯 Learning Objectives</div>
                <div style="font-size:13px;line-height:1.7;color:var(--gray-700);">${topics[0].learning_objectives}</div>
            </div>` : ''}
        `;
    } catch (e) {
        document.getElementById('cp-body').innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}

/* ---- DOWNLOADABLE REPORT ---- */
function downloadReport(title, content) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${title}</title>
        <style>body{font-family:Inter,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1a202c;line-height:1.7;}
        h1{font-size:22px;margin-bottom:4px;}h4{color:#4f46e5;margin:20px 0 8px;}
        p{margin-bottom:10px;font-size:14px;}
        .meta{color:#718096;font-size:12px;margin-bottom:24px;}
        @media print{body{padding:20px}}</style>
    </head><body>${content}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${title.replace(/\s+/g,'-')}.html`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    toast('Report downloaded', 'success');
}

/* ---- HELPERS ---- */
function initials(name) {
    return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function doLogout() {
    localStorage.removeItem('c3ua_session');
    window.location.href = 'login.html';
}
function enforceRolePage(allowed) {
    const s = JSON.parse(localStorage.getItem('c3ua_session') || '{}');
    if (!s.token || !s.user) { window.location.href = 'login.html'; return false; }
    STATE.token = s.token;
    STATE.user  = s.user;
    if (allowed && !allowed.includes(s.user.role)) {
        window.location.href = s.user.role === 'admin' ? 'index.html'
                             : s.user.role === 'teacher' ? 'teacher-dashboard.html'
                             : 'student-dashboard.html';
        return false;
    }
    return true;
}

// ============================================
// CBC SUBJECT KNOWLEDGE BASE
// Source: REB Competence-Based Curriculum
// Framework (Pre-Primary to Upper Secondary, 2015)
// ============================================
const CBC_RATIONALE = {
    "Mathematics": "Mathematics concepts are applied across science and technology subjects. Mathematical competence enhances critical thinking, problem solving, and enables learners to be systematic, creative and self-confident using mathematical language and techniques. It equips learners for rapid technological growth and socio-economic development.",
    "Physics": "Physics is the most fundamental of the natural sciences. It has made significant contributions to technological advances — television, computers, domestic appliances — and inspired the development of calculus and industrialization. Understanding scientific phenomena drives development of new products.",
    "Chemistry": "Chemistry provides skills that guide construction of theories to explain natural phenomena and manage the environment. It empowers students to be creative and innovative in solving modern society's problems, and prepares future scientists to excel in science courses in higher education.",
    "Biology": "Biology is the study of life with direct applications in health and education. It develops understanding of living systems and how to maintain the health of humans, animals and plants. Technological advances in DNA and genetics make this discipline more exciting than ever.",
    "English": "English is a lingua franca used globally for trade, commerce, science and technology. Rwanda uses English as the official language of learning from Upper Primary onward and as a language of communication as a member of the Commonwealth and East African Community.",
    "French": "French is an official language of Rwanda and important nationally and internationally. As a member of the Francophone community, Rwanda uses French for communication with member nations and for trade and commerce worldwide.",
    "Kinyarwanda": "Kinyarwanda is the national language spoken by virtually all Rwandans. It is the language of basic literacy and forms the basis for learning other languages. There is a strong link between Kinyarwanda language and cultural identity, cultural values and heritage.",
    "Kiswahili": "Kiswahili is spoken across East Africa, particularly EAC member states. Rwandans need to communicate with fellow EAC members for socio-economic, political and cultural reasons.",
    "ICT": "ICT exposes learners to technological tools including computers, internet, broadcasting and telephony. It provides computing skills and common application software (word processing, spreadsheets, GIS) to assist individuals in daily life. The internet is the foundation of communication, research and innovation.",
    "Computer science": "Computer Science at A-Level builds on ICT foundations. Programming is central to the discipline, using wide-ranging algorithms in problem solving and creativity. It prepares graduates for both the labour market and higher education.",
    "Economics": "Economics explores how countries deal with common economic issues: government intervention, market failure, sustainability and macroeconomic objectives. It guides the optimal allocation of limited resources to satisfy unlimited human wants.",
    "History": "History and Citizenship exposes learners to cultures and events across different eras. It instils curiosity about past and present events, and promotes a culture of peace, tolerance, reconciliation and patriotism to mould good citizens.",
    "Geography": "Geography is the study of the earth including physical and human environment phenomena. It motivates students to understand the physical world and the importance of sustainable development for the future of mankind.",
    "Entrepreneurship": "Entrepreneurship stimulates thinking about the role of the business community and contributing to national development by creating and managing micro income-generating projects. It prepares young people for the uncertainties and complexities of the real world.",
    "Literature in English": "Literature in English is essential in a society with English as a key learning language. It is a vehicle for learning about different cultures, developing critical thinking, analysis and creativity through reading fiction and non-fiction.",
    "Religion and Ethics": "Religious Education deals with spirituality, beliefs about God and foundations of different faiths. It contributes to moral and spiritual development through values such as faithfulness, honesty, goodness, respect, responsibility and self-control.",
    "General studies and Communication skills": "General Studies is multi-disciplinary, designed to complement other subjects and provide useful preparation for higher education, work and life. It encourages students to think across subjects, develop thinking skills and construct arguments.",
    "Advanced Mathematics": "Advanced Mathematics builds on core mathematics competences for science and technology combinations. It develops higher-order thinking, deductive reasoning and complex problem-solving for university preparation.",
};

const CBC_GENERIC_COMPETENCES = [
    { icon: '🧠', name: 'Critical Thinking', desc: 'Think reflectively, broadly and logically — weigh evidence and make decisions based on experience.' },
    { icon: '💡', name: 'Creativity & Innovation', desc: 'Respond creatively to challenges — generate original ideas and apply them in learning situations.' },
    { icon: '🔍', name: 'Research & Problem Solving', desc: 'Be resourceful in finding answers — produce new knowledge based on research and sound judgment.' },
    { icon: '💬', name: 'Communication', desc: 'Convey information confidently through speaking and writing in a range of social and cultural contexts.' },
    { icon: '🤝', name: 'Co-operation & Life Skills', desc: 'Work effectively with others — develop interpersonal and social skills essential for the workplace.' },
    { icon: '📖', name: 'Lifelong Learning', desc: 'Take initiative to update knowledge and skills — adapt to evolving knowledge and technology advances.' },
];

async function showSubjectPopup(subjectId, subjectName, classCode) {
    // Remove existing popup
    document.getElementById('subject-popup-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'subject-popup-overlay';
    overlay.className = 'curriculum-popup-overlay';
    overlay.innerHTML = `
        <div class="curriculum-popup" style="max-width:700px;">
            <button class="cp-close" onclick="document.getElementById('subject-popup-overlay').remove()">✕</button>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
                <div style="background:var(--accent);color:white;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📚</div>
                <div>
                    <h3 style="margin:0;">${subjectName}</h3>
                    <div class="cp-meta" style="margin:0;">
                        ${classCode ? `Class ${classCode}` : ''}
                        · Rwanda CBC Curriculum
                    </div>
                </div>
            </div>
            <div id="sp-body"><div class="loading"><div class="spinner"></div></div></div>
        </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    try {
        const [topicsRes, masteryRes] = await Promise.all([
            GET(`/api/curriculum/topics/?subject=${subjectId}&page_size=50`).catch(() => ({ results: [] })),
            GET(`/api/mastery/records/?page_size=50`).catch(() => ({ results: [] })),
        ]);

        const topics  = topicsRes.results  || topicsRes  || [];
        const mastery = (masteryRes.results || masteryRes || []).filter(m => m.subject_name === subjectName);

        const masteryMap = {};
        mastery.forEach(m => { masteryMap[m.topic] = parseFloat(m.mastery_score||0); });

        const totalTopics   = topics.length;
        const assessedCount = Object.keys(masteryMap).length;
        const avgMastery    = mastery.length
            ? Math.round(mastery.reduce((s,m) => s + parseFloat(m.mastery_score||0),0) / mastery.length * 100)
            : null;
        const progress      = totalTopics ? Math.round(assessedCount / totalTopics * 100) : 0;
        const rationale     = CBC_RATIONALE[subjectName] || CBC_RATIONALE[subjectName.split(' ')[0]] || '';

        document.getElementById('sp-body').innerHTML = `
            <!-- Rationale -->
            ${rationale ? `
            <div class="cp-section">
                <div class="cp-section-title">📋 About this Subject (CBC Framework)</div>
                <div style="font-size:13px;line-height:1.7;color:var(--gray-700);background:var(--gray-50);padding:12px 14px;border-radius:10px;border-left:3px solid var(--accent);">${rationale}</div>
            </div>` : ''}

            <!-- Progress -->
            <div class="cp-section">
                <div class="cp-section-title">📊 Class Progress</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
                    <div style="text-align:center;background:var(--gray-50);border-radius:10px;padding:10px;">
                        <div style="font-size:24px;font-weight:800;color:var(--accent);">${totalTopics}</div>
                        <div style="font-size:11px;color:var(--gray-500);font-weight:600;">Total Topics</div>
                    </div>
                    <div style="text-align:center;background:var(--gray-50);border-radius:10px;padding:10px;">
                        <div style="font-size:24px;font-weight:800;color:var(--success);">${assessedCount}</div>
                        <div style="font-size:11px;color:var(--gray-500);font-weight:600;">Assessed</div>
                    </div>
                    <div style="text-align:center;background:var(--gray-50);border-radius:10px;padding:10px;">
                        <div style="font-size:24px;font-weight:800;color:${avgMastery==null?'var(--gray-400)':avgMastery>=75?'var(--success)':avgMastery>=50?'var(--warning)':'var(--danger)'};">
                            ${avgMastery != null ? avgMastery+'%' : '—'}
                        </div>
                        <div style="font-size:11px;color:var(--gray-500);font-weight:600;">Avg Mastery</div>
                    </div>
                </div>
                ${totalTopics ? `
                <div style="font-size:12px;display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span class="text-muted">Assessment coverage</span><strong>${progress}%</strong>
                </div>
                <div class="cp-progress-bar"><div class="cp-progress-fill" style="width:${progress}%"></div></div>` : ''}
            </div>

            <!-- Topics -->
            <div class="cp-section">
                <div class="cp-section-title">📚 Topics / Units (${totalTopics})</div>
                ${topics.length ? `
                    <div style="max-height:220px;overflow-y:auto;">
                        ${topics.map((t,i) => {
                            const m   = masteryMap[t.id];
                            const pct = m != null ? Math.round(m*100) : null;
                            const c   = pct==null ? 'var(--gray-300)' : pct>=75 ? 'var(--success)' : pct>=50 ? 'var(--warning)' : 'var(--danger)';
                            return `
                                <div style="padding:7px 10px;border-radius:8px;margin-bottom:4px;background:var(--gray-50);display:flex;align-items:center;gap:10px;font-size:13px;">
                                    <span style="background:var(--accent);color:white;border-radius:6px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">${t.topic_code||i+1}</span>
                                    <span style="flex:1;">${t.topic_name}</span>
                                    ${pct != null ? `<span style="font-weight:700;font-size:12px;color:${c};">${pct}%</span>` : ''}
                                </div>`;
                        }).join('')}
                    </div>` : '<div class="text-muted text-sm">No topics extracted yet — run the topic extractor for this subject.</div>'
                }
            </div>

            <!-- CBC Generic Competences -->
            <div class="cp-section">
                <div class="cp-section-title">🎯 CBC Generic Competences Developed</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    ${CBC_GENERIC_COMPETENCES.map(c => `
                        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:8px 10px;font-size:12px;">
                            <div style="font-weight:700;margin-bottom:2px;">${c.icon} ${c.name}</div>
                            <div style="color:var(--gray-500);font-size:11px;line-height:1.5;">${c.desc}</div>
                        </div>`).join('')}
                </div>
            </div>
        `;
    } catch (e) {
        document.getElementById('sp-body').innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}