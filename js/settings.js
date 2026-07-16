// ============================================
// C3UA — SETTINGS TAB
// Loaded by: dashboard.html
// ============================================

function saveSettings() {
    const url = document.getElementById('settings-api-url').value.trim();
    CONFIG.API = url;
    try { localStorage.setItem('c3ua_api_url', url); } catch (e) {}
    toast('Settings saved', 'success');
}
