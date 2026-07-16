// ============================================
// C3UA — REB SYNC
// Loaded by: dashboard.html
// ============================================

async function triggerRebSync() {
    const btn = document.querySelector('[onclick="triggerRebSync()"]');
    try {
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Syncing...'; }
        toast('Triggering REB sync...', 'info');
        await POST('/api/curriculum/topics/trigger_sync/', {});
        toast('Sync triggered! This may take a few minutes.', 'success');
        let attempts = 0;
        const check = setInterval(async () => {
            attempts++;
            try {
                const topics = await GET('/api/curriculum/topics/', { page_size: 1 });
                if (topics.count > 0 || attempts > 30) {
                    clearInterval(check);
                    if (btn) { btn.disabled = false; btn.textContent = '⟳ Sync REB'; }
                    toast('Sync complete!', 'success');
                    await loadCurriculumTree();
                    loadCurriculumData();
                    fetchGuideStats();
                }
            } catch (e) {}
        }, 2000);
        setTimeout(() => { clearInterval(check); if (btn) { btn.disabled = false; btn.textContent = '⟳ Sync REB'; } }, 60000);
    } catch (e) {
        toast('Sync failed: ' + e.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '⟳ Sync REB'; }
    }
}
