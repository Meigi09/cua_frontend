// ============================================
// C3UA — INLINE SVG ICON SYSTEM
// Replaces the Google-Fonts-hosted Material Symbols ligature font.
//
// Why: a ligature web font depends on the icon-name TEXT rendering as a
// glyph only once the remote font file has loaded. On a slow or blocked
// connection (a real risk on school networks, and an unacceptable risk
// for a live hackathon demo), the fallback is literally the raw icon
// name ("warning", "arrow_back"...) shown as text. Inline SVG has no
// network dependency at all — it works offline, on any connection, in
// any browser, every time.
//
// How it works: every icon is still written in HTML/JS as
//   <span class="material-symbols-outlined ui-icon" aria-hidden="true">warning</span>
// exactly as before — nothing in the other 23 JS files needs to change,
// which matters because a previous blind find/replace across those files
// broke several of them. Instead, a MutationObserver watches the whole
// page and swaps the icon name text for real SVG markup the instant such
// a span appears anywhere in the DOM, including inside dynamically
// rendered tab content.
// ============================================

const ICONS = {
  account_balance: '<path d="M4 21h16"/><path d="M6 21V10"/><path d="M10 21V10"/><path d="M14 21V10"/><path d="M18 21V10"/><path d="M2 10l10-6 10 6"/>',
  apartment: '<rect x="5" y="3" width="14" height="18"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/><path d="M10 21v-4h4v4"/>',
  arrow_back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  arrow_forward: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  arrow_upward: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  arrow_downward: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  assignment: '<rect x="5" y="4" width="14" height="17" rx="1"/><rect x="9" y="2" width="6" height="4" rx="1"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="16" y2="15"/>',
  attach_file: '<path d="M17 7v10a4 4 0 0 1-8 0V6a2.5 2.5 0 0 1 5 0v10a1 1 0 0 1-2 0V8"/>',
  bar_chart: '<line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="19" y1="20" x2="19" y2="9"/>',
  calendar_month: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
  call: '<path d="M6 3h4l1 5-2.5 1.5a12 12 0 0 0 6 6L16 14l5 1v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
  campaign: '<path d="M4 10v4h3l6 4V6L7 10H4z"/><path d="M15 9a3 3 0 0 1 0 6"/><path d="M18 6a7 7 0 0 1 0 12"/>',
  cancel: '<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
  casino: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="12" cy="12" r="1"/>',
  celebration: '<path d="M4 20l4-11 3 3-11 4z"/><path d="M13 4l1.5 3L18 8.5 15 10 13.5 13 12 10 9 8.5 12 7z"/><line x1="17" y1="14" x2="19" y2="16"/>',
  cell_tower: '<line x1="12" y1="2" x2="12" y2="22"/><path d="M8 6a5 5 0 0 0 0 6"/><path d="M16 6a5 5 0 0 1 0 6"/><path d="M5 3a9 9 0 0 0 0 12"/><path d="M19 3a9 9 0 0 1 0 12"/><circle cx="12" cy="9" r="1.5"/>',
  chat: '<path d="M4 4h16v11H8l-4 4z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  check_box: '<rect x="4" y="4" width="16" height="16" rx="2"/><polyline points="8 12 11 15 16 9"/>',
  check_circle: '<circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  dashboard: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  delete: '<polyline points="4 7 20 7"/><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/><path d="M9 7V4h6v3"/>',
  description: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><line x1="9" y1="12" x2="16" y2="12"/><line x1="9" y1="16" x2="16" y2="16"/>',
  download: '<line x1="12" y1="3" x2="12" y2="14"/><polyline points="7 10 12 15 17 10"/><path d="M4 18h16"/>',
  edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><line x1="14" y1="7" x2="17" y2="10"/>',
  edit_note: '<path d="M5 3h9v6h6v12H5z"/><path d="M14 3l6 6"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="17" x2="13" y2="17"/>',
  emoji_events: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 5H5a3 3 0 0 0 3 5"/><path d="M16 5h3a3 3 0 0 1-3 5"/><line x1="12" y1="14" x2="12" y2="18"/><path d="M8 21h8"/><path d="M9 18h6l1 3H8z"/>',
  explore: '<circle cx="12" cy="12" r="9"/><polygon points="15 9 13 13 9 15 11 11"/>',
  fact_check: '<rect x="4" y="3" width="16" height="18" rx="1"/><polyline points="7 8 8.5 9.5 11 7"/><line x1="13" y1="8" x2="17" y2="8"/><polyline points="7 14 8.5 15.5 11 13"/><line x1="13" y1="14" x2="17" y2="14"/>',
  fiber_manual_record: '<circle cx="12" cy="12" r="7"/>',
  fitness_center: '<line x1="4" y1="12" x2="20" y2="12"/><rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/><rect x="6" y="7" width="2.5" height="10" rx="1"/><rect x="15.5" y="7" width="2.5" height="10" rx="1"/>',
  group: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M10 20a6 6 0 0 1 12 0"/>',
  handshake: '<path d="M3 11l4-4 4 3 3-3 4 4"/><path d="M7 10l4 4 3-3"/><path d="M14 11l3 3"/><path d="M2 11l3 3 2-2"/><path d="M22 11l-3 3-2-2"/>',
  lightbulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.5h6c0-1.2.4-1.9 1-2.5A6 6 0 0 0 12 3z"/>',
  link: '<path d="M9 15l6-6"/><path d="M7 12l-2 2a4 4 0 0 0 6 6l2-2"/><path d="M17 12l2-2a4 4 0 0 0-6-6l-2 2"/>',
  local_fire_department: '<path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2 2 4a5 5 0 0 1-10 0c0-4 2-5 3-8 .5 1 1 1.5 2 1.5z"/>',
  location_on: '<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>',
  menu_book: '<path d="M3 5.5a2 2 0 0 1 2-2h7v15H5a2 2 0 0 0-2 2z"/><path d="M21 5.5a2 2 0 0 0-2-2h-7v15h7a2 2 0 0 1 2 2z"/>',
  military_tech: '<circle cx="12" cy="8" r="5"/><path d="M9 12.5L7 21l5-3 5 3-2-8.5"/>',
  note: '<path d="M5 3h11l5 5v13H5z"/><path d="M16 3v5h5"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>',
  psychology: '<path d="M9 3a4 4 0 0 0-4 4c0 1-1 1-1 3a3 3 0 0 0 2 2.8V16a3 3 0 0 0 3 3h1"/><path d="M13 3a4 4 0 0 1 4 4c0 1 1 1 1 3a3 3 0 0 1-2 2.8V16a3 3 0 0 1-3 3h-1"/><line x1="11" y1="3" x2="11" y2="19"/>',
  push_pin: '<path d="M12 2l3 3-1 5 4 4-2 2-4-4-5 1-3-3 5-1z"/><line x1="4" y1="20" x2="9" y2="15"/>',
  record_voice_over: '<circle cx="9" cy="9" r="4"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M17 8a4 4 0 0 1 0 6"/><path d="M20 6a8 8 0 0 1 0 10"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 14-5.3L21 9"/><polyline points="21 4 21 9 16 9"/><path d="M20 12a8 8 0 0 1-14 5.3L3 15"/><polyline points="3 20 3 15 8 15"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3"/><rect x="8" y="14" width="8" height="6"/>',
  schedule: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
  school: '<path d="M12 3L2 8l10 5 10-5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><line x1="22" y1="8" x2="22" y2="15"/>',
  search: '<circle cx="10" cy="10" r="6"/><line x1="21" y1="21" x2="14.5" y2="14.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  smart_toy: '<rect x="4" y="8" width="16" height="12" rx="2"/><line x1="12" y1="2" x2="12" y2="8"/><circle cx="12" cy="2" r="1.5"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><line x1="8" y1="18" x2="16" y2="18"/>',
  speed: '<circle cx="12" cy="13" r="8"/><line x1="12" y1="13" x2="16" y2="9"/><line x1="8" y1="4" x2="8" y2="4"/><line x1="12" y1="3" x2="12" y2="4.5"/><line x1="19" y1="8" x2="18" y2="9"/><line x1="5" y1="8" x2="6" y2="9"/>',
  star: '<polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/>',
  sync: '<path d="M4 4v5h5"/><path d="M20 20v-5h-5"/><path d="M5.5 9A7 7 0 0 1 19 8"/><path d="M18.5 15A7 7 0 0 1 5 16"/>',
  track_changes: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trending_up: '<polyline points="4 16 10 10 14 14 20 6"/><polyline points="15 6 20 6 20 11"/>',
  upload: '<line x1="12" y1="15" x2="12" y2="4"/><polyline points="7 9 12 4 17 9"/><path d="M4 18h16"/>',
  visibility: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  warning: '<path d="M12 3l10 18H2z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="12" x2="21" y2="12"/>',
  workspace_premium: '<circle cx="12" cy="9" r="6"/><path d="M9 14L7 21l5-3 5 3-2-7"/><polyline points="9.5 9 11 10.5 14.5 7"/>',
};

// Wrap an icon's path markup in a full <svg>. Kept as a function (not
// pre-built strings) so size/stroke stay consistent everywhere.
function buildIconSvg(name) {
  const inner = ICONS[name];
  if (!inner) return null;
  return (
    '<svg class="ui-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    inner +
    '</svg>'
  );
}

// Find every not-yet-hydrated icon span under `root` and swap its text
// content for the matching inline SVG.
function hydrateIcons(root) {
  const scope = root || document;
  const nodes = scope.querySelectorAll
    ? scope.querySelectorAll('.material-symbols-outlined:not(.svg-hydrated)')
    : [];
  nodes.forEach((el) => {
    const name = el.textContent.trim();
    const svg = buildIconSvg(name);
    if (svg) {
      el.innerHTML = svg;
      el.classList.add('svg-hydrated');
    }
  });
}

(function () {
  document.documentElement.classList.add('icons-ready');
  hydrateIcons(document);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue; // element nodes only
        if (node.matches && node.matches('.material-symbols-outlined')) {
          hydrateIcons(node.parentNode || document);
        } else if (node.querySelector) {
          hydrateIcons(node);
        }
      }
    }
  });
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrateIcons(document));
  }
})();
