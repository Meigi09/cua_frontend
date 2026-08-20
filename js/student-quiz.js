// ============================================
// C3UA — STUDENT QUIZ v2 (Gamified)
// ============================================

let currentQuiz = null;
let quizState = { qIndex: 0, score: 0, streak: 0, xp: 0, answers: [] };

/* ---- init ---- */
// student-quiz.js - Fixed initQuizFilters function

// student-quiz.js - Updated with better subject filtering

function initQuizFilters() {
    const subjectEl = document.getElementById("quiz-subject");
    if (!subjectEl || subjectEl.dataset.wired) return;
    
    // Get the student's class level and stream
    const classLevel = STATE.user?.class_level || '';
    const stream = STATE.user?.stream || '';
    
    // Get subjects for the student's class level
    const subjects = getSubjectsFor(null, classLevel);
    
    if (!subjects.length) {
        setTimeout(initQuizFilters, 300);
        return;
    }
    
    // Filter subjects based on the student's stream
    const filteredSubjects = filterSubjectsByStream(subjects, stream, classLevel);
    
    subjectEl.innerHTML = 
        '<option value="">Select a subject...</option>' +
        filteredSubjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
    
    subjectEl.addEventListener("change", loadQuizTopics);
    subjectEl.dataset.wired = "1";
}

// Helper function to filter subjects by stream
function filterSubjectsByStream(subjects, stream, classLevel) {
    // If no stream is set, return all subjects for the class level
    if (!stream) return subjects;
    
    // Define subject combinations for each stream (A-Level)
    const streamSubjects = {
        'HEG': ['History', 'Economics', 'Geography', 'General Studies', 'English', 'Kinyarwanda', 'French', 'Kiswahili', 'Literature in English', 'Entrepreneurship'],
        'PCB': ['Physics', 'Chemistry', 'Biology', 'Advanced Mathematics', 'English', 'Kinyarwanda', 'General Studies', 'Entrepreneurship'],
        'PCM': ['Physics', 'Chemistry', 'Advanced Mathematics', 'English', 'Kinyarwanda', 'General Studies', 'Entrepreneurship'],
        'MCE': ['Mathematics', 'Chemistry', 'Economics', 'English', 'Kinyarwanda', 'General Studies', 'Entrepreneurship'],
        'MPC': ['Mathematics', 'Physics', 'Chemistry', 'English', 'Kinyarwanda', 'General Studies', 'Entrepreneurship'],
        'MEG': ['Mathematics', 'Economics', 'Geography', 'English', 'Kinyarwanda', 'General Studies', 'Entrepreneurship'],
        'BCG': ['Biology', 'Chemistry', 'Geography', 'English', 'Kinyarwanda', 'General Studies', 'Entrepreneurship'],
        'LFK': ['Literature in English', 'French', 'Kinyarwanda', 'English', 'General Studies', 'Entrepreneurship'],
        'LKK': ['Literature in English', 'Kinyarwanda', 'Kiswahili', 'English', 'General Studies', 'Entrepreneurship'],
        'LKF': ['Literature in English', 'Kinyarwanda', 'French', 'English', 'General Studies', 'Entrepreneurship'],
        // Add more combinations as needed
    };
    
    // Also check for combination patterns like S6_HEG, S6_ANP, etc.
    let streamKey = stream.toUpperCase();
    // Remove S6_ prefix if present
    if (streamKey.startsWith('S6_')) {
        streamKey = streamKey.replace('S6_', '');
    }
    
    let allowedSubjects = [];
    
    // Check if stream is in our mapping
    if (streamSubjects[streamKey]) {
        allowedSubjects = streamSubjects[streamKey];
    } else {
        // Try to match by partial string
        for (const [key, subjects] of Object.entries(streamSubjects)) {
            if (streamKey.includes(key) || key.includes(streamKey)) {
                allowedSubjects = subjects;
                break;
            }
        }
    }
    
    // If we found allowed subjects, filter
    if (allowedSubjects.length > 0) {
        return subjects.filter(s => 
            allowedSubjects.some(allowed => 
                s.name.toLowerCase().includes(allowed.toLowerCase()) ||
                allowed.toLowerCase().includes(s.name.toLowerCase())
            )
        );
    }
    
    // Fallback: If no mapping found, try to infer from stream name
    const streamLower = stream.toLowerCase();
    if (streamLower.includes('heg') || streamLower.includes('humanities')) {
        return subjects.filter(s => 
            ['history', 'economics', 'geography', 'general studies', 'english', 'kinyarwanda', 'french', 'kiswahili', 'literature', 'entrepreneurship']
                .some(keyword => s.name.toLowerCase().includes(keyword))
        );
    }
    if (streamLower.includes('pcb') || streamLower.includes('sciences') || streamLower.includes('biology')) {
        return subjects.filter(s => 
            ['physics', 'chemistry', 'biology', 'advanced mathematics', 'general studies', 'english', 'entrepreneurship']
                .some(keyword => s.name.toLowerCase().includes(keyword))
        );
    }
    if (streamLower.includes('pcm')) {
        return subjects.filter(s => 
            ['physics', 'chemistry', 'advanced mathematics', 'general studies', 'english', 'entrepreneurship']
                .some(keyword => s.name.toLowerCase().includes(keyword))
        );
    }
    if (streamLower.includes('mce')) {
        return subjects.filter(s => 
            ['mathematics', 'chemistry', 'economics', 'english', 'general studies', 'entrepreneurship']
                .some(keyword => s.name.toLowerCase().includes(keyword))
        );
    }
    if (streamLower.includes('meg') || streamLower.includes('geography')) {
        return subjects.filter(s => 
            ['mathematics', 'economics', 'geography', 'english', 'general studies', 'entrepreneurship']
                .some(keyword => s.name.toLowerCase().includes(keyword))
        );
    }
    
    // Return all subjects if we can't determine
    return subjects;
}

async function loadQuizTopics() {
    const subjectId = document.getElementById("quiz-subject").value;
    const topicEl = document.getElementById("quiz-topic");
    topicEl.innerHTML = '<option value="">All topics</option>';
    
    if (!subjectId) {
        // If no subject selected, show all topics for the student's class and stream
        const classLevel = STATE.user?.class_level || '';
        const stream = STATE.user?.stream || '';
        
        try {
            let url = `/api/curriculum/topics/?class_level=${classLevel}&page_size=100`;
            
            // If stream is HEG, filter to only relevant subjects
            if (stream && stream.toUpperCase().includes('HEG')) {
                // Get subjects for HEG stream
                const subjects = getSubjectsFor(null, classLevel);
                const hegSubjects = filterSubjectsByStream(subjects, stream, classLevel);
                const subjectIds = hegSubjects.map(s => s.id).join(',');
                if (subjectIds) {
                    url += `&subject_id__in=${subjectIds}`;
                }
            }
            
            const data = await GET(url);
            const topics = data.results || data || [];
            
            // Further filter topics for HEG stream
            let filteredTopics = topics;
            if (stream && stream.toUpperCase().includes('HEG')) {
                const hegSubjectIds = filterSubjectsByStream(
                    getSubjectsFor(null, classLevel), 
                    stream, 
                    classLevel
                ).map(s => s.id);
                filteredTopics = topics.filter(t => hegSubjectIds.includes(t.subject));
            }
            
            topicEl.innerHTML = '<option value="">All topics</option>' +
                filteredTopics.map((t) => 
                    `<option value="${t.id}">${t.topic_code || ''}. ${t.topic_name}</option>`
                ).join('');
        } catch (e) {
            console.error('Error loading topics:', e);
        }
        return;
    }
    
    try {
        const classLevel = STATE.user?.class_level || '';
        const data = await GET(
            `/api/curriculum/topics/?subject=${subjectId}&class_level=${classLevel}&page_size=100`
        );
        const topics = data.results || data || [];
        topicEl.innerHTML += topics
            .map((t) => 
                `<option value="${t.id}">${t.topic_code || ''}. ${t.topic_name}</option>`
            ).join('');
    } catch (e) {
        console.error('Error loading topics:', e);
        toast('Could not load topics for this subject', 'warning');
    }
}

async function generateQuiz() {
    const subjectId = document.getElementById("quiz-subject").value;
    const topicId = document.getElementById("quiz-topic").value;
    const area = document.getElementById("quiz-area");
    
    if (!subjectId) {
        toast("Please select a subject first", "warning");
        return;
    }

    area.innerHTML =
        '<div class="loading"><div class="spinner"></div>Building your quiz...</div>';
    
    try {
        const payload = { 
            subject_id: subjectId, 
            n_questions: 10 
        };
        
        // Add class level and stream for better topic filtering
        payload.class_level = STATE.user?.class_level || '';
        payload.stream = STATE.user?.stream || '';
        
        if (topicId) payload.topic_id = topicId;
        
        const data = await POST("/api/assessment/adaptive/generate/", payload);
        
        if (data.error) {
            const isGated =
                data.error.includes("No questions") ||
                data.error.includes("No curriculum") ||
                data.error.includes("teacher has not yet confirmed");
            
            area.innerHTML = `
                <div class="alert ${isGated ? "alert-warning" : "alert-info"}">
                    ${isGated
                        ? "⏳ Your teacher has not yet confirmed this topic as taught. Quizzes unlock once your teacher marks the topic as complete."
                        : data.error
                    }
                </div>`;
            return;
        }
        
        currentQuiz = data;
        quizState = { qIndex: 0, score: 0, streak: 0, xp: 0, answers: [] };
        renderQuestion();
        
    } catch (e) {
        area.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
    }
}

/* ---- render one question at a time ---- */
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  const qs = currentQuiz.questions || [];
  const i = quizState.qIndex;
  if (i >= qs.length) {
    submitQuiz();
    return;
  }
  const q = qs[i];
  const pct = Math.round((i / qs.length) * 100);

  area.innerHTML = `
        <!-- progress bar + badges -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="text-muted text-sm">Question ${i + 1} of ${qs.length}</span>
            <div style="display:flex;gap:8px;">
                <span class="quiz-xp"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">star</span> ${quizState.xp} XP</span>
                ${quizState.streak >= 2 ? `<span class="quiz-streak"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">local_fire_department</span> ${quizState.streak} streak</span>` : ""}
            </div>
        </div>
        <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>

        <!-- question card -->
        <div class="card mb-3 pop-in" style="border-left:4px solid var(--primary);">
            <div style="font-weight:700;font-size:15px;margin-bottom:16px;line-height:1.5;">${q.text}</div>
            ${
              q.type === "mcq" && q.options?.length
                ? q.options
                    .map(
                      (opt, idx) =>
                        `<button class="quiz-option-btn" onclick="selectOption(this,${q.id},${idx})" data-idx="${idx}">
                        <span style="font-weight:700;margin-right:10px;color:var(--primary);">${String.fromCharCode(65 + idx)}.</span>${opt}
                     </button>`,
                    )
                    .join("")
                : `<textarea class="form-control mt-2" id="qa-text-${q.id}" rows="3" placeholder="Write your answer..."></textarea>`
            }
        </div>
        <div id="quiz-feedback" style="display:none;" class="mb-3"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="text-muted text-sm">${q.marks} mark${q.marks !== 1 ? "s" : ""}</span>
            <button id="quiz-next-btn" class="btn btn-primary" style="display:none;" onclick="nextQuestion()">
                ${i + 1 < qs.length ? "Next <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">arrow_forward</span>" : "Finish Quiz"}
            </button>
        </div>
    `;
}

function selectOption(btn, questionId, idx) {
  // Disable all options once one is selected
  document
    .querySelectorAll(".quiz-option-btn")
    .forEach((b) => (b.onclick = null));
  btn.classList.add("selected");

  const q = currentQuiz.questions[quizState.qIndex];
  const isCorrect = idx === q.correct_idx;

  // Mark correct/wrong visually
  if (q.correct_idx != null) {
    document.querySelectorAll(".quiz-option-btn").forEach((b) => {
      if (parseInt(b.dataset.idx) === q.correct_idx) b.classList.add("correct");
    });
    if (!isCorrect) btn.classList.add("wrong");
  }

  // XP and streak
  if (isCorrect) {
    quizState.score += q.marks || 1;
    quizState.streak += 1;
    quizState.xp += quizState.streak >= 3 ? 15 : 10;
  } else {
    quizState.streak = 0;
  }

  quizState.answers.push({ question_id: questionId, answer_idx: idx });

  const feedbackEl = document.getElementById("quiz-feedback");
  feedbackEl.style.display = "block";
  if (isCorrect) {
    feedbackEl.innerHTML = `<div class="alert alert-success pop-in"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">check_circle</span> Correct! ${quizState.streak >= 2 ? `<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">local_fire_department</span> ${quizState.streak}x streak!` : ""} +${quizState.streak >= 3 ? 15 : 10} XP</div>`;
  } else {
    feedbackEl.innerHTML = `<div class="alert alert-warning pop-in"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">cancel</span> Not quite — the correct answer is highlighted above.${q.explanation ? `<br><small>${q.explanation}</small>` : ""}</div>`;
  }
  document.getElementById("quiz-next-btn").style.display = "inline-block";
}

function nextQuestion() {
  quizState.qIndex++;
  renderQuestion();
}

/* ---- submit and show results ---- */
async function submitQuiz() {
  if (!currentQuiz) return;
  const area = document.getElementById("quiz-area");
  area.innerHTML =
    '<div class="loading"><div class="spinner"></div>Grading...</div>';

  // Fill in any unanswered essay questions
  const qs = currentQuiz.questions || [];
  qs.forEach((q) => {
    if (!quizState.answers.find((a) => a.question_id === q.id)) {
      if (q.type !== "mcq") {
        const ta = document.querySelector(`#qa-text-${q.id}`);
        quizState.answers.push({
          question_id: q.id,
          answer_text: ta?.value || "",
        });
      } else {
        quizState.answers.push({ question_id: q.id, answer_idx: null });
      }
    }
  });

  try {
    const result = await POST("/api/assessment/adaptive/submit/", {
      session_id: currentQuiz.session_id,
      answers: quizState.answers,
    });
    if (result.error) {
      area.innerHTML = `<div class="alert alert-warning">${result.error}</div>`;
      return;
    }
    renderQuizResult(result);
    currentQuiz = null;
  } catch (e) {
    area.innerHTML = `<div class="alert alert-warning"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">warning</span> ${e.message}</div>`;
  }
}

function renderQuizResult(result) {
  const area = document.getElementById("quiz-area");
  const pct = result.percentage || 0;
  const rank =
    pct >= 90
      ? { label: "S Rank", icon: "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">emoji_events</span>", color: "#d97706" }
      : pct >= 75
        ? { label: "A Rank", icon: "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">workspace_premium</span>", color: "#4f46e5" }
        : pct >= 60
          ? { label: "B Rank", icon: "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">workspace_premium</span>", color: "#059669" }
          : pct >= 40
            ? { label: "C Rank", icon: "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">workspace_premium</span>", color: "#718096" }
            : { label: "Try Again", icon: "<span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">fitness_center</span>", color: "#dc2626" };

  area.innerHTML = `
        <div class="card text-center pop-in" style="padding:32px 24px;">
            <div style="font-size:56px;margin-bottom:8px;">${rank.icon}</div>
            <div style="font-size:13px;font-weight:700;color:${rank.color};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${rank.label}</div>
            <div style="font-size:48px;font-weight:800;color:${rank.color};line-height:1;">${pct}%</div>
            <div class="text-muted" style="margin:6px 0 16px;">${result.total_score} / ${result.max_score} marks</div>
            <div style="display:flex;justify-content:center;gap:12px;margin-bottom:16px;">
                <span class="quiz-xp"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">star</span> ${quizState.xp} XP earned</span>
                ${quizState.streak >= 3 ? `<span class="quiz-streak"><span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">local_fire_department</span> Best streak: ${quizState.streak}</span>` : ""}
            </div>
            <div class="alert ${result.passed ? "alert-success" : "alert-warning"}">
                ${result.passed ? "Great work — your mastery records have been updated!" : "Keep practising — review the topics below."}
            </div>
        </div>

        ${
          Object.keys(result.topic_scores || {}).length
            ? `
        <div class="card mt-3">
            <div class="card-header"><span class="card-title">Score by Topic</span></div>
            ${Object.entries(result.topic_scores)
              .map(
                ([tid, pct]) => `
                <div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:13px;">
                        <span>Topic #${tid}</span><span style="font-weight:700;">${pct}%</span>
                    </div>
                    <div class="progress"><div class="progress-bar ${pct >= 75 ? "green" : pct >= 50 ? "yellow" : "red"}" style="width:${pct}%"></div></div>
                </div>
            `,
              )
              .join("")}
        </div>`
            : ""
        }

        <button class="btn btn-secondary btn-block mt-3" onclick="document.getElementById('quiz-area').innerHTML='';currentQuiz=null;">
            <span class=\"material-symbols-outlined ui-icon\" aria-hidden=\"true\">arrow_back</span> Try Another Quiz
        </button>
    `;
}
