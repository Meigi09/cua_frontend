// ============================================
// C3UA — TEACHER PORTAL: PAST PAPERS TAB
// Loaded by: teacher-dashboard.html
// ============================================

let ppAssessments = [];

function initPapersTab() {
  const subjEl = document.getElementById("pp-subject");
  if (subjEl && !subjEl.dataset.wired) {
    const subjects = getSubjectsFor(null, null); // teacher's subjects, all classes
    subjEl.innerHTML = subjects
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join("");
    subjEl.dataset.wired = "1";
  }
  loadMyPastPapers();
}

async function loadMyPastPapers() {
  const container = document.getElementById("pp-assessments");
  try {
    const data = await GET("/api/assessment/assessments/", {
      type: "nesa_past",
    });
    ppAssessments = data.results || data || [];
    if (!ppAssessments.length) {
      container.innerHTML =
        '<div class="text-muted text-sm">No papers yet. Upload one above or run the NESA scraper.</div>';
      return;
    }
    container.innerHTML = ppAssessments
      .map((a) => {
        const isNesa = !a.source_file && !!a.source_url;
        const hasQ = a.question_count > 0;
        const published = a.is_published;
        return `
            <div class="card mb-2" style="border-left:4px solid ${published ? "var(--success)" : hasQ ? "var(--warning)" : "var(--gray-300)"};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                            <span style="font-weight:700;font-size:13px;">${a.title}</span>
                            ${isNesa ? '<span class="badge badge-info" style="font-size:10px;">NESA</span>' : '<span class="badge badge-neutral" style="font-size:10px;">Uploaded</span>'}
                            ${published ? '<span class="badge badge-success" style="font-size:10px;"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check</span> Published</span>' : ""}
                        </div>
                        <div class="text-muted text-sm">
                            ${a.question_count} question(s) ·
                            ${published ? "Live for students" : hasQ ? "Has draft questions — review before publishing" : "No questions yet — click Extract"}
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
                        ${!hasQ ? `<button class="btn btn-primary btn-sm" onclick="extractPaper(${a.id})"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">settings</span> Extract</button>` : ""}
                        ${hasQ ? `<button class="btn btn-secondary btn-sm" onclick="reviewPastPaper(${a.id})"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">assignment</span> Review</button>` : ""}
                        ${!published && hasQ ? `<button class="btn btn-sm" style="background:#dcfce7;color:#166534;" onclick="publishPaper(${a.id})"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">campaign</span> Publish</button>` : ""}
                    </div>
                </div>
            </div>`;
      })
      .join("");
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
  }
}

async function extractPaper(assessmentId) {
  toast("Extracting questions from PDF...", "info");
  try {
    const result = await POST(
      `/api/assessment/assessments/${assessmentId}/ingest_paper/`,
      {},
    );
    if (result.warning) {
      toast(result.warning, "warning");
    } else if (result.error) {
      toast(result.error, "warning");
    } else {
      toast(
        `Extracted ${result.total_found} draft questions — review them below`,
        "success",
      );
    }
    await loadMyPastPapers();
    reviewPastPaper(assessmentId);
  } catch (e) {
    toast(e.message, "warning");
  }
}

async function uploadPastPaper() {
  const title = document.getElementById("pp-title").value.trim();
  const subjectId = document.getElementById("pp-subject").value;
  const duration = document.getElementById("pp-duration").value;
  const fileInput = document.getElementById("pp-file");

  if (!title || !fileInput.files.length) {
    toast("Title and a PDF file are required", "warning");
    return;
  }

  const fd = new FormData();
  fd.append("title", title);
  fd.append("type", "nesa_past");
  fd.append("duration_mins", duration || 60);
  fd.append("source_file", fileInput.files[0]);
  if (subjectId) fd.append("topic", ""); // assessment.topic is optional; left blank, set later per-question if needed

  try {
    toast("Uploading paper...", "info");
    const assessment = await POST("/api/assessment/assessments/", fd);
    toast("Extracting questions from PDF...", "info");
    const result = await POST(
      `/api/assessment/assessments/${assessment.id}/ingest_paper/`,
      {},
    );
    if (result.warning) {
      toast(result.warning, "warning");
    } else {
      toast(
        `Found ${result.total_found} questions — review them below`,
        "success",
      );
    }
    document.getElementById("pp-title").value = "";
    fileInput.value = "";
    await loadMyPastPapers();
    reviewPastPaper(assessment.id);
  } catch (e) {
    toast(e.message, "warning");
  }
}

async function reviewPastPaper(assessmentId) {
  const section = document.getElementById("pp-review-section");
  const container = document.getElementById("pp-review");
  section.style.display = "block";
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div></div>';
  section.dataset.assessmentId = assessmentId;

  try {
    const questions = await GET(
      `/api/assessment/assessments/${assessmentId}/pending_questions/`,
    );
    if (!questions.length) {
      container.innerHTML =
        '<div class="alert alert-success"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> All questions reviewed and approved for this paper.</div>';
      return;
    }
    container.innerHTML = questions.map((q) => renderReviewCard(q)).join("");
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
  }
}

function renderReviewCard(q) {
  const isMcq = q.type === "mcq";
  return `
        <div class="card mb-3" data-question-id="${q.id}">
            <textarea class="form-control mb-2" id="q-text-${q.id}" rows="2">${q.text}</textarea>
            ${
              isMcq
                ? `
                ${q.options
                  .map(
                    (opt, idx) => `
                    <label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:14px;">
                        <input type="radio" name="correct-${q.id}" value="${idx}" ${q.correct_idx === idx ? "checked" : ""}>
                        <input class="form-control" style="flex:1;" id="q-opt-${q.id}-${idx}" value="${opt}">
                    </label>
                `,
                  )
                  .join("")}
                <div class="text-muted text-sm mb-2">Select the radio button next to the correct option</div>
            `
                : '<div class="text-muted text-sm mb-2">Essay / structured-response question — no options to set</div>'
            }
            <div style="display:flex;gap:8px;align-items:center;">
                <label class="text-sm">Marks: <input type="number" class="form-control" style="width:70px;display:inline-block;" id="q-marks-${q.id}" value="${q.marks}"></label>
                <button class="btn btn-primary btn-sm" onclick="approveQuestion(${q.id})"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> Approve</button>
            </div>
        </div>
    `;
}

async function approveQuestion(questionId) {
  const assessmentId =
    document.getElementById("pp-review-section").dataset.assessmentId;
  const text = document.getElementById(`q-text-${questionId}`).value;
  const marks =
    Number(document.getElementById(`q-marks-${questionId}`).value) || 1;

  const checked = document.querySelector(
    `input[name="correct-${questionId}"]:checked`,
  );
  const payload = { text, marks };

  if (checked) {
    const idx = Number(checked.value);
    payload.correct_idx = idx;
    payload.options = [
      ...document.querySelectorAll(`[id^="q-opt-${questionId}-"]`),
    ].map((el) => el.value);
  }

  try {
    await PATCH(
      `/api/assessment/assessments/${assessmentId}/approve_question/${questionId}/`,
      payload,
    );
    toast("Question approved", "success");
    reviewPastPaper(assessmentId);
    loadMyPastPapers();
  } catch (e) {
    toast(e.message, "warning");
  }
}
