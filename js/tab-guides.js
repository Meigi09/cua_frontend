// ============================================
// C3UA — TEACHER GUIDES TAB v3
// Groups by Level > Class using API fields
// View = inline browser modal only (no download)
// Download = separate explicit button
// ============================================

function initGuideFilters() {
  wireCascadingFilters("guide", loadTeacherGuides);
}
function resetGuideFilters() {
  resetCascadingFilters("guide", loadTeacherGuides);
}

async function loadTeacherGuides() {
  const level = document.getElementById("guide-level")?.value || "";
  const cls = document.getElementById("guide-class")?.value || "";
  const subject = document.getElementById("guide-subject")?.value || "";
  const container = document.getElementById("teacher-guides-container");
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div>Loading guides...</div>';

  try {
    let url = "/api/curriculum/courses/?has_teacher_guide=true&page_size=500";
    if (subject) url += `&subject=${subject}`;

    const data = await GET(url);
    let courses = data.results || data || [];

    // Filter by level/class using the new fields
    if (level) {
      courses = courses.filter((c) => {
        const levelCode = c.level_code || c.level || "";
        return levelCode.toUpperCase() === level.toUpperCase();
      });
    }
    if (cls) {
      courses = courses.filter((c) => {
        const classCode = c.class_code || c.class_name || "";
        return classCode === cls;
      });
    }

    if (!courses.length) {
      container.innerHTML =
        '<div class="alert alert-info">No teacher guides found for the selected filters.</div>';
      if (document.getElementById("a-guide-count"))
        document.getElementById("a-guide-count").textContent = 0;
      return;
    }

    // Group by level_name and class_code
    const grouped = {};
    courses.forEach((c) => {
      const levelName = c.level_name || "Other";
      const classCode = c.class_code || c.class_name || "—";

      // Try to infer class from subject if still missing
      let displayClass = classCode;
      if (displayClass === "—") {
        const subjectName = c.subject_name || c.name || "";
        const classMatch = subjectName.match(/\b([SP][1-6])\b/i);
        if (classMatch) {
          displayClass = classMatch[1].toUpperCase();
        }
      }

      const key = `${displayClass}|||${levelName}`;
      if (!grouped[key]) {
        grouped[key] = {
          levelName: levelName,
          classCode: displayClass,
          items: [],
        };
      }
      grouped[key].items.push(c);
    });

    // Sort groups: S1-S6 first, then P1-P6, then others
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const [ca] = a.split("|||");
      const [cb] = b.split("|||");

      const getPriority = (code) => {
        if (!code || code === "—") return 999;
        if (code.startsWith("S")) {
          const num = parseInt(code.replace("S", ""));
          return num || 100;
        }
        if (code.startsWith("P")) {
          const num = parseInt(code.replace("P", ""));
          return num + 10 || 110;
        }
        return 200;
      };

      const pa = getPriority(ca);
      const pb = getPriority(cb);
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });

    let html = "";
    let guideCount = 0;

    for (const key of sortedKeys) {
      const { levelName, classCode, items } = grouped[key];
      html += renderGuideGroup(levelName, classCode, items);
      guideCount += items.length;
    }

    container.innerHTML =
      html ||
      '<div class="alert alert-info">No guides found. Try syncing from REB.</div>';

    if (document.getElementById("a-guide-count"))
      document.getElementById("a-guide-count").textContent = guideCount;
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    console.error("Error loading guides:", e);
  }
}

function renderGuideGroup(levelName, classCode, items) {
  const badgeColor = levelName.includes("A'")
    ? "#e8f5e9"
    : levelName.includes("O'")
      ? "#e3f2fd"
      : levelName.includes("Primary")
        ? "#fff3e0"
        : "#f5f5f5";

  const displayClass = classCode === "—" ? "Unclassified" : classCode;

  return `
        <div class="card mb-4">
            <div class="card-header" style="cursor:default;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:20px;">📚</span>
                    <div>
                        <div style="font-weight:800;font-size:15px;">
                            ${displayClass === "Unclassified" ? "Other / Unclassified" : `Class ${displayClass}`}
                        </div>
                        <div style="font-size:11px;color:var(--gray-500);">${levelName}</div>
                    </div>
                    <span class="badge" style="background:${badgeColor};color:#1a365d;margin-left:4px;">
                        ${items.length} guide${items.length !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;padding:4px 0;">
                ${items.map((c) => guideCard(c)).join("")}
            </div>
        </div>`;
}

function guideCard(c) {
  const hasUrl = !!c.teacher_guide_url;
  const lang = c.language || "en";
  const langLabel =
    {
      en: "English",
      fr: "Français",
      rw: "Kinyarwanda",
      sw: "Kiswahili",
    }[lang] || lang;

  // Use the new fields from the serializer
  const levelDisplay = c.level_name || c.level || "";
  const classDisplay = c.class_code || c.class_name || "";
  const subjectName = c.subject_name || c.name || "—";

  // Try to extract class from subject name if still empty
  let classCode = classDisplay;
  if (!classCode) {
    const classMatch = subjectName.match(/\b([SP][1-6])\b/i);
    if (classMatch) {
      classCode = classMatch[1].toUpperCase();
    }
  }

  return `
        <div class="guide-card">
            <div class="guide-title">${subjectName}</div>
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px;">${c.name || "—"}</div>
            <div class="guide-meta">
                ${classCode ? `<span>🎓 ${classCode}</span> &nbsp;·&nbsp;` : ""}
                ${levelDisplay && levelDisplay !== "Other" ? `<span>📐 ${levelDisplay}</span> &nbsp;·&nbsp;` : ""}
                <span class="badge" style="font-size:10px;background:#f0fdf4;color:#166534;">${langLabel}</span>
            </div>
            <div class="guide-actions">
                ${
                  hasUrl
                    ? `<button class="btn btn-primary btn-sm" onclick="viewPDF('${c.teacher_guide_url}','${(subjectName || "").replace(/'/g, "\\'")} — ${classCode || ""}')">👁 View</button>
                       <a href="${c.teacher_guide_url}" target="_blank" class="btn btn-secondary btn-sm">⬇ Download</a>`
                    : `<span class="text-muted text-sm">No PDF linked</span>`
                }
            </div>
        </div>`;
}

// View only — serves PDF through our backend proxy to avoid cross-origin issues
function viewPDF(url, title, courseId) {
  document.getElementById("pdf-viewer-overlay")?.remove();
  // Use backend proxy if courseId provided, else direct URL
  const proxyUrl = courseId
    ? `http://localhost:8000/api/curriculum/proxy-guide/${courseId}/`
    : url;
  const overlay = document.createElement("div");
  overlay.id = "pdf-viewer-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;flex-direction:column;";
  overlay.innerHTML = `
        <div style="background:#1a1a2e;color:white;display:flex;justify-content:space-between;align-items:center;padding:10px 18px;">
            <div style="font-weight:700;font-size:14px;">📄 ${title}</div>
            <div style="display:flex;gap:8px;">
                <a href="${url}" target="_blank" download class="btn btn-secondary btn-sm">⬇ Download</a>
                <button class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white;"
                        onclick="document.getElementById('pdf-viewer-overlay').remove()">✕ Close</button>
            </div>
        </div>
        <iframe src="${proxyUrl}" style="flex:1;border:none;background:#f0f0f0;" title="${title}"
                onerror="this.src='${url}'"></iframe>
    `;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
