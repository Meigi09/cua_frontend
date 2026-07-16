// ============================================
// C3UA — CURRICULUM HIERARCHY TAB v3
// Subject chips are clickable → CBC popup
// Shows ALL subjects from teacher guides
// ============================================

async function loadCurriculumData() {
    const container = document.getElementById('curriculum-hierarchy');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading curriculum hierarchy...</div>';

    await loadCurriculumTree();

    // Also pull all RebCourse subjects for complete picture
    let guideSubjects = [];
    try {
        const gd = await GET('/api/curriculum/courses/?has_teacher_guide=true&page_size=200');
        guideSubjects = gd.results || gd || [];
    } catch (e) {}

    const levelData = STATE.curriculumTree;
    if (!levelData.length) {
        container.innerHTML = `<div class="alert alert-warning">No curriculum data found. Click "Sync REB" to scrape.</div>`;
        return;
    }

    // Build a lookup of subjectName+classCode → subject id from the tree
    const subjectLookup = {};
    levelData.forEach(lv => lv.grades.forEach(g =>
        g.subjects.forEach(s => { subjectLookup[`${s.name}|${g.class_code}`] = s; })
    ));

    // Enrich each grade with any guide subjects not already in the tree
    guideSubjects.forEach(c => {
        const cc = c.class_code || '';
        const sn = c.subject_name || '';
        if (!cc || !sn) return;
        const key = `${sn}|${cc}`;
        if (!subjectLookup[key]) {
            // Find the matching grade in the tree and add it
            levelData.forEach(lv => lv.grades.forEach(g => {
                if (g.class_code === cc) {
                    if (!g.subjects.find(s => s.name === sn)) {
                        g.subjects.push({ id: c.subject, name: sn, _fromGuide: true });
                        subjectLookup[key] = { id: c.subject, name: sn };
                    }
                }
            }));
        }
    });

    let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
    for (const level of levelData) {
        if (!level.grades.length) continue;
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">${level.name}</span>
                    <span class="badge badge-info">${level.grades.length} classes</span>
                </div>
                ${level.grades.map(g => `
                    <div class="hierarchy-grade" style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--gray-100);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <strong style="font-size:13px;">${g.name}</strong>
                            <span class="badge" style="background:#f0fdf4;color:#166534;">${g.class_code || '—'}</span>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${g.subjects.length
                                ? g.subjects.map(s => `
                                    <button class="hierarchy-subject-btn ${s._fromGuide ? 'from-guide' : ''}"
                                            onclick="showSubjectPopup(${s.id},'${s.name.replace(/'/g,"\\'")}','${g.class_code||''}')"
                                            title="Click to view topics, objectives & goals">
                                        ${s.name}
                                    </button>
                                `).join('')
                                : '<span class="text-muted text-sm">No subjects</span>'
                            }
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    const totalClasses  = levelData.reduce((s,l) => s + l.grades.length, 0);
    const allSubjects   = new Set(levelData.flatMap(l => l.grades.flatMap(g => g.subjects.map(s => s.name))));
    document.getElementById('curriculum-sync-note').innerHTML =
        `<span>📡</span><span>✅ ${levelData.length} levels, ${totalClasses} classes, ${allSubjects.size} subjects</span>`;
}