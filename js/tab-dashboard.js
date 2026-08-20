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
    const [pacing, plans, subjects, cals, users, sessions, feedback, masteryRecs, gapAlerts] =
      await Promise.all([
        GET("/api/compliance/pacing/").catch(() => ({})),
        GET("/api/compliance/lesson-plans/").catch(() => ({})),
        GET("/api/curriculum/subjects/").catch(() => ({})),
        GET("/api/curriculum/calendars/").catch(() => ({})),
        GET("/api/accounts/users/", { role: "teacher" }).catch(() => ({})),
        GET("/api/assessment/sessions/").catch(() => ({})),
        GET("/api/feedback/aggregations/").catch(() => ({})),
        GET("/api/mastery/records/").catch(() => ({})),
        GET("/api/mastery/alerts/").catch(() => ({})),
      ]);

    const paceData = pacing.results || pacing || [];
    const planData = plans.results || plans || [];
    const subjData = subjects.results || subjects || [];
    const calData = cals.results || cals || [];
    const teacherData = users.results || users || [];
    const sessionData = sessions.results || sessions || [];
    const feedbackData = feedback.results || feedback || [];
    const masteryData = masteryRecs.results || masteryRecs || [];
    const gapData = gapAlerts.results || gapAlerts || [];

    const flagged = paceData.filter((p) =>
      ["behind", "critical"].includes(p.pacing_status),
    ).length;
    const avgCov = paceData.length
      ? Math.round(
          paceData.reduce((s, p) => s + parseFloat(p.coverage_pct || 0), 0) /
            paceData.length,
        )
      : 0;
    // Real compliance score -- semantic alignment between each lesson plan
    // and the curriculum, computed by apps/compliance/services.py's ML
    // scorer. Different signal from pacing coverage above: coverage asks
    // "how much ground has been covered", compliance asks "does what was
    // taught actually match what the curriculum requires".
    const scoredPlans = planData.filter((p) => p.compliance_score != null);
    const avgCompliance = scoredPlans.length
      ? Math.round(
          scoredPlans.reduce((s, p) => s + parseFloat(p.compliance_score || 0), 0) /
            scoredPlans.length,
        )
      : null;
    const avgMastery = masteryData.length
      ? Math.round(
          masteryData.reduce((s, m) => s + parseFloat(m.mastery_score || 0), 0) /
            masteryData.length,
        )
      : null;
    const criticalGaps = gapData.filter((g) => parseFloat(g.mastery || 0) < 50);

    // -- STAT CARDS (number + explainer, so the metric explains itself) --
    document.getElementById("a-stats").innerHTML = `
            <div class="stat-card" onclick="showAdminTab('a-compliance',this)" title="View compliance details">
                <div class="stat-icon"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">fact_check</span></div>
                <div class="stat-value">${avgCompliance != null ? avgCompliance + "%" : "\u2014"}</div>
                <div class="stat-label">Compliance</div>
                <div class="stat-explainer">${avgCompliance != null ? "How closely submitted lesson plans match curriculum requirements." : "No scored lesson plans yet."}</div>
            </div>
            <div class="stat-card" onclick="showAdminTab('a-compliance',this)" title="View pacing details">
                <div class="stat-icon"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">speed</span></div>
                <div class="stat-value">${avgCov}%</div>
                <div class="stat-label">Curriculum Coverage</div>
                <div class="stat-explainer">${avgCov >= 72 ? "On pace with the term calendar." : "Behind the expected pace for this term."}</div>
            </div>
            <div class="stat-card" onclick="showAdminTab('a-mastery',this)" title="View concept mastery">
                <div class="stat-icon"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">psychology</span></div>
                <div class="stat-value">${avgMastery != null ? avgMastery + "%" : "\u2014"}</div>
                <div class="stat-label">Concept Mastery</div>
                <div class="stat-explainer">Average student mastery across all assessed learning outcomes.</div>
            </div>
            <div class="stat-card" onclick="showAdminTab('a-mastery',this)" title="View learning gaps">
                <div class="stat-icon"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span></div>
                <div class="stat-value">${gapData.length}</div>
                <div class="stat-label">Learning Gaps</div>
                <div class="stat-explainer">${gapData.length ? "Concepts flagged for intervention \u2014 " + criticalGaps.length + " critical." : "No unresolved concept gaps."}</div>
            </div>
        `;
    if (document.getElementById("a-flag-count"))
      document.getElementById("a-flag-count").textContent = flagged;

    // -- INSIGHT BANNER -- turn the numbers above into one sentence --
    const insightEl = document.getElementById("a-insight-text");
    if (insightEl) {
      const worstPace = paceData
        .filter((p) => p.pacing_status === "critical" || p.pacing_status === "behind")
        .sort((a, b) => parseFloat(a.coverage_pct || 0) - parseFloat(b.coverage_pct || 0))[0];
      const worstGap = [...gapData].sort(
        (a, b) => parseFloat(a.mastery || 0) - parseFloat(b.mastery || 0),
      )[0];

      const parts = [];
      if (flagged > 0) {
        parts.push(
          `${flagged} class${flagged === 1 ? " is" : "es are"} falling behind the curriculum pace` +
          (worstPace ? ` \u2014 ${worstPace.subject_name || "a subject"} (${worstPace.class_level || ""}) is furthest behind` : ""),
        );
      }
      if (gapData.length > 0) {
        parts.push(
          `${gapData.length} concept${gapData.length === 1 ? "" : "s"} show${gapData.length === 1 ? "s" : ""} weak mastery` +
          (worstGap ? `, worst on "${worstGap.topic_name || "a topic"}" at ${Math.round(parseFloat(worstGap.mastery || 0))}%` : ""),
        );
      }
      insightEl.textContent = parts.length
        ? parts.join(". ") + ". Start there."
        : "Curriculum delivery is on pace and no critical concept gaps are open \u2014 nothing needs intervention right now.";
    }

    // ── CBC COVERAGE BARS ──────────────────────────────────────────────
    // paceData has one row per (teacher, class, subject) combo, so the
    // same subject name repeats across different classes/levels. Label
    // each bar with its class too, and show the worst-covered combos
    // first (that's the actionable view) rather than an arbitrary slice.
    const barData = paceData.length
      ? [...paceData]
          .sort((a, b) => parseFloat(a.coverage_pct || 0) - parseFloat(b.coverage_pct || 0))
          .slice(0, 6)
          .map((p) => ({
            name: `${p.subject_name || p.subject || "—"} · ${p.class_level || "—"}`,
            covered: parseFloat(p.coverage_pct || 0),
            expected: 82,
          }))
      : subjData
          .slice(0, 6)
          .map((s) => ({ name: s.name, covered: 0, expected: 82 }));
    renderBars("a-subject-bars", barData);
    const barNote = document.getElementById("a-subject-bars-note");
    if (barNote) {
      barNote.textContent =
        paceData.length > 6
          ? `Showing the ${Math.min(6, paceData.length)} lowest-coverage class/subject combinations out of ${paceData.length} total.`
          : "";
    }

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
        : '<div class="text-muted text-sm"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> No critical issues detected</div>';
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
      statusEl.innerHTML = "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> Error";
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
      status.innerHTML = "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> Error";
      status.style.color = "var(--danger)";
    }
  }
}
