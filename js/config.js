// ============================================
// C3UA — CONFIG, STATE & API HELPERS
// Loaded by: login.html, dashboard.html
// ============================================

const CONFIG = {
    API: localStorage.getItem('c3ua_api_url') || 'http://localhost:8000',
    NESA_DATE: new Date('2026-06-30T08:00:00'),
};

const STATE = {
    token: null,
    refresh: null,
    user: null,
    role: 'admin',
    guidesInterval: null,
    allSubjects: [],   // flat list of {id, name} from /api/curriculum/subjects/
    curriculumTree: [], // [{id, name, code, grades:[{id, name, class_code, subjects:[{id,name}]}]}]
};

// Restore session (if any) as soon as this file loads, so every page
// that includes it immediately knows whether someone is signed in.
(function restoreSession() {
    try {
        const saved = localStorage.getItem('c3ua_session');
        if (saved) {
            const { token, refresh, user } = JSON.parse(saved);
            if (token && user) {
                STATE.token = token;
                STATE.refresh = refresh;
                STATE.user = user;
                STATE.role = user.role || 'admin';
            }
        }
    } catch (e) { /* ignore corrupt session */ }
})();

async function apiCall(path, options = {}) {
    const url = CONFIG.API + path;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (STATE.token) headers['Authorization'] = 'Bearer ' + STATE.token;
    if (options.body instanceof FormData) delete headers['Content-Type'];

    try {
        let response = await fetch(url, { ...options, headers });
        if (response.status === 401 && STATE.refresh) {
            const refreshRes = await fetch(CONFIG.API + '/api/auth/refresh/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: STATE.refresh }),
            });
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                STATE.token = data.access;
                headers['Authorization'] = 'Bearer ' + STATE.token;
                response = await fetch(url, { ...options, headers });
            } else if (typeof doLogout === 'function') {
                doLogout();
                return null;
            }
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || error.message || 'Request failed');
        }
        if (response.status === 204) return {};
        return await response.json();
    } catch (e) {
        throw new Error(e.message || 'Cannot reach server');
    }
}

const GET = (path, params = {}) => {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params) : '';
    return apiCall(path + qs, { method: 'GET' });
};
const POST = (path, data) => apiCall(path, {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
});
const PUT = (path, data) => apiCall(path, { method: 'PUT', body: JSON.stringify(data) });
const PATCH = (path, data) => apiCall(path, { method: 'PATCH', body: JSON.stringify(data) });
const DELETE = (path) => apiCall(path, { method: 'DELETE' });

// ============================================
// SHARED UI HELPERS — used across all portals
// ============================================

// Color helpers (used in tables, pacing, scores)
function scoreColor(pct) {
    const v = parseFloat(pct) || 0;
    if (v >= 75) return 'var(--success)';
    if (v >= 50) return 'var(--warning)';
    return 'var(--danger)';
}
function paceColor(days) {
    const v = parseFloat(days) || 0;
    if (v >= 0)   return 'var(--success)';
    if (v >= -7)  return 'var(--warning)';
    return 'var(--danger)';
}
function paceLabel(days) {
    const v = parseFloat(days) || 0;
    if (v >= 3)   return `${v} days ahead`;
    if (v >= -3)  return 'On track';
    if (v >= -10) return `${Math.abs(v)} days behind`;
    return `${Math.abs(v)} days — Critical`;
}
function fmtPct(val) {
    const v = parseFloat(val);
    return isNaN(v) ? '—' : v.toFixed(1) + '%';
}

// Bar chart renderer for dashboard coverage cards
function renderBars(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!data || !data.length) {
        el.innerHTML = '<div class="text-muted text-sm">No coverage data yet.</div>';
        return;
    }
    el.innerHTML = data.map(d => {
        const cov = Math.round(parseFloat(d.covered) || 0);
        const exp = Math.round(parseFloat(d.expected) || 82);
        const color = cov >= exp ? 'var(--success)' : cov >= exp * 0.85 ? 'var(--warning)' : 'var(--danger)';
        return `
            <div style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                    <span style="font-weight:600;">${d.name}</span>
                    <span class="text-muted">Exp:${exp}% <strong style="color:${color};">${cov}%</strong></span>
                </div>
                <div style="background:var(--gray-100);height:7px;border-radius:99px;overflow:hidden;position:relative;">
                    <div style="background:var(--gray-300);height:100%;width:${exp}%;border-radius:99px;position:absolute;top:0;left:0;"></div>
                    <div style="background:${color};height:100%;width:${cov}%;border-radius:99px;position:absolute;top:0;left:0;transition:width 0.5s ease;"></div>
                </div>
            </div>`;
    }).join('');
}