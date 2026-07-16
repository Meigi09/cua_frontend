// ============================================
// C3UA — REPORTS TAB v3
// Multiple report types, filters, PDF export,
// AI recommendations
// ============================================

let _reportData = null; // cached fetched data

async function loadAdminReport() {
  const el = document.getElementById("a-report-content");
  if (!el) return;
  el.innerHTML =
    '<div class="loading"><div class="spinner"></div>Loading report data...</div>';

  try {
    const [pacing, plans, mastery, sessions, feedback, topics, users] =
      await Promise.all([
        GET("/api/compliance/pacing/").catch(() => ({})),
        GET("/api/compliance/lesson-plans/").catch(() => ({})),
        GET("/api/mastery/records/", { page_size: 200 }).catch(() => ({})),
        GET("/api/assessment/sessions/", { page_size: 200 }).catch(() => ({})),
        GET("/api/feedback/aggregations/").catch(() => ({})),
        GET("/api/curriculum/topics/").catch(() => ({ count: 0 })),
        GET("/api/accounts/users/", { role: "teacher" }).catch(() => ({})),
      ]);

    _reportData = {
      paceData: pacing.results || pacing || [],
      planData: plans.results || plans || [],
      mastData: mastery.results || mastery || [],
      sessionData: sessions.results || sessions || [],
      feedData: feedback.results || feedback || [],
      topicCount: topics.count || 0,
      teachers: users.results || users || [],
    };

    el.innerHTML = `
            <!-- Report type tabs -->
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                ${[
                  ["overview", "📊 Overview", true],
                  ["teacher", "👨‍🏫 By Teacher", false],
                  ["subject", "📚 By Subject", false],
                  ["mastery", "🧠 Mastery", false],
                  ["ai", "🤖 AI Analysis", false],
                ]
                  .map(
                    ([id, label, active]) => `
                    <button class="btn ${active ? "btn-primary" : "btn-secondary"} btn-sm"
                            id="rtype-${id}"
                            onclick="switchReport('${id}')">
                        ${label}
                    </button>`,
                  )
                  .join("")}
                <button class="btn btn-secondary btn-sm" style="margin-left:auto;"
                        onclick="exportReportPDF()">⬇ Export PDF</button>
            </div>

            <!-- Filter bar -->
            <div class="filter-bar" style="margin-bottom:16px;">
                <div class="filter-group">
                    <label class="form-label">Level</label>
                    <select class="form-control" id="rfilter-level" onchange="renderCurrentReport()">
                        <option value="">All Levels</option>
                        <option value="A">A'Level</option>
                        <option value="O">O'Level</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="form-label">Class</label>
                    <select class="form-control" id="rfilter-class" onchange="renderCurrentReport()">
                        <option value="">All Classes</option>
                        ${["S1", "S2", "S3", "S4", "S5", "S6"].map((c) => `<option>${c}</option>`).join("")}
                    </select>
                </div>
                <div class="filter-group">
                    <label class="form-label">Subject</label>
                    <select class="form-control" id="rfilter-subject" onchange="renderCurrentReport()">
                        <option value="">All Subjects</option>
                        ${[
                          ...new Set(
                            _reportData.paceData
                              .map((p) => p.subject_name)
                              .filter(Boolean),
                          ),
                        ]
                          .sort()
                          .map((s) => `<option>${s}</option>`)
                          .join("")}
                    </select>
                </div>
            </div>

            <div id="report-body"></div>
        `;
    renderCurrentReport();
  } catch (e) {
    el.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
  }
}

let _currentReport = "overview";
function switchReport(type) {
  _currentReport = type;
  document
    .querySelectorAll('[id^="rtype-"]')
    .forEach((b) => (b.className = "btn btn-secondary btn-sm"));
  const btn = document.getElementById(`rtype-${type}`);
  if (btn) btn.className = "btn btn-primary btn-sm";
  renderCurrentReport();
}

function _getFilters() {
  return {
    level: document.getElementById("rfilter-level")?.value || "",
    cls: document.getElementById("rfilter-class")?.value || "",
    subject: document.getElementById("rfilter-subject")?.value || "",
  };
}

function renderCurrentReport() {
  const body = document.getElementById("report-body");
  if (!body || !_reportData) return;
  const f = _getFilters();

  let pace = _reportData.paceData;
  if (f.level)
    pace = pace.filter((p) => (p.level_code || "").toUpperCase() === f.level);
  if (f.cls) pace = pace.filter((p) => (p.class_level || "") === f.cls);
  if (f.subject)
    pace = pace.filter((p) => (p.subject_name || "") === f.subject);

  const mast = _reportData.mastData.filter(
    (m) =>
      (!f.cls || (m.class_level || "") === f.cls) &&
      (!f.subject || (m.subject_name || "") === f.subject),
  );

  const map = {
    overview: () => renderOverviewReport(pace, mast),
    teacher: () => renderTeacherReport(pace),
    subject: () => renderSubjectReport(pace, mast),
    mastery: () => renderMasteryReport(mast),
    ai: () => renderAIReport(pace, mast),
  };
  body.innerHTML = (map[_currentReport] || map.overview)();
}

function renderOverviewReport(pace, mast) {
  const { planData, topicCount, teachers, feedData, sessionData } = _reportData;
  const avgCov = pace.length
    ? Math.round(
        pace.reduce((s, p) => s + parseFloat(p.coverage_pct || 0), 0) /
          pace.length,
      )
    : 0;
  const flagged = planData.filter((p) => p.status === "flagged").length;
  const avgComp = planData.filter((p) =>
    ["analyzed", "flagged", "reviewed"].includes(p.status),
  ).length
    ? Math.round(
        planData
          .filter((p) => ["analyzed", "flagged", "reviewed"].includes(p.status))
          .reduce((s, p) => s + parseFloat(p.compliance_score || 0), 0) /
          planData.filter((p) =>
            ["analyzed", "flagged", "reviewed"].includes(p.status),
          ).length,
      )
    : 0;
  const avgMast = mast.length
    ? Math.round(
        (mast.reduce((s, m) => s + parseFloat(m.mastery_score || 0), 0) /
          mast.length) *
          100,
      )
    : 0;
  const now = new Date();
  return `
        <div class="card mb-4" id="printable-report">
            <div style="border-bottom:2px solid var(--accent);padding-bottom:12px;margin-bottom:16px;">
                <div style="font-size:18px;font-weight:800;">School Compliance & Performance Report</div>
                <div class="text-muted text-sm">Generated: ${now.toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" })} · GS Mont Kigali / APACE</div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
                ${[
                  [
                    "📊",
                    "Compliance",
                    avgComp + "%",
                    avgComp >= 72 ? "Above benchmark" : "Below 72%",
                    avgComp >= 72 ? "var(--success)" : "var(--danger)",
                  ],
                  [
                    "📈",
                    "Coverage",
                    avgCov + "%",
                    pace.length + " records",
                    "var(--accent)",
                  ],
                  [
                    "🧠",
                    "Avg Mastery",
                    avgMast + "%",
                    mast.length + " records",
                    avgMast >= 60 ? "var(--success)" : "var(--warning)",
                  ],
                  [
                    "⚠️",
                    "Flagged Plans",
                    flagged,
                    planData.length + " total",
                    flagged > 0 ? "var(--danger)" : "var(--success)",
                  ],
                ]
                  .map(
                    ([icon, label, val, sub, color]) => `
                    <div style="background:var(--gray-50);border-radius:10px;padding:14px;text-align:center;">
                        <div style="font-size:22px;">${icon}</div>
                        <div style="font-size:24px;font-weight:800;color:${color};">${val}</div>
                        <div style="font-size:11px;font-weight:700;color:var(--gray-500);text-transform:uppercase;">${label}</div>
                        <div style="font-size:11px;color:var(--gray-400);">${sub}</div>
                    </div>`,
                  )
                  .join("")}
            </div>

            <h4 style="color:var(--accent);margin:16px 0 8px;">📈 Curriculum Coverage by Subject</h4>
            ${
              pace
                .slice(0, 10)
                .map((p) => {
                  const c = parseFloat(p.coverage_pct || 0);
                  const color =
                    c >= 75
                      ? "var(--success)"
                      : c >= 50
                        ? "var(--warning)"
                        : "var(--danger)";
                  return `<div style="margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;font-size:12px;">
                        <span><strong>${p.teacher_name || "—"}</strong> · ${p.subject_name || "—"} ${p.class_level || ""}</span>
                        <span style="color:${color};font-weight:700;">${Math.round(c)}%</span>
                    </div>
                    <div class="progress"><div class="progress-bar" style="width:${c}%;background:${color};"></div></div>
                </div>`;
                })
                .join("") ||
              '<div class="text-muted text-sm">No pacing data available</div>'
            }

            <h4 style="color:var(--accent);margin:16px 0 8px;">📚 Resources</h4>
            <div style="font-size:13px;color:var(--gray-700);">
                <p>${topicCount} curriculum topics indexed · ${teachers.length} active teachers · ${feedData.length} student feedback records · ${sessionData.filter?.((s) => s.status === "graded").length || 0} graded quiz sessions</p>
            </div>
        </div>`;
}

function renderTeacherReport(pace) {
  const byTeacher = {};
  pace.forEach((p) => {
    const name = p.teacher_name || "Unknown";
    if (!byTeacher[name]) byTeacher[name] = [];
    byTeacher[name].push(p);
  });
  if (!Object.keys(byTeacher).length)
    return '<div class="alert alert-info">No teacher pacing data available for the selected filters.</div>';
  return Object.entries(byTeacher)
    .map(([teacher, records]) => {
      const avg = Math.round(
        records.reduce((s, r) => s + parseFloat(r.coverage_pct || 0), 0) /
          records.length,
      );
      return `
            <div class="card mb-3">
                <div class="card-header">
                    <span class="card-title">👨‍🏫 ${teacher}</span>
                    <span class="badge ${avg >= 72 ? "badge-success" : "badge-warning"}">${avg}% avg coverage</span>
                </div>
                ${records
                  .map((r) => {
                    const c = parseFloat(r.coverage_pct || 0);
                    return `<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--gray-100);">
                        <span>${r.subject_name || "—"} · ${r.class_level || "—"}</span>
                        <span style="color:${c >= 75 ? "var(--success)" : c >= 50 ? "var(--warning)" : "var(--danger)"};font-weight:700;">${Math.round(c)}%</span>
                    </div>`;
                  })
                  .join("")}
            </div>`;
    })
    .join("");
}

function renderSubjectReport(pace, mast) {
  const bySubject = {};
  pace.forEach((p) => {
    const k = p.subject_name || "Unknown";
    if (!bySubject[k]) bySubject[k] = { pacing: [], mastery: [] };
    bySubject[k].pacing.push(p);
  });
  mast.forEach((m) => {
    const k = m.subject_name || "Unknown";
    if (!bySubject[k]) bySubject[k] = { pacing: [], mastery: [] };
    bySubject[k].mastery.push(m);
  });
  if (!Object.keys(bySubject).length)
    return '<div class="alert alert-info">No data for selected filters.</div>';
  return Object.entries(bySubject)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([subject, data]) => {
      const avgCov = data.pacing.length
        ? Math.round(
            data.pacing.reduce(
              (s, p) => s + parseFloat(p.coverage_pct || 0),
              0,
            ) / data.pacing.length,
          )
        : null;
      const avgMast = data.mastery.length
        ? Math.round(
            (data.mastery.reduce(
              (s, m) => s + parseFloat(m.mastery_score || 0),
              0,
            ) /
              data.mastery.length) *
              100,
          )
        : null;
      return `
            <div class="card mb-3">
                <div class="card-header">
                    <span class="card-title">📚 ${subject}</span>
                    <div style="display:flex;gap:8px;">
                        ${avgCov != null ? `<span class="badge ${avgCov >= 72 ? "badge-success" : "badge-warning"}">Coverage: ${avgCov}%</span>` : ""}
                        ${avgMast != null ? `<span class="badge ${avgMast >= 65 ? "badge-success" : "badge-warning"}">Mastery: ${avgMast}%</span>` : ""}
                    </div>
                </div>
                ${data.pacing
                  .map(
                    (p) => `
                    <div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--gray-100);">
                        ${p.class_level || "—"} · ${p.teacher_name || "—"} ·
                        <strong style="color:${parseFloat(p.coverage_pct || 0) >= 72 ? "var(--success)" : "var(--danger)"};">${Math.round(p.coverage_pct || 0)}% covered</strong>
                    </div>`,
                  )
                  .join("")}
            </div>`;
    })
    .join("");
}

function renderMasteryReport(mast) {
  if (!mast.length)
    return '<div class="alert alert-info">No mastery data for selected filters.</div>';
  const byTopic = {};
  mast.forEach((m) => {
    const k = m.topic_name || "Unknown";
    if (!byTopic[k]) byTopic[k] = { scores: [], subject: m.subject_name };
    byTopic[k].scores.push(parseFloat(m.mastery_score || 0));
  });
  const sorted = Object.entries(byTopic)
    .map(([topic, d]) => ({
      topic,
      subject: d.subject,
      avg: Math.round(
        (d.scores.reduce((s, v) => s + v, 0) / d.scores.length) * 100,
      ),
      count: d.scores.length,
    }))
    .sort((a, b) => a.avg - b.avg);
  return `
        <div class="card">
            <div class="card-header"><span class="card-title">🧠 Topic Mastery Overview</span></div>
            ${sorted
              .map((t) => {
                const c =
                  t.avg >= 75
                    ? "var(--success)"
                    : t.avg >= 50
                      ? "var(--warning)"
                      : "var(--danger)";
                return `<div style="margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;font-size:12px;">
                        <span><strong>${t.topic}</strong> <span class="text-muted">· ${t.subject || "—"}</span> <span class="text-muted">(${t.count} student${t.count !== 1 ? "s" : ""})</span></span>
                        <span style="color:${c};font-weight:700;">${t.avg}%</span>
                    </div>
                    <div class="progress"><div class="progress-bar" style="width:${t.avg}%;background:${c};"></div></div>
                </div>`;
              })
              .join("")}
        </div>`;
}

function renderAIReport(pace, mast) {
  const avgCov = pace.length
    ? Math.round(
        pace.reduce((s, p) => s + parseFloat(p.coverage_pct || 0), 0) /
          pace.length,
      )
    : 0;
  const avgMast = mast.length
    ? Math.round(
        (mast.reduce((s, m) => s + parseFloat(m.mastery_score || 0), 0) /
          mast.length) *
          100,
      )
    : 0;
  const behind = pace.filter((p) =>
    ["behind", "critical"].includes(p.pacing_status),
  );
  const lowMast = mast.filter((m) => parseFloat(m.mastery_score || 0) < 0.5);

  const recommendations = [];
  if (avgCov < 72)
    recommendations.push({
      icon: "⚠️",
      type: "warning",
      msg: `Average syllabus coverage (${avgCov}%) is below the CBC benchmark of 72%. Prioritise lesson delivery in at-risk classes.`,
    });
  if (behind.length > 0)
    recommendations.push({
      icon: "🔴",
      type: "danger",
      msg: `${behind.length} teacher-subject record${behind.length > 1 ? "s are" : " is"} behind or critical: ${behind
        .slice(0, 3)
        .map((p) => p.subject_name + " " + p.class_level)
        .join(", ")}. Schedule check-in meetings.`,
    });
  if (lowMast.length > 0)
    recommendations.push({
      icon: "🧠",
      type: "warning",
      msg: `${lowMast.length} topic${lowMast.length > 1 ? "s have" : "has"} mastery below 50%. Target these for revision sessions and encourage students to use the Practice Quiz feature.`,
    });
  if (avgMast >= 70)
    recommendations.push({
      icon: "✅",
      type: "success",
      msg: `Student mastery average of ${avgMast}% indicates good understanding overall. Continue current teaching strategies.`,
    });
  if (avgCov >= 72 && behind.length === 0)
    recommendations.push({
      icon: "✅",
      type: "success",
      msg: "All tracked teachers are on track with curriculum coverage. CBC delivery is meeting national expectations.",
    });
  if (recommendations.length === 0)
    recommendations.push({
      icon: "ℹ️",
      type: "info",
      msg: "Add more lesson plan submissions and quiz activity to generate meaningful AI recommendations.",
    });

  return `
        <div class="card mb-3">
            <div class="card-header"><span class="card-title">🤖 AI Analysis & Recommendations</span>
                <span class="badge badge-info">Based on live data</span>
            </div>
            <p style="font-size:13px;color:var(--gray-500);margin-bottom:14px;">
                Analysed ${pace.length} pacing records, ${mast.length} mastery records, ${_reportData.planData.length} lesson plans.
            </p>
            ${recommendations
              .map(
                (r) => `
                <div class="alert alert-${r.type === "success" ? "success" : r.type === "danger" ? "danger" : "warning"} mb-3" style="display:flex;gap:10px;align-items:flex-start;">
                    <span style="font-size:18px;flex-shrink:0;">${r.icon}</span>
                    <span>${r.msg}</span>
                </div>`,
              )
              .join("")}
        </div>
        <div class="card">
            <div class="card-header"><span class="card-title">📋 Data Summary</span></div>
            <div style="font-size:13px;line-height:2;color:var(--gray-700);">
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--gray-100);padding:4px 0;"><span>Average Coverage</span><strong style="color:${avgCov >= 72 ? "var(--success)" : "var(--danger)"};">${avgCov}%</strong></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--gray-100);padding:4px 0;"><span>Teachers Behind/Critical</span><strong style="color:${behind.length > 0 ? "var(--danger)" : "var(--success)"};">${behind.length}</strong></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--gray-100);padding:4px 0;"><span>Average Student Mastery</span><strong style="color:${avgMast >= 65 ? "var(--success)" : "var(--warning)"};">${avgMast}%</strong></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Topics Below 50% Mastery</span><strong style="color:${lowMast.length > 0 ? "var(--danger)" : "var(--success)"};">${lowMast.length}</strong></div>
            </div>
        </div>`;
}

function exportReportPDF() {
  const content = document.getElementById("report-body")?.innerHTML || "";
  const title =
    "C³UA School Report — " + new Date().toLocaleDateString("en-RW");
  const filters = _getFilters();
  const filterText =
    [filters.level, filters.cls, filters.subject].filter(Boolean).join(" · ") ||
    "All";

  downloadReport(
    title,
    `
        <h1 style="color:#0f2318;">C³UA School Compliance & Performance Report</h1>
        <p class="meta">Generated: ${new Date().toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" })} · GS Mont Kigali / APACE · Filter: ${filterText}</p>
        ${content}
    `,
  );
}

function generateReport() {
  loadAdminReport();
}
