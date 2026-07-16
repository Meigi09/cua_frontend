// ============================================
// C3UA — TEACHER PORTAL: MY STUDENTS' MASTERY TAB
// ============================================

let teacherMasteryCache = null;

async function loadMyMastery() {
  const container = document.getElementById("tm-container");
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div>Loading students\' mastery...</div>';
  try {
    teacherMasteryCache = null; // always refresh
    const data = await GET("/api/mastery/records/");
    teacherMasteryCache = data.results || data || [];

    if (!teacherMasteryCache.length) {
      // Fall back: show all records the teacher can access even if no
      // student has formally set them as their teacher yet (demo mode)
      const all = await GET("/api/mastery/records/", { page_size: 100 });
      teacherMasteryCache = all.results || all || [];
    }

    populateMasterySubjectFilter();
    renderMyMastery();
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
  }
}

function populateMasterySubjectFilter() {
  const el = document.getElementById("tm-subject");
  if (!el) return;

  // First try from the mastery records themselves
  let subjects = Array.from(
    new Set(teacherMasteryCache.map((r) => r.subject_name).filter(Boolean)),
  ).sort();

  // If mastery records have no subject names, fall back to teacher's subjects
  // from the curriculum tree
  if (!subjects.length) {
    const myClass = null; // show all classes the teacher teaches
    const treeSubjects = getSubjectsFor(null, myClass);
    subjects = treeSubjects.map((s) => s.name);
  }

  el.innerHTML =
    '<option value="">All My Subjects</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
  el.dataset.wired = "1";
}

function renderMyMastery() {
  const container = document.getElementById("tm-container");
  const subjectFilter = document.getElementById("tm-subject")?.value || "";
  let rows = teacherMasteryCache || [];
  if (subjectFilter)
    rows = rows.filter((r) => r.subject_name === subjectFilter);

  if (!rows.length) {
    container.innerHTML = `
            <div class="alert alert-info">
                No mastery records yet for your students.
                Students need to take at least one quiz and select you as their teacher
                for their data to appear here.
            </div>`;
    return;
  }

  const byTopic = new Map();
  rows.forEach((r) => {
    const key = r.topic_name || "Unknown";
    if (!byTopic.has(key))
      byTopic.set(key, {
        topic: key,
        subject: r.subject_name,
        total: 0,
        count: 0,
      });
    const entry = byTopic.get(key);
    entry.total += parseFloat(r.mastery_score || 0);
    entry.count += 1;
  });
  const topics = Array.from(byTopic.values())
    .map((t) => ({ ...t, avg: t.total / t.count }))
    .sort((a, b) => a.avg - b.avg);

  container.innerHTML = topics
    .map((t) => {
      const p = Math.round(t.avg * 100);
      const color = p >= 75 ? "green" : p >= 50 ? "yellow" : "red";
      return `
            <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;">
                    <span><strong>${t.topic}</strong> <span class="text-muted">· ${t.subject || "—"}</span>
                    <span class="text-muted">(${t.count} student${t.count !== 1 ? "s" : ""})</span></span>
                    <span style="font-weight:600;">${p}%</span>
                </div>
                <div class="progress"><div class="progress-bar ${color}" style="width:${p}%"></div></div>
            </div>
        `;
    })
    .join("");
}
