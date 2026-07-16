// ============================================
// C3UA — ADMIN DASHBOARD APP SHELL v3
// Guide stats wired, all cards redirect
// ============================================

function startGuideStatsRefresh() {
  loadGuideStats();
  setInterval(loadGuideStats, 300000); // refresh every 5 min
}

function initAdmin() {
  if (!STATE.user) return;
  const name =
    (
      (STATE.user.first_name || "") +
      " " +
      (STATE.user.last_name || "")
    ).trim() || STATE.user.email;
  const avatarEl = document.getElementById("admin-avatar");
  const nameEl = document.getElementById("admin-name");
  const roleEl = document.getElementById("admin-role");
  if (avatarEl) avatarEl.textContent = initials(name);
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = roleLabel(STATE.user.role);

  loadCurriculumTree().then(() => {
    initComplianceFilters?.();
    initMasteryFilters?.();
    initGuideFilters?.();
  });
  loadAdminData();
  startGuideStatsRefresh();
  wireCardClicks();
}

function roleLabel(role) {
  return (
    {
      admin: "School Admin",
      teacher: "Teacher",
      student: "Student",
      authority: "Education Authority",
    }[role] || "User"
  );
}

// Make every stat card on the dashboard clickable → right tab
function wireCardClicks() {
  // Retry after data renders
  setTimeout(() => {
    const map = {
      "a-stats": null, // handled per-card inside loadAdminData
      "guide-stats-card": "a-guides",
      "a-term-progress": null,
      "a-risk-list": "a-compliance",
      "a-plan-stats": "a-compliance",
      "a-student-activity": "a-mastery",
    };
    Object.entries(map).forEach(([elId, tabId]) => {
      if (!tabId) return;
      const el = document.getElementById(elId);
      if (el) {
        el.style.cursor = "pointer";
        el.title = `Click to view ${tabId.replace("a-", "")}`;
        el.addEventListener("click", () =>
          showAdminTab(tabId, document.querySelector(`[data-tab="${tabId}"]`)),
        );
      }
    });

    // Make the guide stats card clickable
    const guideCard = document.getElementById("guide-stats-card");
    if (guideCard) {
      guideCard.style.cursor = "pointer";
      guideCard.onclick = () =>
        showAdminTab(
          "a-guides",
          document.querySelector('[data-tab="a-guides"]'),
        );
    }
  }, 1500);
}

function showAdminTab(tabId, el) {
  document
    .querySelectorAll("#page-admin .tab-content")
    .forEach((t) => t.classList.remove("active"));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");
  document
    .querySelectorAll("#admin-sidebar .sidebar-item")
    .forEach((i) => i.classList.remove("active"));
  const sidebarItem = el || document.querySelector(`[data-tab="${tabId}"]`);
  if (sidebarItem) sidebarItem.classList.add("active");
  document.querySelector(".main-content").scrollTop = 0;

  const loaders = {
    "a-compliance": loadComplianceData,
    "a-mastery": loadHeatmap,
    "a-curriculum": loadCurriculumData,
    "a-guides": loadTeacherGuides,
    "a-reports": loadAdminReport,
    "a-nesa": loadNesaAdmin,
    "a-feedback": loadFeedbackAdmin,
    "a-users": () => loadUsers?.(1),
  };
  if (loaders[tabId]) setTimeout(loaders[tabId], 50);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!enforceRolePage(["admin", "authority"])) return;
  initAdmin();
});
