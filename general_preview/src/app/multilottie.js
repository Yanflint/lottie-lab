// src/app/multilottie.js
// Minimal "layers" manager to host multiple Lottie animations concurrently.
// Each layer is an absolutely-positioned container inside #lotLayers.
// Depends only on rlottieAdapter.js (no changes to existing lottie.js required).

import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';

const layersState = {
  initDone: false,
  host: null,       // stage element to mount into
  container: null,  // #lotLayers
  layers: [],       // [{id, name, el, player, fps, durationMS, x, y, w, h}]
  idSeq: 1
};

function findStageHost() {
  // Try several known containers from the existing app — fallback to body
  return (
    document.getElementById('lotStage') ||
    document.getElementById('preview') ||
    document.querySelector('.lot-stage') ||
    document.querySelector('.wrapper') ||
    document.body
  );
}

export function initMultiLottie() {
  if (layersState.initDone) return layersState.container;
  const host = findStageHost();
  const container = document.createElement('div');
  container.id = 'lotLayers';
  container.className = 'lot-layers';
  Object.assign(container.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none', // layers themselves shouldn't block panning unless needed later
    zIndex: '10'
  });

  // Ensure host is positioned
  const hostStyle = getComputedStyle(host);
  if (hostStyle.position === 'static') host.style.position = 'relative';
  host.appendChild(container);

  layersState.host = host;
  layersState.container = container;
  layersState.initDone = true;
  return container;
}

function createLayerEl(id) {
  const wrap = document.createElement('div');
  wrap.className = 'lot-layer';
  wrap.dataset.layerId = String(id);
  Object.assign(wrap.style, {
    position: 'absolute',
    left: '0px',
    top: '0px',
    pointerEvents: 'auto', // allow later interactions (drag/select)
    userSelect: 'none',
    touchAction: 'none'
  });
  return wrap;
}

export function addLottieFromJSON(json, opts = {}) {
  initMultiLottie();
  const id = layersState.idSeq++;
  const name = opts.name || json?.nm || `Layer ${id}`;

  const wrap = createLayerEl(id);
  layersState.container.appendChild(wrap);

  const player = createRlottiePlayer({
    container: wrap,
    loop: opts.loop ?? true,
    autoplay: opts.autoplay ?? true,
    animationData: json
  });

  // Estimation of duration from Lottie JSON
  const ip = Number(json?.ip ?? 0);
  const op = Number(json?.op ?? 0);
  const fr = Number(json?.fr ?? opts.fps ?? 60); // default 60 fps
  const durationMS = Math.max(0, (op - ip) / (fr || 60)) * 1000;

  const layer = {
    id, name,
    el: wrap,
    player,
    fps: fr || 60,
    durationMS,
    x: 0, y: 0
  };
  layersState.layers.push(layer);

  // Basic pointer-drag to reposition layer (optional, minimal)
  let sx=0, sy=0, ox=0, oy=0, dragging=false;
  const onDown = (e) => {
    dragging = true;
    const p = (e.touches?.[0]) || e;
    sx = p.clientX; sy = p.clientY;
    ox = layer.x; oy = layer.y;
    wrap.classList.add('lp-grabbing');
    e.preventDefault();
    e.stopPropagation();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const p = (e.touches?.[0]) || e;
    const dx = p.clientX - sx;
    const dy = p.clientY - sy;
    setLayerPosition(id, ox + dx, oy + dy);
    e.preventDefault();
  };
  const onUp = () => {
    dragging = false;
    wrap.classList.remove('lp-grabbing');
  };
  wrap.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  return layer;
}

export function setLayerPosition(id, x, y) {
  const layer = layersState.layers.find(l => l.id === id);
  if (!layer) return;
  layer.x = Math.round(x);
  layer.y = Math.round(y);
  layer.el.style.transform = `translate(${layer.x}px, ${layer.y}px)`;
}

export function removeLayer(id) {
  const idx = layersState.layers.findIndex(l => l.id === id);
  if (idx === -1) return;
  try { layersState.layers[idx].player?.destroy?.(); } catch {}
  try { layersState.layers[idx].el?.remove?.(); } catch {}
  layersState.layers.splice(idx, 1);
}

export function getLayers() {
  return layersState.layers.slice();
}

export function stopAll() {
  for (const l of layersState.layers) { try { l.player?.stop?.(); } catch{} }
}
export function playAll() {
  for (const l of layersState.layers) { try { l.player?.play?.(); } catch{} }
}
