
// Multi-Lottie runtime
import { state, setLastBgSize, setLastBgMeta, addLottieItem, setItemOffset, getItem, getSelectedId, setSelectedId } from './state.js';
import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
import { setPlaceholderVisible } from './utils.js';

<<<<<<< Updated upstream
<<<<<<< Updated upstream
let anim = null;

/* ========= ENV DETECT (PWA + mobile) ========= */
(function detectEnv(){
  try {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      // iOS Safari
      (typeof navigator !== 'undefined' && navigator.standalone === true);

    const isMobile =
      /Android|iPhone|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent || ''
      );

    if (isStandalone) document.documentElement.classList.add('is-standalone');
    if (isMobile) document.documentElement.classList.add('is-mobile');
  } catch (_) {}
})();

/* ========= HELPERS ========= */
function parseAssetScale(nameOrUrl) {
  // match @2x, @3x, @1.5x before extension
  const m = String(nameOrUrl || '').match(/@(\d+(?:\.\d+)?)x(?=\.[a-z0-9]+(\?|#|$))/i);
  if (!m) return 1;
  const s = parseFloat(m[1]);
  if (!isFinite(s) || s <= 0) return 1;
  // Ограничим разумными рамками
  return Math.max(1, Math.min(4, s));
}

/** Центрируем лотти-стейдж без масштаба (1:1) */
/** Центрируем и масштабируем лотти-стейдж синхронно с фоном */
export function layoutLottie(refs) {
  const stage = refs?.lotStage;
  const wrap  = refs?.wrapper || refs?.previewBox || refs?.preview;
  if (!stage || !wrap) return;

  const cssW = +((state.lastBgSize && state.lastBgSize.w) || 0);
  const cssH = +((state.lastBgSize && state.lastBgSize.h) || 0);

  
  // Берём реальные рендерные размеры фоновой картинки (если есть),
  // чтобы масштаб лотти соответствовал именно фону, а не контейнеру превью.
  let realW = 0, realH = 0;
  const bgEl = refs?.bgImg;
  if (bgEl && bgEl.getBoundingClientRect) {
    const bgr = bgEl.getBoundingClientRect();
    realW = bgr.width || 0;
    realH = bgr.height || 0;
  }
  // Фолбэк: если по какой-то причине фон недоступен — используем контейнер
  if (!(realW > 0 && realH > 0)) {
    const br = wrap.getBoundingClientRect();
    realW = br.width || 0;
    realH = br.height || 0;
  }


  let fitScale = 1;
  
  if (cssW > 0 && cssH > 0 && realW > 0 && realH > 0) {
    // Масштаб подгоняем так, чтобы 1 CSS-пиксель лотти = 1 CSS-пиксель фона
    fitScale = Math.min(realW / cssW, realH / cssH);
  }
if (cssW > 0 && cssH > 0 && realW > 0 && realH > 0) {
    fitScale = Math.min(realW / cssW, realH / cssH);
    if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
  }

  const x = (window.__lotOffsetX || 0);
  const y = (window.__lotOffsetY || 0);
  const xpx = x * fitScale;
  const ypx = y * fitScale;
=======
const anims = new Map(); // id -> player
let lastCreatedId = null;
>>>>>>> Stashed changes

=======
const anims = new Map(); // id -> player
let lastCreatedId = null;

>>>>>>> Stashed changes
function ensureStage(refs){
  const stage = refs?.lotStage || document.getElementById('lotStage');
  if (!stage) throw new Error('lotStage not found');
  stage.style.position = 'absolute';
  stage.style.left = '50%';
  stage.style.top  = '50%';
  stage.style.transformOrigin = '50% 50%';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
  stage.style.transform = `translate(calc(-50% + ${xpx}px), calc(-50% + ${ypx}px)) scale(${fitScale})`;
  // [TEST OVERLAY] capture metrics for debug overlay
  try {
    const stageRect = stage.getBoundingClientRect ? stage.getBoundingClientRect() : { width: 0, height: 0 };
    const baseW = parseFloat(stage.style.width || '0') || stageRect.width / (fitScale || 1) || 0;
    const baseH = parseFloat(stage.style.height || '0') || stageRect.height / (fitScale || 1) || 0;
    window.__lpMetrics = {
      fitScale: fitScale,
      baseW: Math.round(baseW),
      baseH: Math.round(baseH),
      dispW: Math.round(stageRect.width),
      dispH: Math.round(stageRect.height),
      offsetX: x,
      offsetY: y,
      offsetXpx: Math.round(xpx),
      offsetYpx: Math.round(ypx)
    };
    if (typeof window.__updateOverlay === 'function') {
      window.__updateOverlay(window.__lpMetrics);
    }
  } catch {}

}
/**
 * Установка фоновой картинки из data:/blob:/http(s)
 * — считываем naturalWidth/naturalHeight
 * — учитываем @2x/@3x/@1.5x из имени
 * — прокидываем в .wrapper CSS-переменные:
 *     --preview-ar : (w/scale) / (h/scale)
 *     --preview-h  : (h/scale)px
 *
 * @param {object} refs
 * @param {string} src
 * @param {object} [meta] - опционально { fileName?: string }
 */
export async function setBackgroundFromSrc(refs, src, meta = {}) {
  // [PATCH] make function awaitable until image is loaded
  let __bgResolve = null; const __bgDone = new Promise((r)=>{ __bgResolve = r; });
=======
  stage.classList.add('lot-stage');
  return stage;
}

function parseAssetScale(name){
  try{
    const m = String(name||'').match(/@([0-9]+(?:\.[0-9]+)?)x(?!\w)/i);
    const s = m ? parseFloat(m[1]) : 1;
    return (s > 0 ? s : 1);
  }catch{ return 1; }
}
>>>>>>> Stashed changes

=======
  stage.classList.add('lot-stage');
  return stage;
}

function parseAssetScale(name){
  try{
    const m = String(name||'').match(/@([0-9]+(?:\.[0-9]+)?)x(?!\w)/i);
    const s = m ? parseFloat(m[1]) : 1;
    return (s > 0 ? s : 1);
  }catch{ return 1; }
}

>>>>>>> Stashed changes
export async function setBackgroundFromSrc(refs, src, meta = {}){
  if (!refs?.bgImg) return;
  const img = refs.bgImg;
  const guessName = meta?.fileName || img.getAttribute('data-filename') || img.alt || src;
  const done = new Promise(res => { img.onload = () => res(); img.onerror = () => res(); });
  // apply
  img.src = src; if (meta?.fileName) try{ img.setAttribute('data-filename', meta.fileName); }catch{}
  await done;

  const iw = Number(img.naturalWidth || 0) || 1;
  const ih = Number(img.naturalHeight || 0) || 1;
  const assetScale = (typeof meta.assetScale === 'number' && meta.assetScale > 0) ? meta.assetScale : parseAssetScale(guessName);
  const cssW = iw / assetScale;
  const cssH = ih / assetScale;

  const wrap = refs.wrapper || document.getElementById('wrapper');
  if (wrap){
    wrap.style.setProperty('--preview-ar', `${cssW} / ${cssH}`);
    wrap.style.setProperty('--preview-h', `${cssH}px`);
    wrap.style.setProperty('--asset-scale', String(assetScale));
  }
  setLastBgSize(cssW, cssH);
  setLastBgMeta({ fileName: guessName, assetScale });
  try { setPlaceholderVisible(refs, false); } catch {}
  layoutLottie(refs);
}

function createAnim(container, json){
  const engine = pickEngine();
  if (engine === 'rlottie'){
    return createRlottiePlayer({ container, loop: !!state.loopOn, autoplay: !!state.loopOn, animationData: json });
  }
  return window.lottie?.loadAnimation?.({
    container,
    renderer: 'svg',
    loop: !!state.loopOn,
    autoplay: !!state.loopOn,
    animationData: json
  });
}

function mountItem(refs, item){
  const stage = ensureStage(refs);
  // container
  const host = document.createElement('div');
  host.className = 'lot-item';
  host.dataset.id = item.id;
  host.style.position = 'absolute';
  host.style.width = `${item.w}px`;
  host.style.height = `${item.h}px`;
  host.style.left = '50%';
  host.style.top  = '50%';
  host.style.transformOrigin = '50% 50%';
  host.tabIndex = -1; // allow focus programmatically
  stage.appendChild(host);

  const mount = document.createElement('div');
  mount.className = 'lottie-mount';
  mount.style.width = '100%';
  mount.style.height = '100%';
  host.appendChild(mount);

  // selection/drag hooks
  host.addEventListener('pointerdown', (e) => {
    setSelectedId(item.id);
    document.querySelectorAll('.lot-item.selected').forEach(el => el.classList.remove('selected'));
    host.classList.add('selected');
  });

  // create player
  const anim = createAnim(mount, item.json);
  anims.set(item.id, anim);
  lastCreatedId = item.id;
  return host;
}

export function layoutLottie(refs){
  try{
    const stage = ensureStage(refs);
    const wrap = refs?.wrapper || document.getElementById('wrapper');
    const bgEl = refs?.bgImg || document.getElementById('bgImg');

    const cssW = +((state.lastBgSize && state.lastBgSize.w) || 0);
    const cssH = +((state.lastBgSize && state.lastBgSize.h) || 0);

    let realW = 0, realH = 0;
    if (bgEl && bgEl.getBoundingClientRect){
      const bgr = bgEl.getBoundingClientRect();
      realW = bgr.width || 0;
      realH = bgr.height || 0;
    }
    if (!(realW > 0 && realH > 0) && wrap && wrap.getBoundingClientRect){
      const br = wrap.getBoundingClientRect();
      realW = br.width || 0;
      realH = br.height || 0;
    }

    let fitScale = 1;
    if (cssW > 0 && cssH > 0 && realW > 0 && realH > 0){
      fitScale = Math.min(realW / cssW, realH / cssH);
      if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
    }

    // stage base size = background logical css size
    stage.style.width = (cssW ? cssW+'px' : '512px');
    stage.style.height= (cssH ? cssH+'px' : '512px');
    stage.style.transform = `translate(-50%, -50%) scale(${fitScale})`;

    // position each item
    const scale = fitScale;
    for (const it of state.scene){
      const host = stage.querySelector(`.lot-item[data-id="${it.id}"]`);
      if (!host) continue;
      const xpx = (it.offset?.x || 0) * scale;
      const ypx = (it.offset?.y || 0) * scale;
      host.style.transform = `translate(calc(-50% + ${xpx}px), calc(-50% + ${ypx}px))`;
    }

    // metrics overlay
    try{
      const rect = stage.getBoundingClientRect();
      window.__lpMetrics = {
        fitScale: fitScale,
        baseW: Math.round(cssW || rect.width/(fitScale||1)),
        baseH: Math.round(cssH || rect.height/(fitScale||1)),
        dispW: Math.round(rect.width),
        dispH: Math.round(rect.height),
        offsetX: (getItem(getSelectedId())?.offset?.x || 0),
        offsetY: (getItem(getSelectedId())?.offset?.y || 0),
        offsetXpx: Math.round((getItem(getSelectedId())?.offset?.x || 0) * fitScale),
        offsetYpx: Math.round((getItem(getSelectedId())?.offset?.y || 0) * fitScale)
      };
      if (typeof window.__updateOverlay === 'function') window.__updateOverlay(window.__lpMetrics);
    }catch{}
  }catch(e){ console.error('layoutLottie error', e); }
}

export function setLoop(on){
  state.loopOn = !!on;
  for (const [,anim] of anims){
    try { anim.loop = !!on; } catch {}
    try { if (on && anim.play) anim.play(); } catch {}
  }
}

export function restart(){
  for (const [,anim] of anims){
    try { anim.goToAndStop?.(0, true); } catch {}
    try { if (state.autoplayOn || state.loopOn) anim.play?.(); } catch {}
  }
}

export async function loadLottieFromData(refs, data){
  // Back-compat: load single and select it
  const json = typeof data === 'string' ? JSON.parse(data) : data;
  const item = addLottieItem(json, json?.nm || '');
  mountItem(refs, item);
  setSelectedId(item.id);
  layoutLottie(refs);
  return anims.get(item.id) || null;
}

// Explicit multi-add
export async function addLottieFromData(refs, data, name=''){
  const json = typeof data === 'string' ? JSON.parse(data) : data;
  const item = addLottieItem(json, name || json?.nm || '');
  mountItem(refs, item);
  setSelectedId(item.id);
  layoutLottie(refs);
  return item.id;
}

export function getAnim(){
  return anims.get(lastCreatedId) || null;
}
