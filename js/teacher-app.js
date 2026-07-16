// ============================================
// C3UA — TEACHER APP SHELL v4
// All tabs wired including My Topics
// ============================================

function initTeacher() {
  if (!STATE.user) return;
  const name =
    (
      (STATE.user.first_name || "") +
      " " +
      (STATE.user.last_name || "")
    ).trim() || STATE.user.email;
  document.getElementById("teacher-avatar").textContent = initials(name);
  document.getElementById("teacher-name").textContent = name;

  loadCurriculumTree().then(() => {
    initPacingFilters?.();
    initPlanUploadFilters?.();
    initLogFilters?.();
    initGuideFilters?.();
    initPapersTab?.();
  });
  loadMyPacing();
  // Pre-load topics in background so the tab is snappy
  setTimeout(loadMyTopics, 2000);
}

function showTeacherTab(tabId, el) {
  document
    .querySelectorAll("#page-teacher .tab-content")
    .forEach((t) => t.classList.remove("active"));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");
  document
    .querySelectorAll("#teacher-sidebar .sidebar-item")
    .forEach((i) => i.classList.remove("active"));
  if (el) el.classList.add("active");
  document.querySelector(".main-content").scrollTop = 0;

  const loaders = {
    "t-pacing": loadMyPacing,
    "t-plans": loadMyLessonPlans,
    "t-logs": loadMyClassLogs,
    "t-topics": () => {
      loadMyTopics();
      loadStudentQuizActivity();
    },
    "t-mastery": loadMyMastery,
    "t-gaps": loadGapAlerts,
    "t-guides": loadTeacherGuides,
    "t-feedback": loadFeedbackAdmin,
    "t-papers": loadMyPastPapers,
  };
  if (loaders[tabId]) setTimeout(loaders[tabId], 50);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!enforceRolePage(["teacher"])) return;
  initTeacher();
});
