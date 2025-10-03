
// src/app/layers.js
// Minimal multi-Lottie layer manager for this project.
// Keeps backward compatibility: if you still use single-player API from lottie.js,
// this module operates side-by-side (we render into refs.lottieMount as multiple layers).

import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
import { state } from './state.js';

let _refs = null;
let _engine = null;
const _layers = new Map(); // id -> { id, name, data, transform, opacity, loop, autoplay, z, wrap, player }
let _selected = null;

function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export function initLayers({ refs }) {
  _refs = refs;
  _engine = pickEngine();

  const mount = refs.lottieMount || refs.lotStage || refs.preview || document.body;
  mount.classList.add('layers-enabled');

  // Delegate selection + drag
  mount.addEventListener('pointerdown', onPointerDown, { capture: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup',   onPointerUp,   { passive: true });
}

export function addLayerFromJSON(json, name){
  if (!json) return null;
  const id = uid();
  const z  = _layers.size ? Math.max(...[..._layers.values()].map(l=>l.z)) + 1 : 1;
  const transform = { x: 40 + (_layers.size*24)%200, y: 40 + (_layers.size*18)%160, scale: 1, rotate: 0 };
  const opacity   = 1;
  const loop      = !!state.loopOn;
  const autoplay  = !!state.autoplayOn;

  const wrap = document.createElement('div');
  wrap.className = 'layer-wrap';
  wrap.tabIndex = 0;
  wrap.dataset.id = id;
  wrap.style.zIndex = z;

  const container = _refs.lottieMount || _refs.lotStage || _refs.preview || document.body;
  container.appendChild(wrap);

  const player = createPlayer({ container: wrap, json, loop, autoplay });

  // Size from JSON once loaded
  try {
    player.addEventListener?.('DOMLoaded', () => {
      const w = Number(json.w || wrap.clientWidth || 512);
      const h = Number(json.h || wrap.clientHeight || 512);
      wrap.style.width  = `${w}px`;
      wrap.style.height = `${h}px`;
    });
  } catch {}

  const layer = { id, name: name || json?.nm || ('Lottie '+(_layers.size+1)), data: json, transform, opacity, loop, autoplay, z, wrap, player };
  _layers.set(id, layer);
  applyTransform(layer);
  selectLayer(id);
  return layer;
}

export function clearAllLayers(){
  for (const l of _layers.values()){
    try { l.player?.destroy?.(); } catch {}
    try { l.wrap?.remove?.(); } catch {}
  }
  _layers.clear();
  _selected = null;
}

export function getLotsPayload(){
  return [..._layers.values()].map(l => ({
    id: l.id,
    name: l.name,
    data: l.data,
    transform: l.transform,
    opacity: l.opacity,
    loop: !!l.loop,
    autoplay: !!l.autoplay,
    z: l.z
  }));
}

export function renderFromPayload({ refs }, data){
  if (!data) return;
  clearAllLayers();
  const lots = Array.isArray(data.lots)
    ? data.lots
    : (Array.isArray(data?.lot?.meta?._lpLots) ? data.lot.meta._lpLots.map(x => ({ data: x })) : [{ data: data.lot }]);

  // Keep order by z when present
  lots.sort((a,b) => (a.z||0) - (b.z||0));
  for (const l of lots){
    const layer = addLayerFromJSON(l.data, l.name);
    if (!layer) continue;
    // apply saved transform if any
    if (l.transform){
      layer.transform = { x:+(l.transform.x||0), y:+(l.transform.y||0), scale:+(l.transform.scale||1), rotate:+(l.transform.rotate||0) };
    }
    layer.opacity = (l.opacity==null)?1:+l.opacity;
    layer.loop = !!l.loop; layer.autoplay = !!l.autoplay;
    layer.z = +(l.z||layer.z); layer.wrap.style.zIndex = layer.z;
    applyTransform(layer);
    layer.wrap.style.opacity = String(layer.opacity);
  }
}

export function restartAll(){
  for (const l of _layers.values()){
    try { l.player?.stop?.(); l.player?.goToAndPlay?.(0,true); } catch {}
  }
}
export function setLoopAll(on){
  for (const l of _layers.values()){
    try { l.player.loop = !!on; l.loop = !!on; } catch {}
  }
}

export function selectLayer(id){
  _selected = id;
  for (const l of _layers.values()){
    l.wrap.classList.toggle('sel', l.id === id);
  }
}
export function bumpSelected(dx, dy){
  const l = _selected ? _layers.get(_selected) : null;
  if (!l) return;
  l.transform.x += (+dx||0);
  l.transform.y += (+dy||0);
  applyTransform(l);
}

function createPlayer({ container, json, loop, autoplay }){
  const eng = _engine || pickEngine();
  if (eng === 'rlottie'){
    return createRlottiePlayer({ container, loop, autoplay, animationData: json });
  } else {
    return window.lottie.loadAnimation({
      container, renderer: 'svg', loop, autoplay, animationData: json,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true }
    });
  }
}

function applyTransform(l){
  const t = l.transform || {x:0,y:0,scale:1,rotate:0};
  l.wrap.style.transform = `translate(${t.x}px, ${t.y}px) rotate(${t.rotate||0}deg) scale(${t.scale||1})`;
}

/* === Simple pointer drag === */
let _drag = null;
function onPointerDown(e){
  const el = e.target?.closest?.('.layer-wrap');
  if (!el) return;
  const id = el.dataset.id;
  selectLayer(id);
  const l = _layers.get(id);
  if (!l) return;
  _drag = { id, startX: e.clientX, startY: e.clientY, origX: l.transform.x, origY: l.transform.y };
  try { el.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
}
function onPointerMove(e){
  if (!_drag) return;
  const l = _layers.get(_drag.id);
  if (!l) return;
  const dx = e.clientX - _drag.startX;
  const dy = e.clientY - _drag.startY;
  l.transform.x = _drag.origX + dx;
  l.transform.y = _drag.origY + dy;
  applyTransform(l);
}
function onPointerUp(e){
  if (_drag){
    const el = _layers.get(_drag.id)?.wrap;
    try { el?.releasePointerCapture?.(e.pointerId); } catch {}
  }
  _drag = null;
}


// Utility used by keyboard shortcuts (imported dynamically)
export function __updateSelectedTransform({ dScale=0, dRotate=0 }){
  if (!_selected) return;
  const l = _layers.get(_selected);
  if (!l) return;
  if (dScale) {
    const ns = Math.max(0.05, Math.min(8, (l.transform.scale || 1) + dScale));
    l.transform.scale = ns;
  }
  if (dRotate) {
    l.transform.rotate = (+(l.transform.rotate||0) + dRotate);
  }
  applyTransform(l);
}
