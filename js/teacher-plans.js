// ============================================
// C3UA — TEACHER PORTAL: MY LESSON PLANS TAB
// With Edit, Delete, and File Replacement
// ============================================

function initPlanUploadFilters() {
  wireCascadingFilters("plan", () => loadTopicsForPlan());
}

async function loadTopicsForPlan() {
  const cls = document.getElementById("plan-class").value;
  const subjectId = document.getElementById("plan-subject").value;
  const topicEl = document.getElementById("plan-topic");
  topicEl.innerHTML = '<option value="">Loading topics...</option>';
  topicEl.disabled = true;

  if (!subjectId || !cls) {
    topicEl.innerHTML =
      '<option value="">Pick a class and subject first</option>';
    return;
  }
  try {
    const data = await GET("/api/curriculum/topics/", {
      subject: subjectId,
      class_level: cls,
    });
    const topics = data.results || data || [];
    topicEl.innerHTML = topics.length
      ? topics
          .map(
            (t) =>
              `<option value="${t.id}">${t.topic_name}${t.week_start ? ` (Wk ${t.week_start}-${t.week_end})` : ""}</option>`,
          )
          .join("")
      : '<option value="">No topics found for this class/subject</option>';
    topicEl.disabled = false;
  } catch (e) {
    topicEl.innerHTML = '<option value="">Could not load topics</option>';
  }
}

// ── Submit Lesson Plan ──────────────────────────────────────────────

async function submitLessonPlan() {
  const topicId = document.getElementById("plan-topic").value;
  const fileInput = document.getElementById("plan-file");
  const btn = document.getElementById("plan-submit-btn");

  if (!topicId) {
    toast("Pick a topic first", "warning");
    return;
  }
  if (!fileInput.files.length) {
    toast("Choose a lesson plan file", "warning");
    return;
  }

  const fd = new FormData();
  fd.append("topic", topicId);
  fd.append("file", fileInput.files[0]);

  btn.disabled = true;
  btn.textContent = "Uploading...";
  try {
    await POST("/api/compliance/lesson-plans/", fd);
    toast("Lesson plan submitted for analysis", "success");
    fileInput.value = "";
    resetPlanForm();
    loadMyLessonPlans();
  } catch (e) {
    toast("Upload failed: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">upload</span> Submit for Analysis";
  }
}

function resetPlanForm() {
  document.getElementById("plan-topic").value = "";
  document.getElementById("plan-file").value = "";
  const btn = document.getElementById("plan-submit-btn");
  if (btn) {
    btn.innerHTML = "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">upload</span> Submit for Analysis";
    btn.disabled = false;
  }
  // Hide edit mode if active
  const editId = document.getElementById("plan-edit-id");
  if (editId) editId.value = "";
  document.querySelector("#plan-form .form-title")?.remove();
}

// ── Load Lesson Plans ──────────────────────────────────────────────

async function loadMyLessonPlans() {
  const container = document.getElementById("my-plans-list");
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';
  try {
    const data = await GET("/api/compliance/lesson-plans/");
    const plans = data.results || data || [];
    container.innerHTML = plans.length
      ? `
            <div class="table-wrap table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Topic</th>
                            <th>Subject</th>
                            <th>File</th>
                            <th>Submitted</th>
                            <th>Compliance</th>
                            <th>Status</th>
                            <th style="min-width:140px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>${plans
                      .map(
                        (p) => `
                        <tr>
                            <td>${p.topic_name || "—"}</td>
                            <td>${p.subject_name || "—"}</td>
                            <td>
                                ${
                                  p.file
                                    ? `<a href="#" onclick="viewLessonPlanFile(${p.id}, '${p.original_filename || "plan"}')" 
                                        style="color:var(--primary);text-decoration:underline;cursor:pointer;">
                                        <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">description</span> ${p.original_filename || "View"}
                                    </a>`
                                    : "—"
                                }
                            </td>
                            <td class="text-sm">${p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "—"}</td>
                            <td style="color:${scoreColor(p.compliance_score)};font-weight:600;">${fmtPct(p.compliance_score)}</td>
                            <td>
                                <span class="badge ${p.status === "reviewed" ? "badge-success" : p.status === "flagged" ? "badge-danger" : p.status === "analyzed" ? "badge-info" : "badge-warning"}">
                                    ${p.status}
                                </span>
                            </td>
                            <td>
                                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                    <button class="btn btn-secondary btn-sm" onclick="viewLessonPlanAnalysis(${p.id})" title="View Analysis">
                                        <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">search</span>
                                    </button>
                                    <button class="btn btn-primary btn-sm" onclick="editLessonPlan(${p.id})" title="Edit">
                                        <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">edit</span>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteLessonPlan(${p.id}, '${p.topic_name || "plan"}')" title="Delete">
                                        <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">delete</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `,
                      )
                      .join("")}</tbody>
                </table>
            </div>
        `
      : '<div class="text-muted text-sm">You haven\'t submitted any lesson plans yet.</div>';
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
  }
}

// ── View File ──────────────────────────────────────────────────────

async function viewLessonPlanFile(planId, filename) {
  try {
    const plan = await GET(`/api/compliance/lesson-plans/${planId}/`);
    if (plan.file) {
      let fileUrl = plan.file;

      // Build the full URL
      if (fileUrl.startsWith("/")) {
        fileUrl = `${CONFIG.API}${fileUrl}`;
      } else if (
        !fileUrl.startsWith("http://") &&
        !fileUrl.startsWith("https://")
      ) {
        fileUrl = `${CONFIG.API}/${fileUrl}`;
      }

      // Use the new inline document viewer
      viewDocumentInline(
        fileUrl,
        plan.original_filename || filename || "Document",
      );
    } else {
      toast("No file available for this plan", "warning");
    }
  } catch (e) {
    toast("Could not load file: " + e.message, "error");
  }
}
// ── Edit Lesson Plan ──────────────────────────────────────────────

async function editLessonPlan(planId) {
  try {
    const plan = await GET(`/api/compliance/lesson-plans/${planId}/`);

    // Show edit mode in the form
    const form = document.getElementById("plan-form");

    // Remove any existing edit indicator
    const existing = document.querySelector("#plan-form .form-title");
    if (existing) existing.remove();

    // Add edit title
    const title = document.createElement("div");
    title.className = "form-title";
    title.style.cssText =
      "background:#fef3c7;padding:8px 12px;border-radius:8px;margin-bottom:12px;font-weight:600;color:#92400e;";
    title.innerHTML = `<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">edit</span> Editing: ${plan.topic_name || "Lesson Plan"} <span style="font-weight:400;font-size:12px;color:#78350f;">(ID: ${planId})</span>`;
    form.prepend(title);

    // Get the topic details to pre-fill filters
    const topic = await GET(`/api/curriculum/topics/${plan.topic}/`);

    // Pre-fill the filters
    const classEl = document.getElementById("plan-class");
    const subjectEl = document.getElementById("plan-subject");
    const topicEl = document.getElementById("plan-topic");

    // Set class
    if (topic.class_level) {
      classEl.value = topic.class_level;
      // Trigger change to load subjects
      classEl.dispatchEvent(new Event("change"));

      // Wait for subjects to load then set subject
      setTimeout(async () => {
        // Set subject
        if (topic.subject) {
          subjectEl.value = topic.subject;
          subjectEl.dispatchEvent(new Event("change"));

          // Wait for topics to load then set topic
          setTimeout(() => {
            topicEl.value = plan.topic;
            topicEl.disabled = false;
          }, 300);
        }
      }, 300);
    }

    // Set the edit ID
    document.getElementById("plan-edit-id").value = planId;

    // Update button
    const btn = document.getElementById("plan-submit-btn");
    btn.innerHTML = "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">sync</span> Update Plan";
    btn.onclick = function () {
      updateLessonPlan(planId);
    };

    // Show file info
    if (plan.file) {
      const fileInfo = document.createElement("div");
      fileInfo.id = "plan-current-file";
      fileInfo.style.cssText =
        "font-size:12px;color:var(--gray-600);margin:4px 0 8px 0;";
      fileInfo.innerHTML = `<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">attach_file</span> Current file: <a href="#" onclick="viewLessonPlanFile(${planId}, '${plan.original_filename || "file"}')" style="color:var(--primary);text-decoration:underline;">${plan.original_filename || "View"}</a> (upload a new file to replace it)`;
      const fileInput = document.getElementById("plan-file");
      fileInput.parentNode.insertBefore(fileInfo, fileInput);
    }

    // Scroll to form
    form.scrollIntoView({ behavior: "smooth", block: "center" });

    // Also show the analysis in a modal for reference
    viewLessonPlanAnalysis(planId);
  } catch (e) {
    toast("Could not load plan for editing: " + e.message, "error");
  }
}

// ── Update Lesson Plan ─────────────────────────────────────────────

async function updateLessonPlan(planId) {
  const topicId = document.getElementById("plan-topic").value;
  const fileInput = document.getElementById("plan-file");
  const btn = document.getElementById("plan-submit-btn");

  if (!topicId) {
    toast("Pick a topic first", "warning");
    return;
  }

  const fd = new FormData();
  fd.append("topic", topicId);

  // Only append file if user selected a new one
  if (fileInput.files.length) {
    fd.append("file", fileInput.files[0]);
  }

  btn.disabled = true;
  btn.textContent = "Updating...";
  try {
    const response = await fetch(
      `${CONFIG.API}/api/compliance/lesson-plans/${planId}/`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${STATE.token}`,
          // DO NOT set Content-Type - browser will set it with boundary
          Accept: "application/json",
        },
        body: fd,
      },
    );

    // Handle non-JSON responses
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // If response is not JSON, try to get text
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || "Update failed");
      }
      data = { success: true };
    }

    if (!response.ok) {
      throw new Error(data.detail || data.message || "Update failed");
    }

    toast("Lesson plan updated successfully! Re-analyzing...", "success");
    fileInput.value = "";
    resetPlanForm();
    loadMyLessonPlans();

    // Reset button
    btn.innerHTML = "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">upload</span> Submit for Analysis";
    btn.onclick = submitLessonPlan;

    // Remove file info
    const fileInfo = document.getElementById("plan-current-file");
    if (fileInfo) fileInfo.remove();
    const title = document.querySelector("#plan-form .form-title");
    if (title) title.remove();
  } catch (e) {
    toast("Update failed: " + e.message, "error");
    btn.disabled = false;
    btn.innerHTML = "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">sync</span> Update Plan";
  }
}
// ── Delete Lesson Plan ─────────────────────────────────────────────

async function deleteLessonPlan(planId, planName) {
  // Show confirmation dialog
  const overlay = document.createElement("div");
  overlay.id = "delete-confirm-overlay";
  overlay.className = "curriculum-popup-overlay";
  overlay.innerHTML = `
        <div class="curriculum-popup" style="max-width:420px;">
            <button class="cp-close" onclick="document.getElementById('delete-confirm-overlay').remove()"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">close</span></button>
            <div style="text-align:center;padding:12px 0;">
                <div style="font-size:48px;margin-bottom:12px;"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">delete</span></div>
                <h3 style="margin-bottom:8px;">Delete Lesson Plan?</h3>
                <p style="color:var(--gray-600);font-size:14px;margin-bottom:16px;">
                    Are you sure you want to delete "<strong>${planName || "this plan"}</strong>"?<br>
                    <span style="color:#dc2626;font-size:13px;">This action cannot be undone.</span>
                </p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button class="btn btn-secondary" onclick="document.getElementById('delete-confirm-overlay').remove()">
                        Cancel
                    </button>
                    <button class="btn btn-danger" id="confirm-delete-btn" onclick="confirmDeleteLessonPlan(${planId})">
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>
    `;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

async function confirmDeleteLessonPlan(planId) {
  const btn = document.getElementById("confirm-delete-btn");
  btn.disabled = true;
  btn.textContent = "Deleting...";

  try {
    await DELETE(`/api/compliance/lesson-plans/${planId}/`);
    toast("Lesson plan deleted successfully", "success");
    document.getElementById("delete-confirm-overlay")?.remove();
    loadMyLessonPlans();
  } catch (e) {
    toast("Could not delete: " + e.message, "error");
    btn.disabled = false;
    btn.textContent = "Yes, Delete";
  }
}

// ── View Lesson Plan Analysis ─────────────────────────────────────

async function viewLessonPlanAnalysis(planId) {
  try {
    const plan = await GET(`/api/compliance/lesson-plans/${planId}/`);
    const overlay = document.createElement("div");
    overlay.id = "analysis-overlay";
    overlay.className = "curriculum-popup-overlay";

    // Get missing sections and detected sections
    const missing = plan.missing_topics || [];
    const detected = plan.detected_topics || [];
    const recommendations = plan.recommendations || [];
    const score = parseFloat(plan.compliance_score) || 0;
    const quality = parseFloat(plan.quality_score) || 0;

    overlay.innerHTML = `
            <div class="curriculum-popup" style="max-width:720px;max-height:90vh;overflow-y:auto;">
                <button class="cp-close" onclick="document.getElementById('analysis-overlay').remove()"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">close</span></button>
                <h3 style="margin-bottom:4px;"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">assignment</span> Lesson Plan Analysis</h3>
                <div class="cp-meta">${plan.topic_name || "Unknown Topic"} · ${plan.subject_name || ""}</div>

                <div style="margin:16px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;text-align:center;">
                        <div style="font-size:14px;color:var(--gray-600);">Compliance</div>
                        <div style="font-size:24px;font-weight:700;color:${scoreColor(score)};">${fmtPct(score)}</div>
                        <div style="font-size:11px;color:var(--gray-500);">${score >= 80 ? "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">star</span> Excellent" : score >= 60 ? "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> Good" : "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> Needs Improvement"}</div>
                    </div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;text-align:center;">
                        <div style="font-size:14px;color:var(--gray-600);">Quality</div>
                        <div style="font-size:24px;font-weight:700;color:${scoreColor(quality)};">${fmtPct(quality)}</div>
                        <div style="font-size:11px;color:var(--gray-500);">Structure & completeness</div>
                    </div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;text-align:center;">
                        <div style="font-size:14px;color:var(--gray-600);">Pacing</div>
                        <div style="font-size:24px;font-weight:700;color:${paceColor(plan.pacing_score)};">${plan.pacing_score !== null ? plan.pacing_score + "d" : "—"}</div>
                        <div style="font-size:11px;color:var(--gray-500);">vs. curriculum schedule</div>
                    </div>
                </div>

                ${
                  plan.status === "flagged"
                    ? `
                    <div style="background:#fef2f2;padding:12px 16px;border-radius:8px;border-left:4px solid #dc2626;margin-bottom:16px;">
                        <div style="font-weight:600;color:#dc2626;"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> This lesson plan needs improvement</div>
                        <div style="font-size:13px;color:#7f1d1d;">Compliance score below 60% — review the recommendations below.</div>
                    </div>
                `
                    : plan.status === "analyzed"
                      ? `
                    <div style="background:#f0fdf4;padding:12px 16px;border-radius:8px;border-left:4px solid #22c55e;margin-bottom:16px;">
                        <div style="font-weight:600;color:#166534;"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> Lesson plan meets CBC requirements</div>
                        <div style="font-size:13px;color:#166534;">Good alignment with the curriculum objectives.</div>
                    </div>
                `
                      : ""
                }

                <!-- What Was Expected -->
                <div style="margin-bottom:16px;">
                    <div style="font-weight:600;font-size:14px;color:var(--gray-700);"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">push_pin</span> What Was Expected</div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;font-size:13px;margin-top:4px;">
                        ${
                          missing.length
                            ? `
                            <div style="color:var(--gray-700);">
                                <strong>The CBC lesson plan template requires these sections:</strong>
                                <ul style="margin:6px 0 0 20px;padding:0;">
                                    ${missing.map((t) => `<li style="color:#dc2626;"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">cancel</span> ${t}</li>`).join("")}
                                </ul>
                            </div>
                        `
                            : `
                            <div style="color:#166534;">
                                <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> All required CBC sections are present in your plan.
                            </div>
                        `
                        }
                    </div>
                </div>

                <!-- What Your Plan Does Well -->
                <div style="margin-bottom:16px;">
                    <div style="font-weight:600;font-size:14px;color:var(--gray-700);"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> What Your Plan Does Well</div>
                    <div style="background:#f0fdf4;padding:12px;border-radius:8px;font-size:13px;margin-top:4px;">
                        ${
                          detected.length
                            ? `
                            <div style="color:#166534;">
                                <strong>Sections detected in your plan:</strong>
                                <ul style="margin:6px 0 0 20px;padding:0;">
                                    ${detected.map((t) => `<li><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check</span> ${t}</li>`).join("")}
                                </ul>
                            </div>
                        `
                            : `
                            <div class="text-muted">No specific sections were detected. Consider using a structured CBC lesson plan template.</div>
                        `
                        }
                    </div>
                </div>

                <!-- Recommendations -->
                ${
                  recommendations.length
                    ? `
                    <div style="margin-bottom:16px;">
                        <div style="font-weight:600;font-size:14px;color:var(--gray-700);"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">lightbulb</span> Recommendations for Improvement</div>
                        <div style="background:#fefce8;padding:12px 16px;border-radius:8px;font-size:13px;margin-top:4px;border:1px solid #fef08a;">
                            <ul style="margin:0;padding-left:20px;">
                                ${recommendations.map((r) => `<li style="margin-bottom:6px;">${r}</li>`).join("")}
                            </ul>
                        </div>
                    </div>
                `
                    : ""
                }

                <!-- File Info -->
                ${
                  plan.file
                    ? `
                    <div style="margin-bottom:12px;font-size:13px;color:var(--gray-600);">
                        <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">attach_file</span> <a href="#" onclick="viewLessonPlanFile(${plan.id}, '${plan.original_filename || "file"}')" 
                            style="color:var(--primary);text-decoration:underline;">${plan.original_filename || "View file"}</a>
                        · Submitted ${plan.submitted_at ? new Date(plan.submitted_at).toLocaleDateString() : ""}
                    </div>
                `
                    : ""
                }

                <!-- Actions -->
                <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="document.getElementById('analysis-overlay').remove()">
                        Close
                    </button>
                    <button class="btn btn-primary" onclick="document.getElementById('analysis-overlay').remove(); editLessonPlan(${plan.id});">
                        <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">edit</span> Edit Plan
                    </button>
                    <button class="btn btn-danger" onclick="document.getElementById('analysis-overlay').remove(); deleteLessonPlan(${plan.id}, '${plan.topic_name || "plan"}');">
                        <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">delete</span> Delete
                    </button>
                </div>
            </div>
        `;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  } catch (e) {
    toast("Could not load analysis: " + e.message, "error");
  }
}
