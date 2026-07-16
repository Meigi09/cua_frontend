// ============================================
// C3UA — AI STUDENT TUTOR
// Powered by Google Gemini API (Free Tier Optimized)
// Floating chat button on student dashboard
// ============================================


let tutorOpen = false;
let tutorHistory = [];
const GEMINI_API_KEY = "AIzaSyDQeDl24AcgUxqYCMrhCPEEqlOA5T1cgqs";

// Use ONLY the fastest, lightest models for free tier
const GEMINI_MODELS = [
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.0-flash-001",
  "gemini-2.5-flash",
];
let currentModelIndex = 0;
let availableModels = [];
let isProcessing = false;
let conversationContext = {};

// Make functions globally accessible
window.toggleTutor = toggleTutor;
window.sendTutorMessage = sendTutorMessage;

function initTutor() {
  discoverAvailableModels();

  document.body.insertAdjacentHTML(
    "beforeend",
    `
        <div id="tutor-btn" onclick="window.toggleTutor()"
             style="position:fixed;bottom:24px;right:24px;z-index:8000;
                    background:var(--accent);color:white;border-radius:50%;
                    width:56px;height:56px;display:flex;align-items:center;
                    justify-content:center;font-size:24px;cursor:pointer;
                    box-shadow:0 4px 16px rgba(46,125,50,0.35);
                    transition:transform 0.2s ease,box-shadow 0.2s ease;">
            🤖
        </div>

        <div id="tutor-panel"
             style="position:fixed;bottom:92px;right:24px;z-index:8000;
                    width:360px;height:500px;background:white;border-radius:16px;
                    box-shadow:0 16px 40px rgba(0,0,0,0.15);
                    display:none;flex-direction:column;overflow:hidden;
                    border:1px solid var(--gray-200);">
            <div style="background:var(--accent);color:white;padding:14px 16px;
                        display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:700;font-size:14px;">C3UA AI Tutor</div>
                    <div style="font-size:11px;opacity:0.85;">Exam Prep Mode</div>
                </div>
                <button onclick="window.toggleTutor()" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div id="tutor-messages"
                 style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;">
                <div class="tutor-msg bot">
                    Welcome to your AI Exam Prep Tutor. I will help you master your CBC subjects and boost your scores. Share your progress or specific topics you are struggling with, and I will create a personalized study plan. What would you like to focus on today?
                </div>
            </div>
            <div style="padding:10px;border-top:1px solid var(--gray-100);display:flex;gap:8px;">
                <input id="tutor-input" class="form-control"
                       placeholder="Ask about any topic or share your score..."
                       onkeydown="if(event.key==='Enter')window.sendTutorMessage()"
                       style="flex:1;padding:8px 12px;">
                <button class="btn btn-primary btn-sm" onclick="window.sendTutorMessage()">Send</button>
            </div>
        </div>

        <style>
        .tutor-msg { max-width: 85%; padding: 10px 13px; border-radius: 12px; font-size: 13px; line-height: 1.6; word-wrap: break-word; }
        .tutor-msg.bot { background: #f0fdf4; color: var(--gray-800); align-self: flex-start; border-bottom-left-radius: 4px; }
        .tutor-msg.user { background: var(--accent); color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
        .tutor-msg.loading { color: var(--gray-400); font-style: italic; }
        .tutor-msg.error { background: #fee; color: #c00; }
        #tutor-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(46,125,50,0.4); }
        </style>
    `,
  );
}

async function discoverAvailableModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
    );
    if (response.ok) {
      const data = await response.json();
      const fastModels =
        data.models?.filter(
          (model) =>
            model.supportedGenerationMethods?.includes("generateContent") &&
            !model.displayName?.toLowerCase().includes("deprecated") &&
            !model.name.includes("preview") &&
            !model.name.includes("test") &&
            !model.name.includes("gemma") &&
            !model.name.includes("pro") &&
            !model.name.includes("image") &&
            (model.name.includes("flash") || model.name.includes("lite")),
        ) || [];

      availableModels = fastModels
        .map((m) => m.name.replace("models/", ""))
        .sort((a, b) => {
          const aIsLite = a.includes("lite");
          const bIsLite = b.includes("lite");
          if (aIsLite && !bIsLite) return -1;
          if (!aIsLite && bIsLite) return 1;
          return b.localeCompare(a);
        });

      if (availableModels.length > 0) {
        GEMINI_MODELS.length = 0;
        GEMINI_MODELS.push(...availableModels.slice(0, 6));
      }
    }
  } catch (e) {
    console.warn("Could not discover models, using fallback list:", e);
  }
}

function toggleTutor() {
  tutorOpen = !tutorOpen;
  const panel = document.getElementById("tutor-panel");
  if (panel) {
    panel.style.display = tutorOpen ? "flex" : "none";
    if (tutorOpen) {
      setTimeout(() => document.getElementById("tutor-input")?.focus(), 100);
    }
  }
}

// Function to clean response text - remove emojis and special characters
function cleanResponse(text) {
  // Remove emojis (including stars, checkmarks, etc.)
  const emojiRegex =
    /[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{2B50}\u{2705}\u{2714}\u{274C}\u{2B55}\u{1F4A1}\u{1F4A4}\u{1F4A9}\u{1F4AF}\u{1F4B0}\u{1F4B8}\u{1F4BC}\u{1F4C8}\u{1F4C9}\u{1F4CA}\u{1F4CB}\u{1F4CC}\u{1F4CD}\u{1F4CE}\u{1F4CF}\u{1F4D0}\u{1F4D1}\u{1F4D2}\u{1F4D3}\u{1F4D4}\u{1F4D5}\u{1F4D6}\u{1F4D7}\u{1F4D8}\u{1F4D9}\u{1F4DA}\u{1F4DB}\u{1F4DC}\u{1F4DD}\u{1F4DE}\u{1F4DF}\u{1F4E0}\u{1F4E1}\u{1F4E2}\u{1F4E3}\u{1F4E4}\u{1F4E5}\u{1F4E6}\u{1F4E7}\u{1F4E8}\u{1F4E9}\u{1F4EA}\u{1F4EB}\u{1F4EC}\u{1F4ED}\u{1F4EE}\u{1F4EF}\u{1F4F0}\u{1F4F1}\u{1F4F2}\u{1F4F3}\u{1F4F4}\u{1F4F5}\u{1F4F6}\u{1F4F7}\u{1F4F8}\u{1F4F9}\u{1F4FA}\u{1F4FB}\u{1F4FC}\u{1F4FD}\u{1F4FE}\u{1F4FF}]/gu;

  // Remove common emoji shortcuts
  const starRegex = /[⭐🌟✨]/g;
  const checkRegex = /[✅✔✓☑]/g;
  const bulletRegex = /[•▪▸▹►▶◆◇●○■□]/g;
  const arrowRegex = /[→←↑↓↔➡⬅]/g;

  let cleaned = text
    .replace(emojiRegex, "")
    .replace(starRegex, "")
    .replace(checkRegex, "")
    .replace(bulletRegex, "•") // Replace with standard bullet
    .replace(arrowRegex, "")
    .replace(/\*\*/g, "") // Remove bold markdown
    .replace(/\*/g, "") // Remove asterisks
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();

  // Clean up numbered lists (1., 2., etc.) - keep them clean
  cleaned = cleaned.replace(/^(\d+)\.\s*/gm, "$1. ");

  return cleaned;
}

async function sendTutorMessage() {
  if (isProcessing) {
    appendTutorMsg(
      "Please wait for the previous response to complete...",
      "bot",
    );
    return;
  }

  const input = document.getElementById("tutor-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  appendTutorMsg(text, "user");
  tutorHistory.push({ role: "user", parts: [{ text: text }] });

  const loadingId = appendTutorMsg("Thinking...", "bot loading");
  isProcessing = true;

  try {
    const studentLevel = STATE?.user?.class_level || "S4";
    const studentStream = STATE?.user?.stream || "PCB";

    // Check if user is sharing progress/score
    const hasProgress = text.match(/\d+%/);
    const subjectMatch = text.match(
      /(?:mathematics|math|physics|chemistry|biology|english|french|kinyarwanda|ict|economics|history|geography|advanced mathematics|additional mathematics)/i,
    );

    if (hasProgress && subjectMatch) {
      conversationContext[subjectMatch[0].toLowerCase()] = hasProgress[0];
    }

    let contextStr = "";
    if (Object.keys(conversationContext).length > 0) {
      contextStr =
        "Student progress: " +
        Object.entries(conversationContext)
          .map(([subject, score]) => `${subject}: ${score}`)
          .join(", ");
    }

    // System prompt - NO emojis or special characters
    const systemPrompt = `You are C3UA Exam Prep Tutor for Rwandan ${studentLevel} ${studentStream} student.
${contextStr}
Rules:
- Give brief, actionable advice (max 100 words)
- Use numbered lists (1., 2., 3.) for key points
- Do NOT use emojis, stars, or special characters
- Focus on exam techniques and common mistakes
- Be encouraging and practical
- If student shares scores below 50%, prioritize that subject
- For math: emphasize practice and common errors
- Connect to CBC curriculum requirements`;

    const conversationHistory = [];
    conversationHistory.push({
      role: "user",
      parts: [{ text: `System: ${systemPrompt}` }],
    });

    const historyToSend = tutorHistory.slice(-3);
    if (historyToSend.length > 0) {
      const startIdx =
        historyToSend[0]?.role === "user" &&
        historyToSend[0]?.parts?.[0]?.text?.startsWith("System:")
          ? 1
          : 0;
      conversationHistory.push(...historyToSend.slice(startIdx));
    }

    let lastError = null;
    const modelsToTry =
      GEMINI_MODELS.length > 0
        ? GEMINI_MODELS
        : ["gemini-2.0-flash-lite-001", "gemini-2.0-flash-lite"];

    for (let i = 0; i < modelsToTry.length; i++) {
      try {
        const model = modelsToTry[i];

        const startTime = Date.now();
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: conversationHistory,
              generationConfig: {
                temperature: 0.4,
                topK: 15,
                topP: 0.7,
                maxOutputTokens: 180,
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
              ],
            }),
          },
        );

        const elapsed = Date.now() - startTime;
        console.log(`Model ${model} responded in ${elapsed}ms`);

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = errorData.error?.message || "API request failed";

          if (
            response.status === 503 ||
            response.status === 429 ||
            response.status === 500 ||
            errorMsg.includes("quota") ||
            errorMsg.includes("demand") ||
            errorMsg.includes("exhausted") ||
            errorMsg.includes("overloaded")
          ) {
            console.log(`Model ${model} failed, trying next...`);
            lastError = new Error(errorMsg);
            continue;
          }

          throw new Error(errorMsg);
        }

        const data = await response.json();
        let reply =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I'm sorry, I couldn't process that. Please try again.";

        // Clean the response - remove all emojis, stars, special characters
        reply = cleanResponse(reply);

        tutorHistory.push({ role: "assistant", parts: [{ text: reply }] });
        updateTutorMsg(loadingId, reply, "bot");
        isProcessing = false;
        return;
      } catch (modelError) {
        console.error(`Model ${modelsToTry[i]} failed:`, modelError);
        lastError = modelError;
      }
    }

    throw lastError || new Error("All models are currently unavailable");
  } catch (e) {
    console.error("Gemini API Error:", e);

    let errorMessage = "Service busy. ";
    if (
      e.message.includes("quota") ||
      e.message.includes("limit") ||
      e.message.includes("exhausted")
    ) {
      errorMessage += "Free tier limit reached. Try again in a few minutes.";
    } else if (
      e.message.includes("demand") ||
      e.message.includes("503") ||
      e.message.includes("overloaded")
    ) {
      errorMessage += "High demand. Please wait a moment.";
    } else {
      errorMessage += "Please try again.";
    }

    updateTutorMsg(loadingId, errorMessage, "bot error");
    isProcessing = false;
  }
}

function appendTutorMsg(text, cls) {
  const box = document.getElementById("tutor-messages");
  if (!box) return null;
  const id = "tm-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "tutor-msg " + cls;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return id;
}

function updateTutorMsg(id, text, cls) {
  const div = document.getElementById(id);
  if (div) {
    div.textContent = text;
    div.className = "tutor-msg " + cls;
  }
  const box = document.getElementById("tutor-messages");
  if (box) box.scrollTop = 99999;
}

// Auto-init on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTutor);
} else {
  initTutor();
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  initTutor();
}
