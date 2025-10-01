// src/app/multilottie.js
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';

const layersState = {
  initDone: false,
  host: null,
  container: null,
  layers: [],
  idSeq: 1
};

function findStageHost() {
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
    pointerEvents: 'none',
    zIndex: '10'
  });

  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';
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
    pointerEvents: 'auto',
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

  const ip = Number(json?.ip ?? 0);
  const op = Number(json?.op ?? 0);
  const fr = Number(json?.fr ?? opts.fps ?? 60);
  const durationMS = Math.max(0, (op - ip) / (fr || 60)) * 1000;

  const layer = { id, name, el: wrap, player, fps: fr || 60, durationMS, x: 0, y: 0 };
  layersState.layers.push(layer);

  // Basic drag to move
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
  const onUp = () => { dragging = false; wrap.classList.remove('lp-grabbing'); };
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

export function getLayers() { return layersState.layers.slice(); }
export function stopAll() { for (const l of layersState.layers) { try { l.player?.stop?.(); } catch{} } }
export function playAll() { for (const l of layersState.layers) { try { l.player?.play?.(); } catch{} } }
