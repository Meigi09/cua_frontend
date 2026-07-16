// ============================================
// C3UA — STUDENT PORTAL: SIMULATION TAB
// Loaded by: student-dashboard.html
// ============================================

let simSession = null;       // { session_id, questions, duration_mins, started_at }
let simTimerInterval = null;

// ---- load available published past-paper / simulation assessments ----
async function loadSimulationList() {
    const container = document.getElementById('sim-list');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
      const myClass = STATE.user?.class_level;
      // to:
      const data = await GET("/api/assessment/assessments/", {
        type: "nesa_past",
        is_published: true,
      });
      const items = data.results || data || [];
      if (!items.length) {
        container.innerHTML =
          '<div class="alert alert-info">No simulations available yet — your teacher will upload past papers for you to practice with.</div>';
        return;
      }
      container.innerHTML = items
        .map(
          (a) => `
            <div class="card mb-2" style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:600;">${a.title}</div>
                    <div class="text-muted text-sm">
                        ${a.question_count || "?"} question(s) &nbsp;·&nbsp;
                        ⏱ ${a.duration_mins ? a.duration_mins + " min" : "No time limit"}
                    </div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="startSimulation(${a.id})">Start Exam</button>
            </div>
        `,
        )
        .join("");
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}

// ---- start a timed simulation session ----
async function startSimulation(assessmentId) {
    const area = document.getElementById('sim-area');
    const listCard = document.getElementById('sim-list-card');
    area.innerHTML = '<div class="loading"><div class="spinner"></div>Starting exam session...</div>';

    try {
        const data = await POST('/api/assessment/adaptive/start_simulation/', { assessment_id: assessmentId });
        if (data.error) { toast(data.error, 'warning'); return; }
        simSession = data;
        listCard.style.display = 'none';
        renderSimulation();
    } catch (e) {
        area.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}

// ---- render the exam UI ----
function renderSimulation() {
    if (!simSession) return;
    const area = document.getElementById('sim-area');
    const qs = simSession.questions || [];

    area.innerHTML = `
        <!-- header bar with countdown -->
        <div class="card mb-3" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;">
            <div style="font-weight:700;font-size:16px;">${simSession.title || 'Exam Simulation'}</div>
            <div style="display:flex;gap:16px;align-items:center;">
                <div class="text-muted text-sm">${qs.length} questions · ${simSession.total_marks} marks</div>
                ${simSession.duration_mins ? `
                    <div id="sim-timer" style="font-size:20px;font-weight:800;color:var(--primary);min-width:64px;text-align:right;">
                        ${formatCountdown(simSession.duration_mins * 60)}
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- questions -->
        ${qs.map((q, i) => `
            <div class="card mb-3" data-qid="${q.id}">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-weight:600;">${i + 1}. ${q.text}</span>
                    <span class="badge badge-info">${q.marks} mk${q.marks !== 1 ? 's' : ''}</span>
                </div>
                ${q.type === 'mcq' && q.options?.length
                    ? q.options.map((opt, idx) => `
                        <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:14px;cursor:pointer;">
                            <input type="radio" name="sim-q-${q.id}" value="${idx}">
                            <span>${String.fromCharCode(65 + idx)}. ${opt}</span>
                        </label>
                    `).join('')
                    : `<textarea class="form-control mt-2" name="sim-q-${q.id}" rows="3" placeholder="Write your answer here..."></textarea>`
                }
            </div>
        `).join('')}

        <div class="card" style="text-align:center;padding:16px;">
            <button class="btn btn-primary" style="min-width:200px;" onclick="submitSimulation()">
                ✅ Submit Exam
            </button>
            <div class="text-muted text-sm mt-2">Once submitted your answers cannot be changed.</div>
        </div>
    `;

    // start countdown timer
    if (simSession.duration_mins) {
        startCountdown(simSession.duration_mins * 60);
    }
}

// ---- countdown timer ----
function formatCountdown(secondsLeft) {
    if (secondsLeft < 0) secondsLeft = 0;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startCountdown(totalSeconds) {
    if (simTimerInterval) clearInterval(simTimerInterval);
    const deadline = Date.now() + totalSeconds * 1000;

    simTimerInterval = setInterval(() => {
        const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        const timerEl = document.getElementById('sim-timer');
        if (!timerEl) { clearInterval(simTimerInterval); return; }

        timerEl.textContent = formatCountdown(left);

        // turn red in final 5 minutes
        if (left <= 300) timerEl.style.color = 'var(--danger)';

        // auto-submit when time runs out
        if (left === 0) {
            clearInterval(simTimerInterval);
            toast('Time is up — submitting automatically', 'warning');
            submitSimulation(true);
        }
    }, 1000);
}

// ---- collect answers and submit ----
async function submitSimulation(autoSubmit = false) {
    if (!simSession) return;
    if (!autoSubmit) {
        const confirmed = confirm('Are you sure you want to submit your exam? This cannot be undone.');
        if (!confirmed) return;
    }
    clearInterval(simTimerInterval);

    const answers = simSession.questions.map(q => {
        if (q.type === 'mcq') {
            const checked = document.querySelector(`input[name="sim-q-${q.id}"]:checked`);
            return { question_id: q.id, answer_idx: checked ? Number(checked.value) : null };
        }
        const ta = document.querySelector(`textarea[name="sim-q-${q.id}"]`);
        return { question_id: q.id, answer_text: ta ? ta.value : '' };
    });

    const area = document.getElementById('sim-area');
    area.innerHTML = '<div class="loading"><div class="spinner"></div>Grading...</div>';

    try {
        const result = await POST('/api/assessment/adaptive/submit/', {
            session_id: simSession.session_id,
            answers,
        });
        if (result.error) {
            area.innerHTML = `<div class="alert alert-warning">${result.error}</div>`;
            return;
        }
        simSession = null;
        renderSimResult(result);
    } catch (e) {
        area.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}

// ---- results screen ----
function renderSimResult(result) {
    const area = document.getElementById('sim-area');
    const listCard = document.getElementById('sim-list-card');
    area.innerHTML = `
        <div class="card text-center mb-3">
            <div style="font-size:44px;margin-bottom:8px;">${result.passed ? '🎉' : '💪'}</div>
            <div style="font-size:32px;font-weight:800;color:${result.passed ? 'var(--success)' : 'var(--warning)'};">
                ${result.percentage}%
            </div>
            <div class="text-muted">${result.total_score} / ${result.max_score} marks</div>
            <div class="alert ${result.passed ? 'alert-success' : 'alert-warning'} mt-3">
                ${result.passed ? 'Well done — you passed the simulation!' : 'Keep practising — review the topics below and try again.'}
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header"><span class="card-title">Score by Topic</span></div>
            ${Object.entries(result.topic_scores || {}).map(([tid, pct]) => `
                <div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:13px;">
                        <span>Topic #${tid}</span>
                        <span style="font-weight:600;">${pct}%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar ${pct >= 75 ? 'green' : pct >= 50 ? 'yellow' : 'red'}" style="width:${pct}%"></div>
                    </div>
                </div>
            `).join('') || '<div class="text-muted text-sm">No per-topic breakdown available.</div>'}
        </div>

        <button class="btn btn-secondary btn-block" onclick="resetSimulation()">← Back to exam list</button>
    `;
}

function resetSimulation() {
    simSession = null;
    clearInterval(simTimerInterval);
    document.getElementById('sim-area').innerHTML = '';
    document.getElementById('sim-list-card').style.display = '';
    loadSimulationList();
}
