// src/app/main.js

// 1) Отметка standalone (A2HS)
const isStandalone =
  (window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.matchMedia('(display-mode: fullscreen)').matches)) ||
  (navigator.standalone === true);

if (isStandalone) document.documentElement.classList.add('standalone');
try{ document.documentElement.classList.remove('booting'); }catch(e){}


// Viewer mode on /s/*
const isViewer = (window.__FORCE_VIEWER__ === true) || window.location.pathname.startsWith('/s/') || (new URL(window.location.href)).searchParams.has('id');
if (isViewer) document.documentElement.classList.add('viewer');
// [PATCH] Boot hard refresh once per session, to avoid stale payload
try {
  if (isViewer && sessionStorage.getItem('lp_boot_refreshed') !== '1') {
    sessionStorage.setItem('lp_boot_refreshed','1');
    location.replace(location.href);
} catch(e){}


// 2) Импорты модулей
import { initDnd }           from './dnd.js';
import { state }           from './state.js';
import { getAnim, restart } from './lottie.js';
import { initControls }      from './controls.js';
import { initShare }         from './shareClient.js?v=yc14';
import { initLoadFromLink }  from './loadFromLink.js';
import { layoutLottie }      from './lottie.js';
import { initAutoRefreshIfViewingLast } from './autoRefresh.js'; // ← НОВОЕ
import { showToastIfFlag } from './updateToast.js';
import { bumpLotOffset } from './state.js';
import { initLottiePan }  from './pan.js';

// 3) DOM-refs
function collectRefs() {
  return {
    wrapper:      document.getElementById('wrapper'),
    preview:      document.getElementById('preview'),
    placeholder:  document.getElementById('ph'),
    dropOverlay:  document.getElementById('dropOverlay'),
    bgImg:        document.getElementById('bgImg'),
    lotStage:     document.getElementById('lotStage'),
    lottieMount:  document.getElementById('lottie'),
    sizeBtn:      document.getElementById('sizeBtn'),
    heightBtn:    document.getElementById('heightBtn'),
    restartBtn:   document.getElementById('restartBtn'),
    loopChk:      document.getElementById('loopChk'),
    shareBtn:     document.getElementById('shareBtn'),
    toastEl:      document.getElementById('toast'),
    verEl:        document.getElementById('ver'),
    mode:         document.getElementById('mode'),
  };
}

// 4) Версия
function applyVersion(refs) {
  try {
    const u = new URL(import.meta.url);
    const v = u.searchParams.get('v') || 'dev';
    if (refs.verEl) refs.verEl.textContent = `build ${v}`;
  } catch {
    if (refs.verEl) refs.verEl.textContent = 'build dev';
  }
}

// 5) Init
window.addEventListener('DOMContentLoaded', async () => {
  const refs = collectRefs();
  applyVersion(refs);
showToastIfFlag(); // покажет "Обновлено", если страница была перезагружена авто-рефрешом

  // Авто-рефреш для /s/last (Viewer)
  if (isViewer) initAutoRefreshIfViewingLast(); // run only on /s/* viewer

  await initLoadFromLink({ refs, isStandalone });

  
  if (!isViewer) initLottiePan({ refs });
if (!isViewer) initDnd({ refs });
  initControls({ refs });
  initShare({ refs, isStandalone });

  /* DISABLE TAB FOCUS */
  try { document.querySelectorAll('button').forEach(b => b.setAttribute('tabindex','-1')); } catch(e){}
  /* REMOVE SHARE TITLE */
  try { refs.shareBtn?.removeAttribute('title'); } catch(e){}

  // Перелайаут
  const relayout = () => { try { layoutLottie(refs); } catch(e){} };
  try { layoutLottie(refs); } catch(e){}
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });

  // Hotkey: Reset (R) in editor only; allow Ctrl/Cmd+R refresh; ignore inputs; ru/en layout safe
  window.addEventListener('keydown', (e) => {
  try {
    // В viewer хоткеи редактора не нужны
    if (isViewer) return;
  } catch(e){}

  const hasMods = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
  if (hasMods) return;

  const t = e.target;
  const isEditable = !!(t && (t.closest?.('input, textarea, [contenteditable="true"]')
                   || t.isContentEditable
                   || t.getAttribute?.('role') === 'textbox'));
  if (isEditable) return;

  // Reset (R) — пример горячей клавиши
  if (e.key && e.key.toLowerCase() === 'r') {
    try { e.preventDefault(); layoutLottie?.(refs); } catch(e){}
  }
});if (isEditable) return;

    const isRCode = e.code === 'KeyR';
    const isRKey  = (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К');
    if (isRCode || isRKey) {
      e.preventDefault();
      try { setLotOffset(0, 0); } catch(e){}
      try { relayout(); } catch(e){}
    }
  }, { passive: false });

  // Тап = перезапуск (если было добавлено ранее)
  const restartByTap = (e) => {
    if (isViewer) return;
    const isTouch = e.pointerType ? (e.pointerType === 'touch') : (e.touches && e.touches.length === 1);
    if (!isTouch && !isStandalone) return;
    if (refs.mode && refs.mode.contains(e.target)) return;
    refs.restartBtn?.click();
  };
  refs.preview?.addEventListener('pointerdown', restartByTap, { passive: true });
  refs.preview?.addEventListener('touchstart',  restartByTap, { passive: true });

  // In viewer mode: click to RESTART animation (always from start)
  if (isViewer && refs.preview) {
    refs.preview.addEventListener('click', (e) => {
      if (refs.mode && refs.mode.contains(e.target)) return;
      try { restart(); } catch(e){}
    });
window.addEventListener('resize', () => { try { layoutLottie(refs); } catch(e){} });

  // ===== [TEST OVERLAY UI] only in viewer mode =====
  try {
    if (isViewer) {
      // Metrics overlay
      const ov = document.createElement('div');
      ov.id = 'debugOverlay';
      ov.className = 'debug-overlay';
      ov.setAttribute('aria-live','polite');
      ov.textContent = '—';
      // attach to wrapper if exists else body
      (refs?.wrapper || document.body).appendChild(ov);

      // Refresh button fixed at bottom-right above build/version
      const rb = document.createElement('button');
      rb.id = 'forceRefreshBtn';
      rb.className = 'overlay-refresh-btn';
      rb.type = 'button';
      rb.textContent = 'Обновить';
      rb.title = 'Принудительно перезагрузить ссылку';
      rb.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { sessionStorage.setItem('lp_show_toast','1'); } catch(e){}
        location.replace(location.href);
      });
      document.body.appendChild(rb); // ensure it's on top layer

      // Debug visibility gating (hidden by default; enable via ?debug=1 || localStorage('lp_debug'='1'))
      try {
        const sp = new URL(location.href).searchParams;
        const dbgParam = (sp.get('debug')||'').toLowerCase();
        const dbgPref  = (typeof localStorage!=='undefined' && (localStorage.getItem('lp_debug')||'').toLowerCase()) || '';
        const debugOn  = (dbgParam==='1'||dbgParam==='true'||dbgParam==='on') || (!dbgParam && (dbgPref==='1'||dbgPref==='true'||dbgPref==='on'));
        ov.style.display = debugOn ? '' : 'none';
        rb.style.display = debugOn ? '' : 'none';
      } catch(e){}

      // Expose updater
      window.__updateOverlay = (m) => {
        try {
          const txt = [
            `offset: x=${m?.offsetX ?? 0} (px), y=${m?.offsetY ?? 0} (px)`,
            `offset*scale: x=${m?.offsetXpx ?? 0}px, y=${m?.offsetYpx ?? 0}px`,
            `size: ${m?.baseW ?? 0}×${m?.baseH ?? 0} (base), ${m?.dispW ?? 0}×${m?.dispH ?? 0} (display)`,
            `scale: ${m?.fitScale?.toFixed ? m.fitScale.toFixed(4) : m?.fitScale ?? 1}`
          ].join('\n');
          ov.textContent = txt;
        } catch(e){}
      };
    }
  } catch(e){}

});

function installViewerFixCSS() {
  try {
    // Remove same-origin rules that force html.viewer to 100vh/100vw
    for (const ss of Array.from(document.styleSheets)) {
      const href = ss.href || '';
      const sameOrigin = !href || href.startsWith(location.origin);
      if (!sameOrigin) continue;
      try {
        const rules = ss.cssRules;
        for (let i = rules.length - 1; i >= 0; i--) {
          const t = rules[i].cssText || '';
          if (/html\.viewer/.test(t) && /(100dvh|100vh|100vw)/i.test(t)) {
            ss.deleteRule(i);
        }
      } catch(e){}
    }
  } catch(e){}
}

function pokeLayout(){
  try { if (typeof installViewerFixCSS === 'function') installViewerFixCSS(); } catch(e){}
  try { window.dispatchEvent(new Event('resize')); } catch(e){}
  try { if (window.lottie && window.lottie.resize) { window.lottie.resize(); } } catch(e){}
}
if (isViewer) {
  setTimeout(pokeLayout, 50);
  setTimeout(pokeLayout, 250);
  setTimeout(pokeLayout, 1000);
  try {
    if (window.visualViewport) {
      visualViewport.addEventListener('resize', pokeLayout, { passive:true });
      visualViewport.addEventListener('scroll',  pokeLayout, { passive:true });
      if ('ongeometrychange' in visualViewport) visualViewport.addEventListener('geometrychange', pokeLayout, { passive:true });
  } catch(e){}
  window.addEventListener('orientationchange', pokeLayout, { passive:true });
  window.addEventListener('pageshow',          pokeLayout, { passive:true });
  document.addEventListener('visibilitychange', pokeLayout, { passive:true });
// __viewer_pokes_wired__
try {
  if (isViewer) {
    window.addEventListener('orientationchange', pokeLayout, {passive:true});
    window.addEventListener('pageshow', pokeLayout, {passive:true});
    document.addEventListener('visibilitychange', pokeLayout, {passive:true});
    window.addEventListener('resize', pokeLayout, {passive:true});
    if (window.visualViewport) {
      visualViewport.addEventListener('resize', pokeLayout, {passive:true});
      visualViewport.addEventListener('scroll', pokeLayout, {passive:true});
      if ('ongeometrychange' in visualViewport) visualViewport.addEventListener('geometrychange', pokeLayout, {passive:true});
    setTimeout(pokeLayout, 50);
    setTimeout(pokeLayout, 250);
    setTimeout(pokeLayout, 1000);
} catch(e){}