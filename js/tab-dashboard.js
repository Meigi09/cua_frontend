// ============================================
// C3UA — ADMIN DASHBOARD TAB
// All data from real API — no demo fallback
// ============================================

async function loadAdminData() {
  const statusEl = document.getElementById("a-api-status");
  if (statusEl) {
    statusEl.textContent = "⟳ Loading...";
    statusEl.style.color = "var(--warning)";
  }

  try {
    const [pacing, plans, subjects, cals, users, sessions, feedback] =
      await Promise.all([
        GET("/api/compliance/pacing/").catch(() => ({})),
        GET("/api/compliance/lesson-plans/").catch(() => ({})),
        GET("/api/curriculum/subjects/").catch(() => ({})),
        GET("/api/curriculum/calendars/").catch(() => ({})),
        GET("/api/accounts/users/", { role: "teacher" }).catch(() => ({})),
        GET("/api/assessment/sessions/").catch(() => ({})),
        GET("/api/feedback/aggregations/").catch(() => ({})),
      ]);

    const paceData = pacing.results || pacing || [];
    const planData = plans.results || plans || [];
    const subjData = subjects.results || subjects || [];
    const calData = cals.results || cals || [];
    const teacherData = users.results || users || [];
    const sessionData = sessions.results || sessions || [];
    const feedbackData = feedback.results || feedback || [];

    const flagged = paceData.filter((p) =>
      ["behind", "critical"].includes(p.pacing_status),
    ).length;
    const avgCov = paceData.length
      ? Math.round(
          paceData.reduce((s, p) => s + parseFloat(p.coverage_pct || 0), 0) /
            paceData.length,
        )
      : 0;

    // ── STAT CARDS (number first, label below, clickable) ──────────────
    document.getElementById("a-stats").innerHTML = `
            <div class="stat-card" onclick="showAdminTab('a-compliance',this)" title="View compliance details">
                <div class="stat-icon">📊</div>
                <div class="stat-value">${avgCov}%</div>
                <div class="stat-label">Compliance</div>
                <div class="stat-change ${avgCov >= 72 ? "up" : "down"}">${avgCov >= 72 ? "↑ Above benchmark" : "↓ Below 72% benchmark"}</div>
            </div>
            <div class="stat-card" onclick="showAdminTab('a-users',this)" title="Manage users">
                <div class="stat-icon">👨‍🏫</div>
                <div class="stat-value">${teacherData.length || paceData.length || 0}</div>
                <div class="stat-label">Teachers</div>
                <div class="stat-change neutral">Active</div>
            </div>
            <div class="stat-card" onclick="showAdminTab('a-compliance',this)" title="View lesson plans">
                <div class="stat-icon">📝</div>
                <div class="stat-value">${planData.length || 0}</div>
                <div class="stat-label">Lesson Plans</div>
                <div class="stat-change neutral">Submitted</div>
            </div>
            <div class="stat-card" onclick="showAdminTab('a-compliance',this)" title="View risk flags">
                <div class="stat-icon">⚠️</div>
                <div class="stat-value">${flagged}</div>
                <div class="stat-label">Risk Flags</div>
                <div class="stat-change ${flagged > 0 ? "down" : "up"}">${flagged > 0 ? "Needs attention" : "All clear"}</div>
            </div>
        `;
    if (document.getElementById("a-flag-count"))
      document.getElementById("a-flag-count").textContent = flagged;

    // ── CBC COVERAGE BARS ──────────────────────────────────────────────
    const barData = paceData.length
      ? paceData.slice(0, 6).map((p) => ({
          name: p.subject_name || p.subject || "—",
          covered: parseFloat(p.coverage_pct || 0),
          expected: 82,
        }))
      : subjData
          .slice(0, 6)
          .map((s) => ({ name: s.name, covered: 0, expected: 82 }));
    renderBars("a-subject-bars", barData);

    // ── RISK FLAGS ─────────────────────────────────────────────────────
    const riskItems = paceData.filter((p) =>
      ["behind", "critical"].includes(p.pacing_status),
    );
    if (document.getElementById("a-risk-count"))
      document.getElementById("a-risk-count").textContent = riskItems.length;
    const riskEl = document.getElementById("a-risk-list");
    if (riskEl) {
      riskEl.innerHTML = riskItems.length
        ? riskItems
            .slice(0, 6)
            .map(
              (r) => `
                    <div style="padding:8px 12px;background:var(--gray-50);border-radius:var(--radius);margin-bottom:6px;font-size:13px;border-left:3px solid ${r.pacing_status === "critical" ? "var(--danger)" : "var(--warning)"};">
                        <strong>${r.teacher_name || "—"}</strong> — ${r.subject_name || "—"} ${r.class_level || ""}:
                        <span style="color:${paceColor(r.pacing_days)}">${paceLabel(r.pacing_days)}</span>
                    </div>`,
            )
            .join("")
        : '<div class="text-muted text-sm">✅ No critical issues detected</div>';
    }

    // ── ACADEMIC CALENDAR ──────────────────────────────────────────────
    const current = calData.find ? calData.find((c) => c.is_current) : null;
    const termEl = document.getElementById("a-term-progress");
    if (termEl) {
      if (current) {
        const now = new Date(),
          start = new Date(current.start_date),
          end = new Date(current.end_date);
        const pct = Math.min(
          100,
          Math.max(0, Math.round(((now - start) / (end - start)) * 100)),
        );
        const wks = Math.floor((now - start) / 604800000);
        if (document.getElementById("a-term-badge"))
          document.getElementById("a-term-badge").textContent =
            `Term ${current.term}`;
        termEl.innerHTML = `
                    <div style="font-size:13px;font-weight:700;margin-bottom:8px;">${current.academic_year} — Term ${current.term}</div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                        <span class="text-muted">${current.start_date}</span>
                        <span style="font-weight:700;color:var(--accent)">${pct}%</span>
                        <span class="text-muted">${current.end_date}</span>
                    </div>
                    <div style="background:var(--gray-100);height:8px;border-radius:99px;overflow:hidden;">
                        <div style="background:var(--accent);height:100%;width:${pct}%;border-radius:99px;transition:width 0.5s;"></div>
                    </div>
                    <div class="text-muted text-sm" style="margin-top:6px;">Week ${wks} of ${current.total_weeks}</div>
                `;
      } else {
        termEl.innerHTML =
          '<div class="text-muted text-sm">No active calendar configured</div>';
      }
    }

    // ── LESSON PLAN STATS ──────────────────────────────────────────────
    const planEl = document.getElementById("a-plan-stats");
    if (planEl) {
      const reviewed = planData.filter((p) => p.status === "reviewed").length;
      const flaggedP = planData.filter((p) => p.status === "flagged").length;
      const pending = planData.filter((p) => p.status === "pending").length;
      planEl.innerHTML = `
                <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);font-size:13px;cursor:pointer;" onclick="showAdminTab('a-compliance')">
                    <span class="text-muted">Total</span><strong>${planData.length}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);font-size:13px;">
                    <span class="text-muted">Reviewed</span><strong style="color:var(--success)">${reviewed}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);font-size:13px;cursor:pointer;" onclick="showAdminTab('a-compliance')">
                    <span class="text-muted">Flagged</span><strong style="color:var(--danger)">${flaggedP}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;">
                    <span class="text-muted">Pending</span><strong style="color:var(--warning)">${pending}</strong>
                </div>`;
    }

    // ── STUDENT ACTIVITY ───────────────────────────────────────────────
    const actEl = document.getElementById("a-student-activity");
    if (actEl) {
      const graded = sessionData.filter((s) => s.status === "graded").length;
      actEl.innerHTML = `
                <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);font-size:13px;cursor:pointer;" onclick="showAdminTab('a-mastery')">
                    <span class="text-muted">Quiz Sessions</span><strong>${graded || sessionData.length || 0}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--gray-100);font-size:13px;" id="sa-mastery-row">
                    <span class="text-muted">Mastery Records</span><strong id="a-mastery-count">—</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;cursor:pointer;" onclick="showAdminTab('a-feedback')">
                    <span class="text-muted">Feedback Submitted</span><strong>${feedbackData.length || 0}</strong>
                </div>`;
      GET("/api/mastery/records/")
        .then((d) => {
          const el = document.getElementById("a-mastery-count");
          if (el) el.textContent = (d.results || d || []).length || 0;
        })
        .catch(() => {});
    }

    if (statusEl) {
      statusEl.textContent = "● Online";
      statusEl.style.color = "var(--success)";
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = "⚠️ Error";
      statusEl.style.color = "var(--danger)";
    }
    console.error("Dashboard error:", e);
    toast("Dashboard error: " + e.message, "warning");
  }
}

function refreshDashboard() {
  toast("Refreshing...", "info");
  loadAdminData();
}

// ============================================
// GUIDE STATS — fetch and populate the guide
// stats card on the admin dashboard
// ============================================
async function loadGuideStats() {
  try {
    const data = await GET("/api/curriculum/teacher-guides/stats/");
    const status = document.getElementById("guide-sync-status");
    const total = document.getElementById("guide-total-display");
    const olevel = document.getElementById("guide-olevel");
    const alevel = document.getElementById("guide-alevel");
    const subj = document.getElementById("guide-subjects");
    const topEl = document.getElementById("guide-top-subjects");
    const badge = document.getElementById("a-guide-count");

    if (status) {
      status.textContent = "● live";
      status.style.color = "var(--success)";
    }
    if (total) total.textContent = data.total || 0;
    if (olevel) olevel.textContent = data.olevel || 0;
    if (alevel) alevel.textContent = data.alevel || 0;
    if (subj) subj.textContent = data.subjects || 0;
    if (badge) badge.textContent = data.total || 0;

    if (topEl && data.subject_stats) {
      const top5 = data.subject_stats.slice(0, 5);
      topEl.innerHTML = top5
        .map(
          (s) =>
            `<span class="badge badge-info" style="cursor:pointer;"
                       onclick="showAdminTab('a-guides',null)">
                    ${s.subject__name || "—"}: ${s.count}
                 </span>`,
        )
        .join("");
    }
  } catch (e) {
    const status = document.getElementById("guide-sync-status");
    if (status) {
      status.textContent = "⚠️ Error";
      status.style.color = "var(--danger)";
    }
  }
}
