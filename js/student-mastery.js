// ============================================
// C3UA — STUDENT PORTAL: MY MASTERY TAB
// ============================================

function initStudentMasteryFilters() {
  const subjectEl = document.getElementById("sm-subject");
  if (!subjectEl || subjectEl.dataset.wired) return;
  const myClass = STATE.user?.class_level;
  // Wait for curriculum tree — retry if subjects not yet loaded
  const subjects = getSubjectsFor(null, myClass);
  if (!subjects.length) {
    setTimeout(initStudentMasteryFilters, 300);
    return;
  }
  subjectEl.innerHTML =
    '<option value="">All My Subjects</option>' +
    subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  subjectEl.addEventListener("change", loadMyGaps);
  subjectEl.dataset.wired = "1";
}

async function loadMyMasteryOverview() {
  initStudentMasteryFilters();
  loadMyGaps();

  const container = document.getElementById("sm-records");
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';
  try {
    const data = await GET("/api/mastery/records/");
    const rows = data.results || data || [];
    if (!rows.length) {
      container.innerHTML =
        '<div class="text-muted text-sm">No mastery records yet — take a practice quiz to get started.</div>';
      return;
    }
    container.innerHTML = rows
      .map((r) => {
        const p = Math.round(parseFloat(r.mastery_score || 0) * 100);
        const color = p >= 75 ? "green" : p >= 50 ? "yellow" : "red";
        return `
                <div style="margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;font-size:13px;">
                        <span><strong>${r.topic_name || "—"}</strong> <span class="text-muted">· ${r.subject_name || ""}</span></span>
                        <span style="font-weight:600;">${p}%</span>
                    </div>
                    <div class="progress"><div class="progress-bar ${color}" style="width:${p}%"></div></div>
                </div>
            `;
      })
      .join("");
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
  }
}

async function loadMyGaps() {
  const subjectId = document.getElementById("sm-subject")?.value || "";
  const container = document.getElementById("sm-gaps");
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';
  try {
    const gaps = await GET(
      "/api/mastery/records/my_gaps/",
      subjectId ? { subject_id: subjectId } : {},
    );
    const rows = Array.isArray(gaps) ? gaps : [];
    container.innerHTML = rows.length
      ? rows
          .slice(0, 8)
          .map((g) => {
            const label =
              g.topic_name || g.topic || `Topic #${g.topic_id ?? "—"}`;
            const score =
              g.gap_score != null
                ? Math.round((1 - g.gap_score) * 100)
                : g.mastery_score != null
                  ? Math.round(parseFloat(g.mastery_score) * 100)
                  : null;
            return `
                <div style="padding:8px 12px;background:var(--gray-50);border-radius:var(--radius);margin-bottom:6px;font-size:13px;border-left:3px solid var(--danger);">
                    <strong>${label}</strong>${score != null ? ` <span class="text-muted">— ${score}% mastery</span>` : ""}
                </div>
            `;
          })
          .join("")
      : '<div class="alert alert-success">No concept gaps found <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">celebration</span></div>';
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
  }
}
