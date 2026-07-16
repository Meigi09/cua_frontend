// ============================================
// C3UA — TEACHER PORTAL: MY TOPICS TAB
// Teacher marks topics as taught + files report
// Unlocks student quiz access per topic
// ============================================

let _topicsCache = [];
let _filterSubject = '';

// teacher-topics.js - Ensure subjects are loaded

async function loadMyTopics() {
    const container = document.getElementById('tt-list');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading your topics...</div>';

    try {
        const topics = await GET('/api/compliance/topic-completions/my_topics/');
        _topicsCache = topics;
        
        // Also load teacher's subjects for the filter
        await loadTeacherSubjects();
        
        populateTopicSubjectFilter();
        renderTopicList();
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}

async function loadTeacherSubjects() {
    try {
        // Get the teacher's subjects from the API
        const teacherSubjects = await GET('/api/curriculum/subjects/?teacher=true');
        // Store for later use
        window._teacherSubjects = teacherSubjects.results || teacherSubjects || [];
    } catch (e) {
        console.warn('Could not load teacher subjects:', e);
    }
}

function renderTopicList() {
    const container = document.getElementById('tt-list');
    let topics = _topicsCache;
    if (_filterSubject) topics = topics.filter(t => t.subject_name === _filterSubject);

    if (!topics.length) {
        container.innerHTML = '<div class="alert alert-info">No topics found for the selected filter. Make sure your subjects are assigned in Manage Users.</div>';
        return;
    }

    // Group by subject
    const bySubject = {};
    topics.forEach(t => {
        const k = `${t.subject_name} · ${t.class_level}`;
        if (!bySubject[k]) bySubject[k] = [];
        bySubject[k].push(t);
    });

    const confirmed = topics.filter(t => t.is_confirmed).length;
    const total     = topics.length;

    container.innerHTML = `
        <div class="alert alert-info mb-3" style="display:flex;justify-content:space-between;align-items:center;">
            <span>📊 <strong>${confirmed}</strong> of <strong>${total}</strong> topics confirmed as taught</span>
            <div style="background:var(--gray-100);border-radius:99px;height:8px;width:200px;overflow:hidden;margin-left:12px;">
                <div style="background:var(--accent);height:100%;width:${Math.round(confirmed/total*100)}%;border-radius:99px;"></div>
            </div>
        </div>
        ${Object.entries(bySubject).map(([group, items]) => `
            <div class="card mb-3">
                <div class="card-header">
                    <span class="card-title">📚 ${group}</span>
                    <span class="badge badge-${items.filter(t=>t.is_confirmed).length===items.length?'success':'warning'}">
                        ${items.filter(t=>t.is_confirmed).length}/${items.length} done
                    </span>
                </div>
                ${items.map(t => topicRow(t)).join('')}
            </div>`).join('')}`;
}

function topicRow(t) {
    const done  = t.is_confirmed;
    const color = done ? 'var(--success)' : 'var(--gray-300)';
    return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-100);">
            <div style="width:28px;height:28px;border-radius:50%;background:${color};
                        display:flex;align-items:center;justify-content:center;
                        color:white;font-size:13px;font-weight:700;flex-shrink:0;">
                ${done ? '✓' : (t.topic_code||'?')}
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;">${t.topic_name}</div>
                ${done ? `
                    <div class="text-muted text-sm">
                        ✅ Confirmed · ${t.hours_taught}h taught
                        ${t.gave_quiz ? ` · Quiz given · Class avg: ${t.class_average??'—'}%` : ''}
                        ${t.confirmed_at ? ` · ${t.confirmed_at.split('T')[0]}` : ''}
                    </div>` : '<div class="text-muted text-sm">Not yet confirmed</div>'
                }
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
                ${done
                    ? `<button class="btn btn-secondary btn-sm" onclick="openTopicReport(${t.topic_id},'${t.topic_name.replace(/'/g,"\\'")}',${t.completion_id})">📋 Edit</button>`
                    : `<button class="btn btn-primary btn-sm"   onclick="openTopicReport(${t.topic_id},'${t.topic_name.replace(/'/g,"\\'")}',${t.completion_id??'null'})">📝 Report</button>`
                }
            </div>
        </div>`;
}

// ── Topic report modal ────────────────────────────────────────────────
// teacher-topics.js - Fixed openTopicReport function

function openTopicReport(topicId, topicName, completionId) {
    const overlay = document.createElement('div');
    overlay.id = 'topic-report-overlay';
    overlay.className = 'curriculum-popup-overlay';
    overlay.innerHTML = `
        <div class="curriculum-popup" style="max-width:660px;">
            <button class="cp-close" onclick="document.getElementById('topic-report-overlay').remove()">✕</button>
            <h3 style="margin-bottom:4px;">📝 Teaching Report</h3>
            <div class="cp-meta">${topicName}</div>

            <div class="form-group">
                <label class="form-label">Date teaching started *</label>
                <input type="date" class="form-control" id="tr-start" required>
            </div>
            <div class="form-group">
                <label class="form-label">Date teaching ended *</label>
                <input type="date" class="form-control" id="tr-end" required>
            </div>
            <div class="form-group">
                <label class="form-label">Total hours taught *</label>
                <input type="number" class="form-control" id="tr-hours" min="0.5" step="0.5" placeholder="e.g. 4.5" required>
            </div>
            <div class="form-group">
                <label class="form-label">Teaching method used</label>
                <input class="form-control" id="tr-method" placeholder="e.g. Discovery activity, group work, lecture + practical">
            </div>
            <div class="form-group">
                <label class="form-label">Resources used</label>
                <input class="form-control" id="tr-resources" placeholder="e.g. REB Teacher's Guide p.32–45, graph paper, calculator">
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;">
                <input type="checkbox" id="tr-gave-quiz" onchange="document.getElementById('tr-quiz-section').style.display=this.checked?'block':'none'">
                <label for="tr-gave-quiz" class="form-label" style="margin:0;">I gave students a quiz on this topic</label>
            </div>
            <div id="tr-quiz-section" style="display:none;">
                <div class="form-group">
                    <label class="form-label">Class average score (%)</label>
                    <input type="number" class="form-control" id="tr-avg" min="0" max="100" placeholder="e.g. 72">
                </div>
                <div class="form-group">
                    <label class="form-label">Upload quiz paper (optional)</label>
                    <input type="file" class="form-control" id="tr-quiz-file" accept=".pdf,.doc,.docx">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Detailed report</label>
                <textarea class="form-control" id="tr-report" rows="5"
                    placeholder="Describe what you taught, how students responded, any challenges, what you adjusted, and evidence that learning objectives were met..."></textarea>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;background:#f0fdf4;padding:12px;border-radius:10px;border:1px solid #bbf7d0;">
                <input type="checkbox" id="tr-confirm">
                <label for="tr-confirm" style="margin:0;font-size:13px;font-weight:600;color:#166534;">
                    ✅ I confirm this topic has been fully taught — this will unlock quiz access for my students
                </label>
            </div>
            <button class="btn btn-primary btn-block" onclick="submitTopicReport(${topicId}, ${completionId === null ? 'null' : completionId})">
                💾 Save Teaching Report
            </button>
        </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Pre-fill if existing
    if (completionId && completionId !== 'null' && completionId !== null) {
        const existing = _topicsCache.find(t => t.completion_id === completionId);
        if (existing) {
            // Fetch full record for pre-fill
            GET(`/api/compliance/topic-completions/${completionId}/`)
                .then(d => {
                    const s = v => document.getElementById(v);
                    if (d.date_start) s('tr-start').value = d.date_start;
                    if (d.date_end) s('tr-end').value = d.date_end;
                    if (d.hours_taught) s('tr-hours').value = d.hours_taught;
                    if (d.teaching_method) s('tr-method').value = d.teaching_method;
                    if (d.resources_used) s('tr-resources').value = d.resources_used;
                    if (d.detailed_report) s('tr-report').value = d.detailed_report;
                    if (d.class_average) s('tr-avg').value = d.class_average;
                    if (d.gave_quiz) {
                        s('tr-gave-quiz').checked = true;
                        s('tr-quiz-section').style.display = 'block';
                    }
                    if (d.is_confirmed) s('tr-confirm').checked = true;
                })
                .catch(() => {});
        }
    }

    document.body.appendChild(overlay);
}

// teacher-topics.js - Fixed submitTopicReport function

async function submitTopicReport(topicId, completionId) {
    const fd = new FormData();
    const v = id => document.getElementById(id)?.value || '';
    const c = id => document.getElementById(id)?.checked || false;

    // Validate required fields
    if (!v('tr-start')) {
        toast('Please enter the date teaching started', 'warning');
        return;
    }
    if (!v('tr-end')) {
        toast('Please enter the date teaching ended', 'warning');
        return;
    }
    if (!v('tr-hours') || parseFloat(v('tr-hours')) <= 0) {
        toast('Please enter valid hours taught', 'warning');
        return;
    }

    // Get class level from user or from the topic data
    const classLevel = STATE.user?.class_level || 'S4';
    
    // Build the payload
    fd.append('topic', topicId);
    fd.append('class_level', classLevel);
    fd.append('date_start', v('tr-start'));
    fd.append('date_end', v('tr-end'));
    fd.append('hours_taught', v('tr-hours'));
    fd.append('teaching_method', v('tr-method') || 'Lecture and Practice');
    fd.append('resources_used', v('tr-resources') || 'REB Teacher\'s Guide');
    fd.append('gave_quiz', c('tr-gave-quiz') ? 'true' : 'false');
    fd.append('class_average', v('tr-avg') || '');
    fd.append('detailed_report', v('tr-report') || 'Topic taught according to CBC curriculum requirements.');
    fd.append('is_confirmed', c('tr-confirm') ? 'true' : 'false');

    const quizFile = document.getElementById('tr-quiz-file')?.files[0];
    if (quizFile) fd.append('quiz_file', quizFile);

    const btn = document.querySelector('#topic-report-overlay .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        let url, method;
        if (completionId && completionId !== 'null' && completionId !== null) {
            url = `${CONFIG.API}/api/compliance/topic-completions/${completionId}/`;
            method = 'PATCH';
        } else {
            url = `${CONFIG.API}/api/compliance/topic-completions/`;
            method = 'POST';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${STATE.token}`,
                // Don't set Content-Type - FormData will set it with boundary
            },
            body: fd,
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Log the error details for debugging
            console.error('Server error response:', responseData);
            
            // Build a user-friendly error message
            let errorMsg = 'Failed to save report. ';
            if (responseData.detail) {
                errorMsg += responseData.detail;
            } else if (responseData.error) {
                errorMsg += responseData.error;
            } else if (responseData.non_field_errors) {
                errorMsg += responseData.non_field_errors.join(', ');
            } else {
                // Check for field-specific errors
                const fieldErrors = Object.entries(responseData)
                    .filter(([key]) => key !== 'non_field_errors')
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('; ');
                if (fieldErrors) {
                    errorMsg += fieldErrors;
                } else {
                    errorMsg += 'Please check all fields and try again.';
                }
            }
            throw new Error(errorMsg);
        }

        toast(c('tr-confirm') ? '✅ Topic confirmed — students can now quiz on it!' : '📋 Report saved successfully!', 'success');
        
        // Close the modal
        document.getElementById('topic-report-overlay')?.remove();
        
        // Refresh the topics list
        await loadMyTopics();
        
        // Also refresh the quiz activity
        loadStudentQuizActivity();

    } catch (e) {
        console.error('Submit error:', e);
        toast(e.message || 'An error occurred saving the report', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '💾 Save Teaching Report'; }
    }
}

// ── Teacher quiz monitoring ─────────────────────────────────────────
async function loadStudentQuizActivity() {
    const container = document.getElementById('tt-quiz-activity');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const data = await GET('/api/assessment/sessions/');
        const sessions = data.results || data || [];

        if (!sessions.length) {
            container.innerHTML = '<div class="text-muted text-sm">No student quiz activity yet.</div>';
            return;
        }

        // Group by student
        const byStudent = {};
        sessions.forEach(s => {
            const name = s.student_name || `Student ${s.student}`;
            if (!byStudent[name]) byStudent[name] = [];
            byStudent[name].push(s);
        });

        container.innerHTML = Object.entries(byStudent).map(([student, sess]) => {
            const graded = sess.filter(s => s.status === 'graded');
            const avg    = graded.length
                ? Math.round(graded.reduce((s,x) => s+parseFloat(x.percentage||0), 0) / graded.length)
                : null;
            return `
                <div style="display:flex;justify-content:space-between;align-items:center;
                            padding:10px 0;border-bottom:1px solid var(--gray-100);">
                    <div>
                        <div style="font-weight:600;font-size:13px;">${student}</div>
                        <div class="text-muted text-sm">${graded.length} quiz${graded.length!==1?'zes':''} completed</div>
                    </div>
                    ${avg !== null ? `
                        <div style="text-align:right;">
                            <div style="font-size:20px;font-weight:800;
                                        color:${avg>=75?'var(--success)':avg>=50?'var(--warning)':'var(--danger)'};">${avg}%</div>
                            <div class="text-muted text-sm">avg score</div>
                        </div>` : '<div class="text-muted text-sm">No graded quizzes</div>'
                    }
                </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">⚠️ ${e.message}</div>`;
    }
}
