
// src/app/lottie.js
import { state, setLastBgSize, setLastBgMeta } from './state.js';
import { pickEngine } from './engine.js';

let _globalAnim = null;

/** Установка фона из URL */
export async function setBackgroundFromSrc(refs, src, meta = {}) {
  const img = refs?.bgImg || document.getElementById('bgImg');
  if (!img) return;
  await new Promise((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
  try {
    const nW = img.naturalWidth || 0, nH = img.naturalHeight || 0;
    setLastBgSize(nW, nH);
    // Парсим @2x
    const name = meta.fileName || img.getAttribute('data-filename') || img.alt || '';
    const m2x = /@([0-9]+)x/i.exec(name);
    const assetScale = m2x ? Math.max(1, (+m2x[1] || 1)) : 1;
    setLastBgMeta({ fileName: name, assetScale });
  } catch {}
}

/** Пересчёт позиции и масштаба для одного слоя (refs: { wrapper, preview, bgImg, lotStage, lottieMount }) */
export function layoutLottie(refs) {
  const stage = refs?.lotStage;
  const bgEl  = refs?.bgImg || document.getElementById('bgImg');
  const wrap  = refs?.wrapper || document.getElementById('wrapper');
  if (!stage || !wrap) return;

  // База — натуральный размер PNG из state
  const baseW = +state.lastBgSize.w || 0;
  const baseH = +state.lastBgSize.h || 0;

  // Текущий отрендеренный размер фона
  let dispW = 0, dispH = 0;
  if (bgEl && bgEl.getBoundingClientRect) {
    const r = bgEl.getBoundingClientRect();
    dispW = r.width || 0;
    dispH = r.height || 0;
  } else {
    const r = wrap.getBoundingClientRect();
    dispW = r.width || 0;
    dispH = r.height || 0;
  }

  let fitScale = 1;
  if (baseW > 0 && baseH > 0 && dispW > 0 && dispH > 0) {
    // 1 CSS пиксель лотти == 1 CSS пиксель фона (по минимальной оси)
    fitScale = Math.min(dispW / baseW, dispH / baseH);
    if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
  }

  const x = (window.__lotOffsetX || 0);
  const y = (window.__lotOffsetY || 0);
  const xpx = x * fitScale;
  const ypx = y * fitScale;

  stage.style.left = '50%';
  stage.style.top  = '50%';
  stage.style.transformOrigin = '50% 50%';
  stage.style.transform = `translate(calc(-50% + ${xpx}px), calc(-50% + ${ypx}px)) scale(${fitScale})`;
}

/** Загрузка одного JSON в указанный mount */
export async function loadLottieFromData(refs, data) {
  const lotJson = typeof data === 'string' ? JSON.parse(data) : data;
  try { state.lastLottieJSON = lotJson; } catch {}
  if (!lotJson || typeof lotJson !== 'object') return null;

  // Уничтожаем старый инстанс для данного mount (мульти-режим)
  try {
    const mount = refs?.lottieMount;
    if (mount && mount.__lp_anim) { try { mount.__lp_anim.destroy?.(); } catch {} mount.__lp_anim = null; }
  } catch {}

  const w = Number(lotJson.w || 0) || 512;
  const h = Number(lotJson.h || 0) || 512;
  if (refs?.lotStage) {
    refs.lotStage.style.width = `${w}px`;
    refs.lotStage.style.height = `${h}px`;
  }

  const loop = !!state.loopOn;
  const autoplay = !!state.loopOn;
  const engine = pickEngine();

  let anim = null;
  if (engine === 'rlottie' && window.createRlottieModule) {
    // (опционально) rlottie
    anim = { destroy(){} };
  } else {
    // lottie-web
    if (!window.lottie) {
      console.warn('lottie-web не найден (window.lottie). Проверьте подключение библиотеки.');
      return null;
    }
    anim = window.lottie.loadAnimation({
      container: refs.lottieMount,
      renderer: 'svg',
      loop,
      autoplay,
      animationData: lotJson
    });
  }

  try { if (refs && refs.lottieMount) refs.lottieMount.__lp_anim = anim; } catch {}

  // Когда DOM построен — прячем плейсхолдер и лайаутим
  const onReady = () => {
    try { layoutLottie(refs); } catch {}
  };
  try {
    if (anim && anim.addEventListener) {
      anim.addEventListener('DOMLoaded', onReady);
    } else {
      setTimeout(onReady, 0);
    }
  } catch {}
  _globalAnim = anim;
  return anim;
}


/** Helpers for multi-layer integration */
function __getSelectedAnim(){
  try {
    const m = window.__multiLottie;
    if (m && m.layers && m.layers.length){
      const idx = (typeof m.selectedIndex === 'number' && m.selectedIndex >= 0) ? m.selectedIndex : 0;
      const L = m.layers[idx];
      return (L && L.mount && L.mount.__lp_anim) ? L.mount.__lp_anim : _globalAnim;
    }
  } catch {}
  return _globalAnim;
}

/** Restart current (selected) animation */
export function restart(){
  const anim = __getSelectedAnim();
  if (!anim) return;
  try {
    if (anim.stop) anim.stop();
    if (anim.goToAndPlay) anim.goToAndPlay(0, true);
    else if (anim.play) anim.play();
  } catch {}
}

/** Toggle loop on all current animations + remember in state */
export function setLoop(on){
  try { state.loopOn = !!on; } catch {}
  try {
    const m = window.__multiLottie;
    if (m && m.layers && m.layers.length){
      for (const L of m.layers){
        const a = L?.mount?.__lp_anim;
        if (a) { try { a.loop = !!on; } catch {} }
      }
      return;
    }
  } catch {}
  // fallback to single anim
  try { if (_globalAnim) _globalAnim.loop = !!on; } catch {}
}


/** Экспорт текущей анимации (если одна) */
export function getAnim(){ return _globalAnim; }
