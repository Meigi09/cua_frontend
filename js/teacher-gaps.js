// ============================================
// C3UA — TEACHER PORTAL: GAP ALERTS TAB
// Loaded by: teacher-dashboard.html
// ============================================

async function loadGapAlerts() {
  const container = document.getElementById("tg-container");
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';
  try {
    const data = await GET("/api/mastery/alerts/");
    const alerts = data.results || data || [];
    container.innerHTML = alerts.length
      ? alerts
          .map(
            (a) => `
            <div class="card mb-2" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:600;">${a.topic_name || "—"}</div>
                    <div class="text-muted text-sm">${a.student_name || "Student"} · mastery ${Math.round(parseFloat(a.mastery || 0) * 100)}% · flagged ${a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</div>
                </div>
                <button class="btn btn-success btn-sm" onclick="resolveGapAlert(${a.id}, this)">✓ Mark Resolved</button>
            </div>
        `,
          )
          .join("")
      : '<div class="alert alert-success">No unresolved gap alerts 🎉</div>';
    document.getElementById("tg-count").textContent = alerts.length;
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
  }
}

async function resolveGapAlert(id, btn) {
  btn.disabled = true;
  btn.textContent = "...";
  try {
    await POST(`/api/mastery/alerts/${id}/resolve/`, {});
    toast("Marked as resolved", "success");
    loadGapAlerts();
  } catch (e) {
    toast("Could not resolve: " + e.message, "error");
    btn.disabled = false;
    btn.textContent = "✓ Mark Resolved";
  }
}
