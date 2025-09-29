
// src/app/layers.js
// Multi-layer Lottie management without changing visible UI.
// Each layer is a full-size (== background size) stage that follows the background scale.
// Selection highlight (editor mode only), per-layer loop, drag, delete (Backspace), reset (KeyR).

import { state, setLastBgSize, setLastBgMeta } from './state.js';
import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
import { setPlaceholderVisible, afterTwoFrames } from './utils.js';

// DOM helpers
function el(tag, cls){ const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function isViewer(){ return document.documentElement.classList.contains('viewer'); }

const layers = []; // { id, container, box, mount, anim, json, loop, offset:{x,y} }
let selectedId = null;
let idSeq = 1;

function stage(refs){ return refs?.lotStage || document.getElementById('lotStage'); }
function wrapper(refs){ return refs?.wrapper || document.getElementById('wrapper'); }
function bgImg(refs){ return refs?.bgImg || document.getElementById('bgImg'); }

export function getLayers(){ return layers.slice(); }
export function hasAnyLayer(){ return layers.length > 0; }
export function getSelected(){ return layers.find(l=>l.id===selectedId) || null; }
export function getSelectedLoop(){ return !!(getSelected()?.loop); }

export function clearAllLayers(){
  for (const l of layers){ try{ l.anim?.destroy?.(); }catch{} try{ l.container.remove(); }catch{} }
  layers.length = 0; selectedId = null;
}

function ensureStageSizedToBg(refs){
  // Base size equals background natural size divided by assetScale (already computed by setBackgroundFromSrc)
  const w = +state.lastBgSize?.w || 512;
  const h = +state.lastBgSize?.h || 512;
  const st = stage(refs);
  if (st){ st.style.width = w + 'px'; st.style.height = h + 'px'; }
}

function layoutStage(refs){
  // Center & scale stage to match rendered background size. Per-layer offsets are applied inside layer boxes.
  const st = stage(refs);
  const wr = wrapper(refs);
  if (!st || !wr) return;

  // get rendered background rect
  let realW = 0, realH = 0;
  const bg = bgImg(refs);
  if (bg && bg.getBoundingClientRect){
    const r = bg.getBoundingClientRect();
    realW = r.width || 0; realH = r.height || 0;
  }

  const baseW = +state.lastBgSize?.w || 0;
  const baseH = +state.lastBgSize?.h || 0;

  // Fallback to wrapper size
  if (!realW || !realH){
    const r = wr.getBoundingClientRect();
    realW = r.width || 0; realH = r.height || 0;
  }
  if (!baseW || !baseH || !realW || !realH) return;

  const scaleX = realW / baseW;
  const scaleY = realH / baseH;
  const fitScale = Math.min(scaleX, scaleY);

  st.style.left = '50%';
  st.style.top  = '50%';
  st.style.transformOrigin = '50% 50%';
  st.style.transform = `translate(-50%, -50%) scale(${fitScale})`;

  // Expose for debug / other modules
  try { window.__lpFitScale = fitScale; window.__lpBaseW = baseW; window.__lpBaseH = baseH; } catch {}
  // Update selection outlines (they are sized in base pixels but scaled by parent)
  updateSelectionOutlines();
}

function updateSelectionOutlines(){
  for (const l of layers){
    const sel = l.container;
    sel.classList.toggle('selected', l.id === selectedId && !isViewer());
  }
}

export function selectLayer(id){
  selectedId = id;
  updateSelectionOutlines();
  // Sync loop checkbox UI if present
  try{
    const loopChk = document.getElementById('loopChk');
    if (loopChk) loopChk.checked = !!getSelected()?.loop;
  }catch{}
}

function nextId(){ return 'layer_' + (idSeq++); }


function createLayerDOM(refs){
  const cont = el('div', 'lot-layer'); // positioned absolute by CSS
  cont.setAttribute('role', 'img');
  cont.setAttribute('aria-label', 'Lottie слой');

  const box = el('div', 'lot-box'); // size will be set to animation w/h
  const mount = el('div', 'lot-mount'); // fills the box

  box.appendChild(mount);
  cont.appendChild(box);
  const st = stage(refs);
  st?.appendChild(cont);

  // Center; width/height assigned later
  box.style.left = '50%';
  box.style.top  = '50%';
  box.style.transform = 'translate(-50%, -50%)';

  return { container: cont, box, mount };
}


function wireSelectionAndDrag(refs, layer){
  // Select on pointerdown
  const onPD = (e)=>{ selectLayer(layer.id); };
  layer.container.addEventListener('pointerdown', onPD);

  // Drag selected layer (pointer events on container)
  let dragging=false, sx=0, sy=0, start={x:0,y:0};
  const onDown = (e)=>{
    selectLayer(layer.id);
    try{ layer.container.setPointerCapture(e.pointerId); }catch{}
    dragging = true; sx = e.clientX; sy = e.clientY; start = { ...layer.offset };
    if (!isViewer()) document.body.classList.add('lp-grabbing');
  };
  const onMove = (e)=>{
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    const scale = window.__lpFitScale || 1;
    const nx = start.x + dx / scale;
    const ny = start.y + dy / scale;
    setLayerOffset(layer.id, nx, ny);
  };
  const onUp = (e)=>{
    dragging=false;
    try{ layer.container.releasePointerCapture(e.pointerId); }catch{}
    document.body.classList.remove('lp-grabbing');
  };
  layer.container.addEventListener('pointerdown', onDown);
  layer.container.addEventListener('pointermove', onMove);
  layer.container.addEventListener('pointerup', onUp);
  layer.container.addEventListener('pointercancel', onUp);
  layer._dragHandlers = { onPD, onDown, onMove, onUp };
}

function destroyLayer(layer){
  try{
    if (layer._dragHandlers){
      const h = layer._dragHandlers;
      layer.container.removeEventListener('pointerdown', h.onPD);
      layer.container.removeEventListener('pointerdown', h.onDown);
      layer.container.removeEventListener('pointermove', h.onMove);
      layer.container.removeEventListener('pointerup', h.onUp);
      layer.container.removeEventListener('pointercancel', h.onUp);
    }
  }catch{}
  try{ layer.anim?.destroy?.(); }catch{}
  try{ layer.container.remove(); }catch{}
}

export function removeSelectedLayer(){
  const idx = layers.findIndex(l=>l.id===selectedId);
  if (idx>=0){
    destroyLayer(layers[idx]);
    layers.splice(idx,1);
    selectedId = layers[idx]?.id || layers[idx-1]?.id || null;
    updateSelectionOutlines();
  }
}

export function setLayerOffset(id, x, y){
  const l = layers.find(l=>l.id===id); if (!l) return;
  l.offset = { x: +x||0, y: +y||0 };
  l.box.style.transform = `translate(calc(-50% + ${l.offset.x}px), calc(-50% + ${l.offset.y}px))`;
}

export function resetAllToCenter(){
  for (const l of layers){
    l.offset = { x: 0, y: 0 };
    l.box.style.transform = `translate(-50%, -50%)`;
  }
}

export function setSelectedLoop(on){
  const l = getSelected(); if (!l) return;
  l.loop = !!on;
  try { if (l.anim) l.anim.loop = !!on; } catch {}
}

export function restartAll(){
  for (const l of layers){
    try{
      l.anim?.stop?.();
      // play for both loop and non-loop to "retrigger" from 0
      if (l.anim?.goToAndPlay) l.anim.goToAndPlay(0, true);
      else if (l.anim?.play){ l.anim.goToAndStop?.(0); l.anim.play(); }
    }catch{}
  }
}


export async function addLayerFromData(refs, json){
  if (!json) return null;
  ensureStageSizedToBg(refs);

  const { container, box, mount } = createLayerDOM(refs);
  const lotJson = (typeof json === 'string') ? JSON.parse(json) : json;

  // Use animation's intrinsic size for 1:1 pixel mapping
  const w = Math.max(1, Number(lotJson.w || 0) || 512);
  const h = Math.max(1, Number(lotJson.h || 0) || 512);
  box.style.width = w + 'px';
  box.style.height = h + 'px';

  const engine = pickEngine();
  let anim = null;
  if (engine === 'rlottie'){
    anim = createRlottiePlayer({ container: mount, loop: false, autoplay: false, animationData: lotJson });
  }else{
    anim = window.lottie?.loadAnimation?.({
      container: mount, renderer: 'svg', loop: false, autoplay: false, animationData: lotJson
    });
  }

  const id = nextId();
  const layer = { id, container, box, mount, anim, json: lotJson, loop: false, offset: { x: 0, y: 0 } };
  layers.push(layer);
  selectLayer(id);
  wireSelectionAndDrag(refs, layer);

  setPlaceholderVisible(refs, false);
  wrapper(refs)?.classList.add('has-lottie');

  if (anim && anim.addEventListener){
    anim.addEventListener('DOMLoaded', ()=>{ layoutStage(refs); });
  } else {
    await afterTwoFrames(); layoutStage(refs);
  }
  return layer;
}


// Global click/tap to restart (both editor and viewer)
export function bindGlobalRestart({ refs }){
  const mount = wrapper(refs) || document.body;
  const root = document.body;
  if (mount && !mount.__lp_clickBound){
    mount.__lp_clickBound = true;
    let lastUserPlayAt = 0;
    const SUPPRESS_MS = 500;

    if (root && !root.__lp_clickSuppressor){
      root.__lp_clickSuppressor = true;
      root.addEventListener('click', (ev) => {
        const now = Date.now();
        if (now - lastUserPlayAt < SUPPRESS_MS) {
          try { ev.stopImmediatePropagation(); ev.stopPropagation(); ev.preventDefault(); } catch {}
        }
      }, true);
    }

    const userPlay = (ev)=>{
      const now = Date.now();
      lastUserPlayAt = now;
      restartAll();
      try{ ev.preventDefault(); }catch{}
    };

    const onDown = (ev)=>{ userPlay(ev); };
    const onClick = (ev)=>{ userPlay(ev); };

    // capture pointer and click
    mount.addEventListener('pointerdown', onDown);
    mount.addEventListener('click', onClick);
  }
}

// Re-layout on resize / bg change
export function onResize(refs){ layoutStage(refs); }

// Serialize state for sharing
export function exportPayload(){
  if (!state.lastBgMeta || !state.lastBgSize || !bgImg()) throw Object.assign(new Error('Загрузите фон'), { code: 'NO_BG' });
  if (layers.length === 0) throw Object.assign(new Error('Загрузите анимацию'), { code: 'NO_LOTTIE' });

  const bg = { value: bgImg()?.src || '', name: state.lastBgMeta?.fileName || '', assetScale: +state.lastBgMeta?.assetScale || 1 };
  const outs = layers.map(l => {
    const meta = { _lpOffset: { ...l.offset }, _lpBgMeta: { fileName: state.lastBgMeta?.fileName || '', assetScale: +state.lastBgMeta?.assetScale || 1 } };
    try{ meta._lpName = (l.json?.meta?.g || l.json?.nm || 'layer'); }catch{}
    return { json: l.json, loop: !!l.loop, meta };
  });

  return { bg, layers: outs, opts: {} };
}

// Load from payload (back-compat with single lot format)
export async function importPayload(refs, data){
  if (!data || typeof data !== 'object') return false;

  try{ state.loopOn = false; }catch{}
  // Hide stage during apply to avoid flash
  try{ if (refs?.lotStage) refs.lotStage.style.visibility = 'hidden'; }catch{}

  // 1) BG
  if (data.bg){
    const src  = (typeof data.bg === 'string') ? data.bg : data.bg.value;
    const meta = (typeof data.bg === 'object') ? { fileName: data.bg.name, assetScale: data.bg.assetScale } : {};
    try{
      if (!meta.fileName && data.lot && data.lot.meta && data.lot.meta._lpBgMeta){
        meta.fileName = data.lot.meta._lpBgMeta.fileName;
        meta.assetScale = data.lot.meta._lpBgMeta.assetScale;
      }
    }catch{}
    if (src){
      const { setBackgroundFromSrc } = await import('./lottie.js');
      await setBackgroundFromSrc(refs, src, meta);
    }
  }

  // 2) Layers
  clearAllLayers();
  const layersIn = Array.isArray(data.layers) ? data.layers : [];
  if (layersIn.length){
    for (const l of layersIn){
      const obj = (typeof l.json === 'string') ? JSON.parse(l.json) : (l.json || l);
      const layer = await addLayerFromData(refs, obj);
      if (layer){
        const off = l?.meta?._lpOffset || l?.offset || { x: 0, y: 0 };
        setLayerOffset(layer.id, +off.x||0, +off.y||0);
        const lp = !!(l.loop);
        layer.loop = lp; try{ layer.anim.loop = lp; }catch{}
      }
    }
  } else if (data.lot) {
    // backward compatibility: single lot
    const obj = (typeof data.lot === 'string') ? JSON.parse(data.lot) : (data.lot?.json || data.lot);
    const layer = await addLayerFromData(refs, obj);
    if (layer){
      try{
        const m = data?.lot?.meta?._lpOffset;
        if (m && typeof m.x === 'number' && typeof m.y === 'number') setLayerOffset(layer.id, m.x||0, m.y||0);
      }catch{}
      const lp = !!(data?.opts?.loop);
      layer.loop = lp; try{ layer.anim.loop = lp; }catch{}
    }
  }

  try{ layoutStage(refs); }catch{}
  try{ if (refs?.lotStage) refs.lotStage.style.visibility = ''; }catch{}
  return true;
}

// Keyboard: Backspace to delete selected; R to reset all to center (layout-independent)
export function bindShortcuts({ refs }){
  window.addEventListener('keydown', (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.code === 'Backspace'){
      removeSelectedLayer();
      try{ e.preventDefault(); }catch{}
    } else if (e.code === 'KeyR'){
      resetAllToCenter();
      try{ e.preventDefault(); }catch{}
      layoutStage(refs);
    }
  });
}

export function initLayers({ refs }){
  // Ensure stage sizing reacts to bg
  ensureStageSizedToBg(refs);
  // Relayout on resize
  window.addEventListener('resize', () => layoutStage(refs));
  // Bind interactions
  bindGlobalRestart({ refs });
  bindShortcuts({ refs });
  // initial select none
  updateSelectionOutlines();
  // For external modules
  return {
    addLayerFromData: (json)=>addLayerFromData(refs, json),
    exportPayload,
    importPayload: (data)=>importPayload(refs, data),
    onResize: ()=>layoutStage(refs),
    selectLayer,
    setSelectedLoop,
    restartAll,
    hasAnyLayer,
    getSelectedLoop,
  };
}
