// src/app/lottie.js
import { state, setLastBgSize, setLastBgMeta } from './state.js';
import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
import { setPlaceholderVisible } from './utils.js';
import { addLottieItem, setSelected, getSelectedItem, getLottieItems } from './state.js';


let anim = null; // legacy selected anim
const items = []; // multi-lottie items

function createLotItem(refs, w, h){
  const stage = refs?.lotStage; if (!stage) return null;
  const wrap = document.createElement('div');
  wrap.className = 'lot-item';
  wrap.style.position = 'absolute';
  wrap.style.left = '50%';
  wrap.style.top  = '50%';
  wrap.style.transformOrigin = '50% 50%';
  wrap.style.width = w+'px';
  wrap.style.height = h+'px';

  const overlay = document.createElement('div');
  overlay.className = 'lot-select-overlay';
  wrap.appendChild(overlay);

  const mount = document.createElement('div');
  mount.className = 'lottie-mount';
  wrap.appendChild(mount);

  stage.appendChild(wrap);
  return { wrap, mount };
}


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
export function layoutLottie(refs){
  const stage = refs?.lotStage;
  const wrap  = refs?.wrapper || refs?.previewBox || refs?.preview;
  if (!stage || !wrap) return;

  const cssW = +((state.lastBgSize && state.lastBgSize.w) || 0);
  const cssH = +((state.lastBgSize && state.lastBgSize.h) || 0);

  // Real rendered size of background
  let realW = 0, realH = 0;
  const bgEl = refs?.bgImg;
  if (bgEl && bgEl.getBoundingClientRect) {
    const bgr = bgEl.getBoundingClientRect();
    realW = bgr.width || 0; realH = bgr.height || 0;
  }

  // Fallback if no bg known yet
  const baseW = cssW || realW || 1;
  const baseH = cssH || realH || 1;
  const fitScale = baseW > 0 ? (realW / baseW) : 1;

  // Stage covers base coordinate system
  stage.style.position = 'absolute';
  stage.style.left = '50%';
  stage.style.top  = '50%';
  stage.style.width  = baseW + 'px';
  stage.style.height = baseH + 'px';
  stage.style.transformOrigin = '50% 50%';
  stage.style.transform = `translate(-50%, -50%) scale(${fitScale})`;

  // Position each item with its own pre-scale offsets
  const list = (typeof getLottieItems === 'function') ? getLottieItems() : items;
  for (const it of list) {
    const w = +it.w || 0, h = +it.h || 0;
    if (it.wrapEl) { it.wrapEl.style.width = w+'px'; it.wrapEl.style.height = h+'px'; }
    const x = (it.offset?.x || 0), y = (it.offset?.y || 0);
    const xpx = x; const ypx = y; // pre-scale pixels
    if (it.wrapEl) {
      it.wrapEl.style.transformOrigin = '50% 50%';
      it.wrapEl.style.transform = `translate(calc(-50% + ${xpx}px), calc(-50% + ${ypx}px))`;
    }
  }

  // Store metrics for overlays / debug
  try {
    const stageRect = stage.getBoundingClientRect();
    window.__lpMetrics = {
      baseW: Math.round(baseW), baseH: Math.round(baseH),
      dispW: Math.round(stageRect.width), dispH: Math.round(stageRect.height),
      fitScale
    };
    if (typeof window.__updateOverlay === 'function') window.__updateOverlay(window.__lpMetrics);
  } catch (e) {}
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

  if (!refs?.bgImg) return;

  // Пытаемся вычислить название файла для парсинга @2x
  const guessName = (() => {
    // при передаче meta.fileName используем его
    if (meta.fileName) return meta.fileName;
    // попробуем достать из атрибутов, если кто-то положил туда
    const fromAttr = refs.bgImg.getAttribute('data-filename') || refs.bgImg.alt;
    if (fromAttr) return fromAttr;
    // как крайний случай — попробуем вытащить имя из обычного URL
    try {
      const u = new URL(src);
      const pathname = u.pathname || '';
      const base = pathname.split('/').pop();
      return base || src;
    } catch (_) {
      return src; // data:/blob: сюда свалится — шанса достать имя нет
    }
  })();

  refs.bgImg.onload = async () => {
    try { __bgResolve && __bgResolve(); } catch (e) {}

    const iw = Number(refs.bgImg.naturalWidth || 0) || 1;
    const ih = Number(refs.bgImg.naturalHeight || 0) || 1;

    // Парсим коэффициент ретины из имени (mob@2x.png -> 2)
    const assetScale = (typeof meta.assetScale === 'number' && meta.assetScale > 0) ? meta.assetScale : parseAssetScale(guessName);

    // Приводим к «CSS-размеру», как это было бы на сайте
    const cssW = iw / assetScale;
    const cssH = ih / assetScale;

    const wrap = refs.wrapper;
    if (wrap) {
      wrap.style.setProperty('--preview-ar', `${cssW} / ${cssH}`);
      wrap.style.setProperty('--preview-h', `${cssH}px`);
      wrap.style.setProperty('--asset-scale', String(assetScale));
      // Сохраняем логический (CSS) размер и метаданные фона
      setLastBgSize(cssW, cssH);
      setLastBgMeta({ fileName: guessName, assetScale });
      wrap.classList.add('has-bg');
    }

    setPlaceholderVisible(refs, false);
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); } catch (e) {}
  };

  refs.bgImg.onerror = () => {
    try { __bgResolve && __bgResolve(); } catch (e) {}

    console.warn('Background image failed to load');
  };

  refs.bgImg.src = src;
  try { await __bgDone; } catch (e) {}
}

/** Жёсткий перезапуск проигрывания */
export function restart() {
  try {
    let it = null;
    try {
      // Prefer selected item if available
      if (typeof getSelectedItem === 'function') {
        it = getSelectedItem();
      }
    } catch (e) {}
    const player = (it && it.anim) ? it.anim : anim;
    try { player && player.goToAndPlay && player.goToAndPlay(0, true); } catch (e) {}
  } catch (e) {}
} catch (e) {} } catch (_) {}
}

/** Переключение loop "на лету" */
export function setLoop(on) {
  state.loopOn = !!on;
  if (anim) anim.loop = !!on;
}

/**
 * Загрузка Lottie из JSON (string|object)
 * — создаём инстанс
 * — задаём габариты стейджа по w/h из JSON
 */
export async function loadLottieFromData(refs, data){
  try {
    const lotJson = typeof data === 'string' ? JSON.parse(data) : data;
    if (!lotJson || typeof lotJson !== 'object') return null;

    const w = Number(lotJson.w || 0) || 512;
    const h = Number(lotJson.h || 0) || 512;

    // Create wrapper & mount
    let mountEl = null, wrapEl = null;
    // Reuse the initial #lottie mount for the first item to stay backward compatible
    const stage = refs?.lotStage;
    const firstMount = refs?.lottie;
    if (items.length === 0 && firstMount) {
      wrapEl = document.createElement('div');
      wrapEl.className = 'lot-item';
      wrapEl.style.position = 'absolute';
      wrapEl.style.left = '50%'; wrapEl.style.top = '50%';
      wrapEl.style.transformOrigin = '50% 50%';
      wrapEl.style.width = w+'px'; wrapEl.style.height = h+'px';

      const overlay = document.createElement('div'); overlay.className = 'lot-select-overlay';
      wrapEl.appendChild(overlay);

      // move existing #lottie inside the wrapper
      mountEl = firstMount;
      mountEl.parentElement?.replaceChild(wrapEl, mountEl);
      wrapEl.appendChild(mountEl);
      stage?.appendChild(wrapEl);
    } else {
      const pair = createLotItem(refs, w, h);
      if (!pair) return null;
      wrapEl = pair.wrap; mountEl = pair.mount;
    }

    const id = 'lot_'+Date.now()+'_'+Math.floor(Math.random()*99999);
    const loop = !!(window.__forceLoop ?? false);
    const autoplay = !!(window.__forceAutoplay ?? true);

    // Instantiate Lottie
    const animInst = window.lottie?.loadAnimation?.({
      container: mountEl,
      renderer: 'svg',
      loop: loop,
      autoplay: autoplay,
      animationData: lotJson,
    });

    const item = { id, loop, offset: {x: 0, y: 0}, w, h, mountEl, wrapEl, anim: animInst, json: lotJson };
    items.push(item);
    try { addLottieItem(item); } catch (e) {}

    // Selection
    const selectItem = () => {
      try { items.forEach(it => it.wrapEl?.classList?.toggle('selected', it.id===item.id)); } catch (e) {}
      try { setSelected(item.id); } catch (e) {}
      anim = item.anim; // legacy: selected anim
      // sync loop checkbox UI
      try { const chk = document.getElementById('loopChk'); if (chk) chk.checked = !!item.loop; } catch (e) {}
    };
    selectItem();
    wrapEl.addEventListener('pointerdown', (e)=>{
      selectItem();
      // Start dragging
      let lastX = e.clientX, lastY = e.clientY;
      const onMove = (ev)=>{
        const dx = (ev.clientX - lastX), dy = (ev.clientY - lastY);
        lastX = ev.clientX; lastY = ev.clientY;
        item.offset = { x: (item.offset?.x||0) + dx, y: (item.offset?.y||0) + dy };
        // move in pre-scale coords; layout will reapply
        try{ layoutLottie(refs); } catch (e) {}
      };
      const onUp = ()=>{ window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
      e.stopPropagation();
      e.preventDefault();
    });

    try { layoutLottie(refs); } catch (e) {}
    try { setPlaceholderVisible(refs, false); } catch (e) {}
    return animInst;
  } catch (e) {
    console.error('loadLottieFromData error:', e);
    return null;
  }
}

/** Экспорт текущей анимации (если нужно где-то ещё) */
export function getAnim() { return anim; }