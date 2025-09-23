// src/app/lottie.js
import { state, setLastBgSize, setLastBgMeta } from './state.js';
import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
import { setPlaceholderVisible, afterTwoFrames } from './utils.js';

// Backward-compat single 'anim' (unused in multi-mode, kept for legacy imports)
let anim = null;

// === Helpers ===
function genId(){ return 'lot' + Math.random().toString(36).slice(2,9); }

function ensureItemsContainer(refs){
  const stage = refs?.lotStage || document.getElementById('lotStage');
  if (!stage) return null;
  let items = stage.querySelector('#lotItems');
  if (!items){
    items = document.createElement('div');
    items.id = 'lotItems';
    items.className = 'lot-items';
    stage.appendChild(items);
  }
  return items;
}

// === Layout ===
export async function layoutLottie(refs){
  const stage = refs?.lotStage || document.getElementById('lotStage');
  if (!stage) return;

  const cssW = +((state.lastBgSize && state.lastBgSize.w) || 0);
  const cssH = +((state.lastBgSize && state.lastBgSize.h) || 0);

  // Set the logical size of the stage (fallback 512x512)
  const baseW = cssW || 512;
  const baseH = cssH || 512;
  try { stage.style.width = `${baseW}px`; stage.style.height = `${baseH}px`; } catch {}

  // Compute real rendered size for the background
  let realW = 0, realH = 0;
  const bgEl = refs?.bgImg || document.getElementById('bgImg');
  if (bgEl && typeof bgEl.getBoundingClientRect === 'function') {
    const bgr = bgEl.getBoundingClientRect();
    realW = bgr.width || 0;
    realH = bgr.height || 0;
  }
  // Fallback to stage container rect
  if (!(realW > 0 && realH > 0)) {
    const br = stage.getBoundingClientRect?.();
    if (br) { realW = br.width || 0; realH = br.height || 0; }
  }

  // Fit scale: 1 css unit of lottie equals 1 css pixel of background
  let fitScale = 1;
  if (baseW > 0 && baseH > 0 && realW > 0 && realH > 0) {
    fitScale = Math.min(realW / baseW, realH / baseH);
    if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
  }

  // Center + scale the stage
  stage.style.left = '50%';
  stage.style.top  = '50%';
  stage.style.transformOrigin = '50% 50%';
  stage.style.transform = `translate(-50%, -50%) scale(${fitScale})`;

  // Apply per-item transforms (offsets are in logical units, multiply by fitScale)
  try {
    const items = Array.from(stage.querySelectorAll('.lot-item'));
    for (const el of items){
      const id = el.dataset.id;
      const it = state.items.find(x => x.id === id);
      const ox = (it?.offset?.x || 0) * fitScale;
      const oy = (it?.offset?.y || 0) * fitScale;
      el.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
    }
  } catch {}

  // Expose metrics
  try {
    const sr = stage.getBoundingClientRect?.() || { width: 0, height: 0 };
    window.__lpMetrics = { cssW: baseW, cssH: baseH, realW, realH, fitScale, stageW: sr.width, stageH: sr.height };
  } catch {}

  if (typeof window.__updateOverlay === 'function') {
    try { window.__updateOverlay(refs); } catch {}
  }
}

// === Background ===
export async function setBackgroundFromSrc(refs, src, { fileName = '' } = {}){
  const el = refs?.bgImg || document.getElementById('bgImg');
  if (!el) return;

  // Preload to get natural size
  const img = new Image();
  img.decoding = 'async';
  const done = new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
  img.src = src;

  // Apply once ready
  const ok = await done;
  const w = ok ? (img.naturalWidth || 0) : 0;
  const h = ok ? (img.naturalHeight || 0) : 0;
  const assetScale = 1;

  // Update wrapper CSS vars + state
  try {
    const wrap = refs?.wrapper || document.getElementById('wrapper');
    if (wrap) {
      wrap.style.setProperty('--preview-ar', `${w} / ${h}`);
      wrap.style.setProperty('--preview-h', `${h}px`);
      wrap.style.setProperty('--asset-scale', String(assetScale));
      wrap.classList.add('has-bg');
    }
    setLastBgSize(w, h);
    setLastBgMeta({ fileName, assetScale });
  } catch {}

  // Swap image and finalize
  el.src = src;
  setPlaceholderVisible(refs, false);
  try { await afterTwoFrames(); await afterTwoFrames(); } catch {}
  try { await layoutLottie(refs); } catch {}
}

// === Lottie creation ===
export async function addLottieFromData(refs, data){
  const lotJson = typeof data === 'string' ? JSON.parse(data) : data;
  if (!lotJson || typeof lotJson !== 'object') return null;

  const w = Number(lotJson.w || 0) || 512;
  const h = Number(lotJson.h || 0) || 512;
  const itemsEl = ensureItemsContainer(refs);
  if (!itemsEl) return null;

  const id = genId();
  const wrap = document.createElement('div');
  wrap.className = 'lot-item';
  wrap.dataset.id = id;
  wrap.style.width = `${w}px`;
  wrap.style.height = `${h}px`;
  wrap.style.transform = `translate(-50%,-50%)`;
  const mount = document.createElement('div');
  mount.className = 'lottie-mount';
  const sel = document.createElement('div');
  sel.className = 'sel-overlay';
  wrap.appendChild(mount);
  wrap.appendChild(sel);
  itemsEl.appendChild(wrap);

  const engine = pickEngine();
  const loop = !!state.loopOn;
  const autoplay = !!state.autoplayOn;
  let inst = null;
  if (engine === 'rlottie') {
    inst = createRlottiePlayer({ container: mount, loop, autoplay, animationData: lotJson });
  } else {
    try {
      inst = window.lottie.loadAnimation({
        container: mount, renderer: 'svg', loop, autoplay,
        animationData: lotJson,
        rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
      });
    } catch (e) {
      try { console.error('lottie load failed', e); } catch {}
      return null;
    }
  }

  // Select on pointerdown
  wrap.addEventListener('pointerdown', () => {
    try {
      document.querySelectorAll('.lot-item.selected').forEach(el => el.classList.remove('selected'));
      wrap.classList.add('selected');
      import('./state.js').then(({ selectItem }) => selectItem(id));
    } catch {}
  });

  // Persist into state
  try {
    const mod = await import('./state.js');
    mod.addItem({ id, el: wrap, anim: inst, w, h, offset: {x:0,y:0}, loopOn: loop });
  } catch {}

  // Layout when ready
  try { inst?.addEventListener?.('DOMLoaded', () => { try { layoutLottie(refs); } catch {} }); } catch {}
  try { await layoutLottie(refs); } catch {}

  return inst;
}

export async function loadLottieFromData(refs, data) {
  try { return await addLottieFromData(refs, data); }
  catch(e){ console.error('loadLottieFromData error', e); return null; }
}

// === Controls ===
export function restart() {
  try {
    const it = state.items.find(x => x.id === state.selectedId) || null;
    const a = it?.anim || null;
    if (!a) return;
    try { a.stop?.(); } catch {}
    try { a.goToAndPlay?.(0, true); } catch {}
    try { a.play?.(); } catch {}
  } catch (e) {
    if (typeof anim?.stop === 'function') { try { anim.stop(); anim.goToAndPlay?.(0,true); anim.play?.(); } catch{} }
  }
}

/** Экспорт текущей анимации (legacy) */
export function getAnim() { return anim; }
export { setLoop } from './state.js';
