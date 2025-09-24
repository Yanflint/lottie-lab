
// src/app/multi.js
// Менеджер нескольких Lottie-слоёв (1..10), поверх PNG-фона.
// Не трогаем текущую логику layout/масштаба — переиспользуем layoutLottie и loadLottieFromData на каждый слой.

import { layoutLottie, loadLottieFromData } from './lottie.js';

const MAX_LAYERS = 10;

const layers = []; // { stage, mount, refs, offset:{x,y}, anim }
let commonRefs = null;

function collectCommonRefs() {
  const wrapper = document.getElementById('wrapper');
  const preview = document.getElementById('preview');
  const bgImg   = document.getElementById('bgImg');
  return { wrapper, preview, bgImg };
}

function makeLayerDOM() {
  const layer = document.createElement('div');
  layer.className = 'lottie-layer';

  const stage = document.createElement('div');
  stage.className = 'lot-stage';

  const mount = document.createElement('div');
  mount.className = 'lottie-mount';

  stage.appendChild(mount);
  layer.appendChild(stage);
  return { layer, stage, mount };
}

function buildRefsForLayer(layerObj) {
  // refs-объект в формате, который ожидают существующие функции
  return {
    wrapper: commonRefs.wrapper,
    preview: commonRefs.preview,
    bgImg:   commonRefs.bgImg,
    lotStage: layerObj.stage,
    lottieMount: layerObj.mount
  };
}

function ensureInit() {
  if (!commonRefs) {
    commonRefs = collectCommonRefs();
  }
  if (!layers.length) {
    // Слой 0 — существующие элементы из HTML (id=lotStage, id=lottie)
    const stage0 = document.getElementById('lotStage');
    const mount0 = document.getElementById('lottie');
    if (stage0 && mount0) {
      layers.push({
        stage: stage0,
        mount: mount0,
        refs: null,
        offset: { x: 0, y: 0 },
        anim: null
      });
    }
  }
}

export function initMulti() {
  ensureInit();

  // Свой обработчик resize: просто перекладываем текущую логику на все слои
  const relayout = () => relayoutAll();
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });

  // Экспорт в window для простых отладочных сценариев
  try { window.__multiLottie = { layers }; } catch {}
}

export async function addLottieFromData(data, indexHint = null) {
  ensureInit();

  let idx = (typeof indexHint === 'number') ? indexHint : layers.length - 1; // по умолчанию следующий
  if (idx < 0) idx = 0;

  // Если нет свободного слоя — создаём новый (до MAX_LAYERS)
  if (!layers[idx] || layers[idx].anim) {
    if (layers.length >= MAX_LAYERS) return null;
    const { layer, stage, mount } = makeLayerDOM();
    // Вставляем после .bg, чтобы ВСЕГДА быть поверх PNG
    const preview = commonRefs.preview;
    const bg = preview?.querySelector?.('.bg');
    if (bg && bg.parentNode) {
      bg.parentNode.insertBefore(layer, bg.nextSibling);
    } else {
      preview?.appendChild?.(layer);
    }
    const obj = { stage, mount, refs: null, offset: { x: layers.length*20, y: layers.length*20 }, anim: null };
    layers.push(obj);
    idx = layers.length - 1;
  }

  const layerObj = layers[idx];
  layerObj.refs = buildRefsForLayer(layerObj);

  // Загружаем анимацию штатной функцией
  const anim = await loadLottieFromData(layerObj.refs, data);
  layerObj.anim = anim;

  // Перелайаутим все слои (учитывая их собственные offsets)
  relayoutAll();
  return anim;
}

export async function loadMultipleLotties(datas) {
  ensureInit();
  const arr = Array.isArray(datas) ? datas.slice(0, MAX_LAYERS) : [];
  let firstLoaded = null;
  for (let i = 0; i < arr.length && i < MAX_LAYERS; i++) {
    const data = arr[i];
    const anim = await addLottieFromData(data, i); // каждый в свой индекс
    if (!firstLoaded) firstLoaded = anim;
  }
  return firstLoaded;
}

export function setOffset(index, x, y) {
  ensureInit();
  const layer = layers[index];
  if (!layer) return;
  layer.offset = { x: +x || 0, y: +y || 0 };
  relayoutAll();
}
export function getOffset(index) {
  ensureInit();
  return layers[index]?.offset || { x: 0, y: 0 };
}

export function relayoutAll() {
  ensureInit();
  for (let i = 0; i < layers.length; i++) {
    const layerObj = layers[i];
    if (!layerObj || !layerObj.stage) continue;
    // Временный прокси для текущей логики: выставляем оффсет в window, вызываем layoutLottie
    try {
      const off = layerObj.offset || { x: 0, y: 0 };
      window.__lotOffsetX = off.x;
      window.__lotOffsetY = off.y;
    } catch {}
    try {
      layoutLottie(layerObj.refs || buildRefsForLayer(layerObj));
    } catch (e) {
      // no-op
    }
  }
}
