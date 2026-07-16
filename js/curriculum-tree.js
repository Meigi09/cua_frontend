// ============================================
// C3UA — CURRICULUM TREE & CASCADING FILTERS
// Loaded by: dashboard.html
//
// Every lesson plan, pacing record and mastery record in C3UA belongs
// to a Level (O'Level / A'Level) -> Class (S1...S6) -> Subject. This
// file builds that hierarchy once from the three curriculum endpoints
// (/levels/, /grades/, /subjects/) and uses it to keep the Level /
// Class / Subject dropdowns on Compliance, Mastery and Teacher Guides
// in sync with each other: picking a level only shows its classes,
// and picking a class only shows the subjects actually taught there.
//
// Backend reference (apps/curriculum):
//   EducationLevel  { id, name }
//   ClassGrade      { id, level, level_name, name, class_code }
//   Subject         { id, grade, grade_name, level_name, name, level (O/A/P/PP/OTHER) }
// ============================================

// Used only while the backend / REB sync hasn't returned data yet,
// so the filters are never empty even in demo mode.
const DEMO_CURRICULUM_TREE = [
    {
        id: 'O', name: "O'Level", code: 'O',
        grades: [
            { id: 'S1', name: 'Senior 1', class_code: 'S1', subjects: [{ id: 'demo-math', name: 'Mathematics' }, { id: 'demo-eng', name: 'English' }, { id: 'demo-phy', name: 'Physics' }, { id: 'demo-chem', name: 'Chemistry' }, { id: 'demo-bio', name: 'Biology' }] },
            { id: 'S2', name: 'Senior 2', class_code: 'S2', subjects: [{ id: 'demo-math', name: 'Mathematics' }, { id: 'demo-eng', name: 'English' }, { id: 'demo-phy', name: 'Physics' }, { id: 'demo-chem', name: 'Chemistry' }, { id: 'demo-bio', name: 'Biology' }] },
            { id: 'S3', name: 'Senior 3', class_code: 'S3', subjects: [{ id: 'demo-math', name: 'Mathematics' }, { id: 'demo-eng', name: 'English' }, { id: 'demo-phy', name: 'Physics' }, { id: 'demo-chem', name: 'Chemistry' }, { id: 'demo-bio', name: 'Biology' }, { id: 'demo-hist', name: 'History' }] },
        ],
    },
    {
        id: 'A', name: "A'Level", code: 'A',
        grades: [
            { id: 'S4', name: 'Senior 4', class_code: 'S4', subjects: [{ id: 'demo-amath', name: 'Advanced Mathematics' }, { id: 'demo-phy', name: 'Physics' }, { id: 'demo-chem', name: 'Chemistry' }, { id: 'demo-bio', name: 'Biology' }, { id: 'demo-econ', name: 'Economics' }] },
            { id: 'S5', name: 'Senior 5', class_code: 'S5', subjects: [{ id: 'demo-amath', name: 'Advanced Mathematics' }, { id: 'demo-phy', name: 'Physics' }, { id: 'demo-chem', name: 'Chemistry' }, { id: 'demo-bio', name: 'Biology' }, { id: 'demo-econ', name: 'Economics' }] },
            { id: 'S6', name: 'Senior 6', class_code: 'S6', subjects: [{ id: 'demo-amath', name: 'Advanced Mathematics' }, { id: 'demo-phy', name: 'Physics' }, { id: 'demo-chem', name: 'Chemistry' }, { id: 'demo-bio', name: 'Biology' }, { id: 'demo-econ', name: 'Economics' }] },
        ],
    },
];

function levelCodeFromName(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('ordinary')) return 'O';
    if (n.includes('advanced')) return 'A';
    if (n.includes('primary')) return 'P';
    return (name || '?').charAt(0).toUpperCase();
}

// Builds STATE.curriculumTree and STATE.allSubjects from the backend in
// exactly 3 requests (levels, grades, subjects), then groups subjects
// under their grade client-side. Falls back to a small demo tree if the
// API is unreachable so the UI is still fully explorable offline.
async function loadCurriculumTree() {
    try {
        const [levelsRes, gradesRes, subjectsRes] = await Promise.all([
            GET('/api/curriculum/levels/'),
            GET('/api/curriculum/grades/'),
            GET('/api/curriculum/subjects/'),
        ]);
        const levels = levelsRes.results || levelsRes || [];
        const grades = gradesRes.results || gradesRes || [];
        const subjects = subjectsRes.results || subjectsRes || [];
        if (!levels.length) throw new Error('No curriculum levels returned — try Sync REB');

        STATE.allSubjects = subjects;

        const tree = levels.map(level => {
            const levelGrades = grades
                .filter(g => String(g.level) === String(level.id))
                .map(g => ({
                    id: g.id,
                    name: g.name,
                    class_code: g.class_code || g.name,
                    subjects: subjects
                        .filter(s => String(s.grade) === String(g.id))
                        .map(s => ({ id: s.id, name: s.name })),
                }));
            return { id: level.id, name: level.name, code: levelCodeFromName(level.name), grades: levelGrades };
        });
        STATE.curriculumTree = tree;
    } catch (e) {
        console.warn('Curriculum tree: using offline demo structure —', e.message);
        STATE.curriculumTree = DEMO_CURRICULUM_TREE;
        if (!STATE.allSubjects.length) {
            const seen = new Map();
            DEMO_CURRICULUM_TREE.forEach(l => l.grades.forEach(g => g.subjects.forEach(s => {
                if (!seen.has(s.id)) seen.set(s.id, s);
            })));
            STATE.allSubjects = Array.from(seen.values());
        }
    }
    return STATE.curriculumTree;
}

function findLevel(code) {
    if (!code) return null;
    return STATE.curriculumTree.find(l => l.code === code || String(l.id) === String(code));
}

function getClassesForLevel(levelCode) {
    const level = findLevel(levelCode);
    if (level) return level.grades;
    return STATE.curriculumTree.flatMap(l => l.grades);
}

// function getSubjectsFor(levelCode, classCode) {
//     let grades = getClassesForLevel(levelCode);
//     if (classCode) grades = grades.filter(g => g.class_code === classCode || String(g.id) === String(classCode));
//     const map = new Map();
//     grades.forEach(g => g.subjects.forEach(s => { if (!map.has(String(s.id))) map.set(String(s.id), s); }));
//     return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
// }

// curriculum-tree.js - Enhanced getSubjectsFor

function getSubjectsFor(levelCode, classCode) {
    let grades = getClassesForLevel(levelCode);
    if (classCode) {
        grades = grades.filter(g => g.class_code === classCode || String(g.id) === String(classCode));
    }
    const map = new Map();
    grades.forEach(g => g.subjects.forEach(s => { 
        if (!map.has(String(s.id))) map.set(String(s.id), s); 
    }));
    
    // Sort subjects alphabetically
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
// Given a class code like "S4", returns its level code ("O" / "A") by
// looking it up in the tree. Used to client-side filter API responses
// that don't natively support a "level" query param on the backend.
function getLevelCodeForClass(classCode) {
    if (!classCode) return null;
    for (const level of STATE.curriculumTree) {
        if (level.grades.some(g => g.class_code === classCode)) return level.code;
    }
    return null;
}

// Given a subject id, returns its {levelCode, classCode} — used to
// client-filter endpoints (like Teacher Guides) that can only be
// filtered by subject server-side, not by level/class directly.
function getSubjectLocation(subjectId) {
    for (const level of STATE.curriculumTree) {
        for (const grade of level.grades) {
            if (grade.subjects.some(s => String(s.id) === String(subjectId))) {
                return { levelCode: level.code, classCode: grade.class_code };
            }
        }
    }
    return null;
}

// Wires the Level / Class / Subject <select> trio for a given prefix
// (e.g. "compliance", "hm", "guide") so each one filters the next, then
// calls onChange() whenever the resulting filter set changes.
// opts.classOptional = false means the class select has no "All Classes"
// option and always keeps a real class selected (needed for endpoints,
// like the mastery heatmap, that require an explicit class_level).
function wireCascadingFilters(prefix, onChange, opts = {}) {
    const levelEl = document.getElementById(`${prefix}-level`);
    const classEl = document.getElementById(`${prefix}-class`);
    const subjectEl = document.getElementById(`${prefix}-subject`);
    if (!levelEl || !classEl || !subjectEl) return;

    function renderClassOptions() {
        const classes = getClassesForLevel(levelEl.value);
        const current = classEl.value;
        classEl.innerHTML = (opts.classOptional !== false ? '<option value="">All Classes</option>' : '') +
            classes.map(g => `<option value="${g.class_code}">${g.name || g.class_code}</option>`).join('');
        if (classes.some(g => g.class_code === current)) classEl.value = current;
        else if (opts.classOptional === false && classes.length) classEl.value = classes[0].class_code;
    }

    function renderSubjectOptions() {
        const subjects = getSubjectsFor(levelEl.value, classEl.value);
        const current = subjectEl.value;
        subjectEl.innerHTML = '<option value="">All Subjects</option>' +
            subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if (subjects.some(s => String(s.id) === current)) subjectEl.value = current;
    }

    if (!levelEl.dataset.wired) {
        levelEl.addEventListener('change', () => { renderClassOptions(); renderSubjectOptions(); onChange(); });
        classEl.addEventListener('change', () => { renderSubjectOptions(); onChange(); });
        subjectEl.addEventListener('change', onChange);
        levelEl.dataset.wired = '1';
    }

    renderClassOptions();
    renderSubjectOptions();
}

function resetCascadingFilters(prefix, onChange, opts = {}) {
    ['level', 'class', 'subject'].forEach(part => {
        const el = document.getElementById(`${prefix}-${part}`);
        if (el) el.value = '';
    });
    wireCascadingFilters(prefix, onChange, opts);
    onChange();
}
