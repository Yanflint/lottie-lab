// build-2025-09-19-02
// build-2025-09-19-01
// [ADDED] atomic-swap imports
import { API_BASE as SHARE_API_BASE } from './shareClient.js';
import { setBackgroundFromSrc, loadLottieFromData, layoutLottie, setLoop } from './lottie.js';
import { setLotOffset, setLastLottie, setLastBgMeta, state } from './state.js';
import { showUpdateToast } from './updateToast.js';
import { afterTwoFrames } from './utils.js';
window.__LP_BUILD = 'build-2025-09-19-01';


// === AUTOREFRESH DEBUG (opt-in via ?ar_debug=1 or localStorage 'lp_ar_debug') ===
const __AR_DBG__ = (function(){
  function flagOn(){
    try{
      const sp = new URL(location.href).searchParams;
      const q = (sp.get('ar_debug')||'').toLowerCase();
      if (q==='1'||q==='true'||q==='on') return true;
      const ls=(localStorage.getItem('lp_ar_debug')||'').toLowerCase();
      if (ls==='1'||ls==='true'||ls==='on') return true;
      const ss=(sessionStorage.getItem('lp_ar_debug')||'').toLowerCase();
      if (ss==='1'||ss==='true'||ss==='on') return true;
    }catch(e){}
    return false;
  }
  function ensureOverlay(){
    try{
      if (!flagOn()) return null;
      let el = document.getElementById('ar-debug');
      if (!el){
        el = document.createElement('div');
        el.id = 'ar-debug';
        el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;background:rgba(0,0,0,.7);color:#0f0;font:12px/1.4 monospace;padding:6px 8px;border-radius:6px;max-width:60vw;white-space:pre-wrap;pointer-events:none;';
        document.body.appendChild(el);
      }
      return el;
    }catch(e){ return null; }
  }
  function log(msg, meta){
    try{
      if (flagOn()) console.log('[autoRefresh]', msg, meta||'');
      const el = ensureOverlay();
      if (el){
        const t = (new Date()).toLocaleTimeString();
        const m = typeof msg==='string' ? msg : JSON.stringify(msg);
        if (!el.__lines) el.__lines = [];
        const line = t+' — '+m+(meta?(' '+JSON.stringify(meta)):''); 
        el.__lines.push(line);
        if (el.__lines.length>8) el.__lines.shift();
        el.textContent = el.__lines.join('\n');
      }
    }catch(e){}
  }
  try{ if (flagOn()) { if (document.readyState!=='loading') ensureOverlay(); else document.addEventListener('DOMContentLoaded', ensureOverlay, { once: true }); } }catch(e){}
  /* DBG_DOM_READY */
  return { flagOn, log, ensureOverlay };
})();

// src/app/autoRefresh.js
function __isStandalone(){
  try{
    return (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches ||
                                  window.matchMedia('(display-mode: fullscreen)').matches)) ||
           (typeof navigator!=='undefined' && navigator.standalone===true);
  }catch(e){ return false; }
}
// Live-пулинг для /s/last: 5с ±20% (только когда вкладка видима).
// Мгновенная проверка при возврате в фокус/тач. Бэкофф до 30с при ошибках.
// Перед перезагрузкой ставим флаг в sessionStorage, чтобы показать тост "Обновлено".

const BASE_INTERVAL = 5000;
const JITTER = 0.20;
// Derive API endpoint candidates from shareClient (YC functions) and local Netlify
const __API_BASE = (typeof SHARE_API_BASE==='string' && SHARE_API_BASE) ? SHARE_API_BASE.replace(/\/+$/, '') : '';
const API_CANDIDATES = __API_BASE ? [`${__API_BASE}`, '/api/share'] : ['/api/share'];
const MAX_BACKOFF = 30000;
const TOAST_FLAG = 'lp_show_toast';

// [ADDED] Build minimal refs used by lottie helpers (no coupling to main.js)
function __collectRefsForViewer(){
  const $ = (id) => document.getElementById(id);
  const wrapper = $('wrapper');
  return {
    wrapper,
    preview: $('preview'),
    previewBox: $('previewBox') || wrapper,
    phEl: $('ph'),
    bgImg: $('bgImg'),
    lotStage: $('lotStage'),
    lottieMount: $('lottie'),
    toastEl: $('toast'),
  };
}

// [ADDED] Preload image and resolve after decode (if supported)
async function __preloadImage(src){
  if (!src) return;
  await new Promise((res)=>{
    const im = new Image();
    im.onload = () => res();
    im.onerror = () => res(); // don't block on errors
    try { im.decoding = 'sync'; } catch(e) {}
    im.src = src;
  });
  try {
    const imgEl = document.createElement('img');
    imgEl.src = src;
    if (imgEl.decode) await imgEl.decode();
  } catch(e){}
}

// [ADDED] Atomic (no-black) apply of new payload: preload everything, then swap
async function __applyAtomicUpdate(data){
  if (!data || typeof data !== 'object') return false;
  const refs = __collectRefsForViewer();

  // A) Apply loop option early (mirrors applyLoopFromPayload)
  try {
    if (data && data.opts && typeof data.opts.loop === 'boolean') {
      state.loopOn = !!data.opts.loop;
      if (refs?.loopChk) refs.loopChk.checked = state.loopOn;
      try { setLoop(state.loopOn); } catch(e) {}
    }
  } catch(e) {}

  // B) Parse and preload background (if any)
  let bgSrc = null, bgMeta = {};
  try {
    if (data.bg) {
      if (typeof data.bg === 'string') bgSrc = data.bg;
      else { bgSrc = data.bg.value; bgMeta = { fileName: data.bg.name, assetScale: data.bg.assetScale }; }
    }
    // If meta is missing, try from lot meta (_lpBgMeta)
    if ((!bgMeta.fileName || !bgMeta.assetScale) && data.lot && data.lot.meta && data.lot.meta._lpBgMeta) {
      const bm = data.lot.meta._lpBgMeta;
      if (!bgMeta.fileName && bm.fileName) bgMeta.fileName = bm.fileName;
      if (!bgMeta.assetScale && bm.assetScale) bgMeta.assetScale = bm.assetScale;
    }
  } catch(e) {}
  if (bgSrc) { try { await __preloadImage(bgSrc); } catch(e) {} }

  // C) Read offset from lot meta (_lpOffset/_lpPos) to avoid jump
  // __AR_OFFSET_RELAYOUT__
  try {
    let m = data.lot && data.lot.meta && (data.lot.meta._lpOffset || data.lot.meta._lpPos);
    if (m && typeof m.x==='number' && typeof m.y==='number') setLotOffset(m.x||0, m.y||0);
  } catch(e) {}

  // D) Swap in this order: background -> lottie
  if (bgSrc) {
    try { await setBackgroundFromSrc(refs, bgSrc, bgMeta); setLastBgMeta(bgMeta||{}); } catch(e){ console.warn('swap bg fail', e); }
  }
  if (data.lot) {
    try { setLastLottie(data.lot); await loadLottieFromData(refs, data.lot); } catch(e){ console.warn('swap lot fail', e); }
  }

  try { layoutLottie(refs); } catch(e){}
  try { if (refs?.phEl) refs.phEl.classList.add('hidden'); } catch(e){}
  return true;
}



function isViewerPath(){
  try { return /^\/s\//.test(location.pathname); } catch(e) { return false; }
}
function isViewingLast() {
  try {
    if (!isViewerPath()) return false; // Only in /s/*
    const p = location.pathname;
    // /s/{id}
    if (p.startsWith('/s/')) {
      const id = decodeURIComponent(p.split('/')[2] || '');
      if (id === 'last' || id === '__last__') return true;
    }
    const u = new URL(location.href);
    const q = u.searchParams;
    // follow=1 from launch.html survives immediate navigation
    const follow = (q.get('follow') || '').toLowerCase();
    if (follow === '1' || follow === 'true' || follow === 'yes') return true;
    // session flag set by launch.html (same-origin)
    try {
      const ss = (sessionStorage.getItem('lp_follow_last') || '').toLowerCase();
      if (ss === '1' || ss === 'true' || ss === 'yes' || ss === 'on') return true;
    } catch(e){}
  } catch(e){}
  return false;
}
function jittered(ms){const f=1+(Math.random()*2-1)*JITTER;return Math.max(1000,Math.round(ms*f));}
async function fetchRev(){
  for (const base of API_CANDIDATES){
    // Prefer HEAD (ETag) — cheaper and often more permissive in shells
    try{
      const head = await fetch(`${base}?id=last`, { method: 'HEAD', cache: 'no-store' });
      if (head && head.ok){
        const et = (head.headers.get('ETag') || '').replace(/"/g,'');
        if (et) return String(et);
      }
    }catch(e){
      try{ __AR_DBG__.log('fetchRev HEAD error', { base, error: String(e) }); }catch(_){}
    }
    // Fallback to lightweight GET ?rev=1
    try{
      const r = await fetch(`${base}?id=last&rev=1`, { cache: 'no-store' });
      if (!r.ok){ try{ __AR_DBG__.log('fetchRev non-OK', { base, status: r.status }); }catch(e){}; continue; }
      const j = await r.json(); 
      return String(j.rev||'');
    }catch(e){
      try{ __AR_DBG__.log('fetchRev GET error', { base, error: String(e) }); }catch(_){}
      continue;
    }
  }
  throw new Error('all rev endpoints failed');
}


async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// [PATCH-STABLE] Ensure GET payload matches current rev (ETag) for '__last__'
async function fetchStableLastPayload(maxMs=2000){
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline){
    // 1) fetch payload with no-store and capture ETag
    const pr = await fetch(`${API_CANDIDATES[0]}?id=last`, { cache: 'no-store' });
    if (!pr.ok) throw new Error('payload get failed '+pr.status);
    const et = (pr.headers.get('ETag') || '').replace(/"/g,'');
    const data = await pr.json().catch(()=>null);

    // 2) fetch current rev
    let revNow = '';
    try{
      const rr = await fetch(`${API_CANDIDATES[0]}?id=last&rev=1`, { cache: 'no-store' });
      if (rr.ok){ const j = await rr.json().catch(()=>({})); revNow = String(j.rev||''); }
    }catch(e){}

    // 3) If ETag equals current rev and data looks complete — return
    const hasLot = !!(data && typeof data === 'object' && data.lot);
    if (hasLot && et && revNow && et === revNow) return { data, etag: et };

    // else short sleep and retry
    await sleep(250);
  }
  // final attempt return whatever we have (best effort)
  const pr2 = await fetch(`${API_CANDIDATES[0]}?id=last`, { cache: 'no-store' });
  const data2 = await pr2.json().catch(()=>null);
  const et2 = (pr2.headers.get('ETag') || '').replace(/"/g,'');
  return { data: data2, etag: et2 };
}

export function initAutoRefreshIfViewingLast(){
  const _ivl = isViewingLast(); if(! _ivl){ __AR_DBG__.log('Skip: not viewing last'); return; } __AR_DBG__.log('Init auto-refresh');

  let baseline=null, timer=null, currentDelay=BASE_INTERVAL, inFlight=false;
  window.__AR_STATE = { baseline:null, lastRev:null, currentDelay:BASE_INTERVAL, inFlight:false, lastTick:0 };

  const schedule=(d=currentDelay)=>{ clearTimeout(timer); const jd=jittered(d); __AR_DBG__.log('schedule', { in: jd }); timer=setTimeout(tick, jd); };
  const reset=()=>{currentDelay=BASE_INTERVAL;};

  const tick=async()=>{ window.__AR_STATE.lastTick = Date.now(); __AR_DBG__.log('tick');
    if(inFlight) return;
    const __visOk = (typeof document!=='undefined' && document.visibilityState==='visible');
    if(!__visOk && !__isStandalone()){ schedule(currentDelay); return; }
    inFlight=true;
    try{
      const rev=await fetchRev(); window.__AR_STATE.lastRev = rev; __AR_DBG__.log('rev', { rev });
      if(!baseline){ baseline=rev; window.__AR_STATE.baseline = baseline; __AR_DBG__.log('baseline set', { baseline }); }
      else if(rev && rev!==baseline){ __AR_DBG__.log('rev changed', { from: baseline, to: rev });
  try {
    const { data } = await fetchStableLastPayload(4000);
    if (data && typeof data === 'object') {
      __AR_DBG__.log('try atomic update'); const ok = await __applyAtomicUpdate(data); __AR_DBG__.log('atomic result', { ok });
      if (ok) {
        try { baseline = rev; } catch(e) {}
        try { showUpdateToast('Обновлено'); } catch(e) {}
        currentDelay = BASE_INTERVAL;
        schedule(currentDelay);
        return;
      }
    }
  } catch(e) {
    console.warn('atomic update failed, fallback to reload', e);
  }
  // Fallback to old behaviour if something goes wrong
  try{ sessionStorage.setItem(TOAST_FLAG,'1'); }catch(e){}
  __AR_DBG__.log('fallback: hard reload'); location.replace(location.href);
  return;
}

// [PATCH] Verify payload completeness before triggering hard reload on rev change.

      reset();
    }catch{
      __AR_DBG__.log('error/backoff'); currentDelay=Math.min(MAX_BACKOFF, Math.max(BASE_INTERVAL, currentDelay*2));
    }finally{
      inFlight=false;
      schedule(currentDelay);
    }
  };

  const onVisible=()=>{ if(document.visibilityState==='visible'){ reset(); clearTimeout(timer); tick(); } };
  const onPointer=()=>{ if(document.visibilityState==='visible'){ reset(); clearTimeout(timer); tick(); } };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  window.addEventListener('pageshow', onVisible);
  window.addEventListener('pointerdown', onPointer, {passive:true});

  (async()=>{ try{ baseline=await fetchRev(); }catch(e){}
    if(!(document.visibilityState==='visible' || __isStandalone())) return; if(document.visibilityState==='visible'){ /* start timer */ schedule(BASE_INTERVAL);} })();
}
