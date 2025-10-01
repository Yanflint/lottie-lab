
// src/app/layers.js
import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
// Multi-layer manager: multiple Lottie animations shown simultaneously inside #preview,
// each has its own (x,y) and can be toggled visible/hidden. Layers are clipped by preview bounds.

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
let selected = null;
let stageEl = null;

async function ensureLottie(){
  if (window.lottie && window.lottie.loadAnimation) return;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = CDN; s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('Failed to load lottie-web'));
    document.head.appendChild(s);
  });
}

function ensureStage(){
  if (stageEl && document.body.contains(stageEl)) return stageEl;
  const preview = document.getElementById('preview') || document.body;
  stageEl = document.getElementById('multiStage');
  if (!stageEl){
    stageEl = document.createElement('div');
    stageEl.id = 'multiStage';
    stageEl.className = 'multi-stage';
    preview.appendChild(stageEl);
  }
  return stageEl;
}

function uid(){ return 'layer_'+Math.random().toString(36).slice(2)+Date.now().toString(36); }

function select(el){
  if (selected === el) return;
  if (selected) selected.classList.remove('selected');
  selected = el || null;
  if (selected) selected.classList.add('selected');
}

function makeDraggable(el){
  let sx=0, sy=0, ox=0, oy=0, dragging=false;
  const onDown = (e) => {
    try { e.preventDefault(); } catch {}
    select(el);
    dragging = true;
    sx = (e.clientX ?? 0); sy = (e.clientY ?? 0);
    const m = el.__pos || {x:0,y:0};
    ox = m.x; oy = m.y;
    el.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!dragging) return;
    const dx = (e.clientX ?? 0) - sx;
    const dy = (e.clientY ?? 0) - sy;
    const nx = ox + dx;
    const ny = oy + dy;
    el.__pos = { x:nx, y:ny };
    el.style.transform = `translate(${nx}px, ${ny}px)`;
  };
  const onUp = (e) => { dragging = false; try { el.releasePointerCapture?.(e.pointerId); } catch {} };
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  el.addEventListener('click', ()=>select(el));
}

function ensureStyles(){
  if (document.getElementById('multiStyles')) return;
  const css = document.createElement('style');
  css.id = 'multiStyles';
  css.textContent = `
  /* Ensure preview clips children; keep both selectors for robustness */
  #preview, .preview { position: relative; overflow: hidden; }
  .multi-stage{ position:absolute; inset:0; pointer-events:none; z-index: 40; overflow:hidden; }
  .multi-stage .lot-layer{ position:absolute; left:0; top:0; pointer-events:auto; outline: 0; }
  .multi-stage .lot-layer.selected{ outline: 1px dashed var(--accent, #6ee7b7); outline-offset: 2px; }
  `;
  document.head.appendChild(css);
}

// Public API

/** Add a Lottie layer and show it immediately. Returns layer id.
 *  Optional tagId binds a logical id (e.g., history id) to DOM via data-history-id.
 */
export async function addLottieLayer(refs, animationData, name='Lottie', tagId=null){
  await ensureLottie();
  ensureStyles();
  const stage = ensureStage();

  const layer = document.createElement('div');
  layer.className = 'lot-layer';
  layer.dataset.id = uid();
  if (tagId) layer.dataset.historyId = String(tagId);
  layer.dataset.name = String(name||'Lottie');
  layer.__pos = { x: 0, y: 0 };
  layer.style.transform = `translate(0px, 0px)`;

  const player = document.createElement('div');
  player.className = 'lot-player';
  layer.appendChild(player);

  stage.appendChild(layer);

  // Start near center
  try {
    const st = stage.getBoundingClientRect();
    const w = Number(animationData?.w || 0) || 256;
    const hh = Number(animationData?.h || 0) || 256;
    const nx = Math.max(0, (st.width - w) / 2);
    const ny = Math.max(0, (st.height - hh) / 2);
    layer.__pos = { x:nx, y:ny };
    layer.style.transform = `translate(${nx}px, ${ny}px)`;
  } catch {}

  const anim = window.lottie.loadAnimation({
    container: player, renderer: 'svg', loop: true, autoplay: true, animationData
  });
  layer.__anim = anim;

  makeDraggable(layer);
  select(layer);
  return layer.dataset.id;
}

export function getSelectedLayer(){ return selected || null; }
export function setLayerPosition(id, x, y){
  const el = document.querySelector(`.multi-stage .lot-layer[data-id="${id}"]`);
  if (!el) return false;
  el.__pos = { x:+x||0, y:+y||0 };
  el.style.transform = `translate(${el.__pos.x}px, ${el.__pos.y}px)`;
  return true;
}
export function removeLayer(id){
  const el = document.querySelector(`.multi-stage .lot-layer[data-id="${id}"]`);
  if (!el) return false;
  try { el.__anim?.destroy?.(); } catch {}
  el.remove();
  if (selected === el) selected = null;
  return true;
}

/* --- New helpers to integrate with History --- */
export function getLayerByTag(tagId){
  return document.querySelector(`.multi-stage .lot-layer[data-history-id="${CSS.escape(String(tagId))}"]`) || null;
}
export async function ensureLayerFor(tagId, animationData, name='Lottie'){
  let el = getLayerByTag(tagId);
  if (el) return el.dataset.id;
  return addLottieLayer({}, animationData, name, tagId);
}
export function setLayerVisibleByTag(tagId, visible){
  const el = getLayerByTag(tagId);
  if (!el) return false;
  el.style.display = visible ? '' : 'none';
  return true;
}
export function isLayerVisibleByTag(tagId){
  const el = getLayerByTag(tagId);
  if (!el) return false;
  return el.style.display !== 'none';
}

/** Initialize hotkeys for nudging selected layer */
export function initLayersHotkeys(){
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.closest?.('input, textarea, [contenteditable]') || t.isContentEditable)) return;
    const el = selected; if (!el) return;
    const step = e.shiftKey ? 10 : 1;
    let dx=0, dy=0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;
    e.preventDefault();
    const p = el.__pos || {x:0,y:0};
    el.__pos = { x: p.x + dx, y: p.y + dy };
    el.style.transform = `translate(${el.__pos.x}px, ${el.__pos.y}px)`;
  });
}

document.addEventListener('DOMContentLoaded', () => { try { initLayersHotkeys(); } catch {} });
