
// src/app/multi.js
import { layoutLottie, loadLottieFromData } from './lottie.js';
import { setLotOffset, getLotOffset } from './state.js';

const MAX_LAYERS = 10;
const layers = []; // { layer, stage, mount, refs, offset:{x,y}, anim }
let commonRefs = null;
let selectedIndex = -1;

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
  return {
    wrapper: commonRefs.wrapper,
    preview: commonRefs.preview,
    bgImg:   commonRefs.bgImg,
    lotStage: layerObj.stage,
    lottieMount: layerObj.mount
  };
}

function ensureInit() {
  if (!commonRefs) commonRefs = collectCommonRefs();
  if (!layers.length) {
    const stage0 = document.getElementById('lotStage');
    const mount0 = document.getElementById('lottie');
    const layer0 = document.querySelector('.lottie-layer');
    if (stage0 && mount0 && layer0) {
      layers.push({ layer: layer0, stage: stage0, mount: mount0, refs: null, offset: { x: 0, y: 0 }, anim: null });
      selectedIndex = 0;
      try { setLotOffset(0,0); } catch {}
    }
  }
}

function applySelectionVisual(i) {
  layers.forEach((L, idx) => {
    if (!L || !L.layer) return;
    L.layer.classList.toggle('selected', idx === i);
  });
}

function focusLayer(i) {
  selectedIndex = i;
  const off = layers[i]?.offset || { x: 0, y: 0 };
  try { setLotOffset(off.x, off.y); } catch {}
  applySelectionVisual(i);
  // Raise selected above others without changing document order:
  layers.forEach((L, idx) => { if (L?.layer) L.layer.style.zIndex = (idx === i) ? '2' : '1'; });
}

function attachInteractions(idx) {
  const L = layers[idx]; if (!L) return;
  // Click to select
  L.layer.addEventListener('pointerdown', (e) => {
    focusLayer(idx);
  });

  // Drag to move (on mount)
  let dragging = false, sx=0, sy=0, base={x:0,y:0};
  const target = L.mount;
  function onDown(e){
    if (selectedIndex !== idx) focusLayer(idx);
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    base = { ...(layers[idx]?.offset || {x:0,y:0}) };
    try { target.setPointerCapture(e.pointerId); } catch {}
    try { target.style.cursor = 'grabbing'; } catch {}
    e.preventDefault();
  }
  function onMove(e){
    if (!dragging) return;
    const dx = e.clientX - sx; const dy = e.clientY - sy;
    const nx = base.x + dx, ny = base.y + dy;
    layers[idx].offset = { x: nx, y: ny };
    try { setLotOffset(nx, ny); } catch {}
    try { layoutLottie(layers[idx].refs || buildRefsForLayer(layers[idx])); } catch {}
  }
  function onUp(e){
    dragging = false;
    try { target.releasePointerCapture(e.pointerId); } catch {}
    try { target.style.cursor = 'grab'; } catch {}
  }
  target.style.touchAction = 'none';
  target.style.cursor = 'grab';
  target.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

export function clearSelection(){
  layers.forEach(L => { try { L.layer?.classList.remove('selected'); } catch {} });
  try { window.__multiLottie && (window.__multiLottie.selectedIndex = -1); } catch {}
  selectedIndex = -1;
}
export function initMulti() {
  mountDebugPanel();
  ensureInit();
  // Click outside any lottie -> clear selection
  try {
    const wrap = commonRefs.wrapper || document.getElementById('wrapper');
    if (wrap) {
      wrap.addEventListener('pointerdown', (e) => {
        const inside = e.target.closest && e.target.closest('.lottie-layer .lot-stage');
        if (!inside) { clearSelection(); }
      });
    }
  } catch {}

  // Global keyboard: Backspace deletes selected
  window.addEventListener('keydown', (e) => {
    const isBackspace = (e.key === 'Backspace') || (e.code === 'Backspace');
    if (!isBackspace) return;
    if (selectedIndex < 0) return;
    // Avoid interfering with typing in inputs
    const t = e.target;
    const isEditable = !!(t && (t.closest?.('input, textarea') || t.isContentEditable));
    if (isEditable) return;

    e.preventDefault();
    removeAt(selectedIndex);
  });

  try { window.__multiLottie = { layers, get selectedIndex(){return selectedIndex;}, focusLayer }; } catch {}
}


export async function addLottieFromData(data) {
  ensureInit();
  // Click outside any lottie -> clear selection
  try {
    const wrap = commonRefs.wrapper || document.getElementById('wrapper');
    if (wrap) {
      wrap.addEventListener('pointerdown', (e) => {
        const inside = e.target.closest && e.target.closest('.lottie-layer .lot-stage');
        if (!inside) { clearSelection(); }
      });
    }
  } catch {}
  // Reuse last layer if it has no anim yet
  let useIndex = -1;
  if (layers.length){
    const last = layers[layers.length-1];
    if (!(last && last.mount && last.mount.__lp_anim)) useIndex = layers.length-1;
  }
  if (useIndex === -1){
    if (layers.length >= MAX_LAYERS) return null;
    const dom = makeLayerDOM();
    const preview = commonRefs.preview;
    const bg = preview?.querySelector?.('.bg');
    if (bg && bg.parentNode) bg.parentNode.insertBefore(dom.layer, bg.nextSibling);
    else preview?.appendChild?.(dom.layer);
    const obj = { layer: dom.layer, stage: dom.stage, mount: dom.mount, refs: null, offset: { x: layers.length*20, y: layers.length*20 }, anim: null, data: null };
    obj.refs = buildRefsForLayer(obj);
    layers.push(obj);
    useIndex = layers.length-1;
  }
  const obj = layers[useIndex];
  if (!obj.refs) obj.refs = buildRefsForLayer(obj);
  const anim = await loadLottieFromData(obj.refs, data);
  obj.anim = anim;
  try { obj.data = (typeof data === 'string') ? JSON.parse(data) : data; } catch { obj.data = data; }
  try { obj.data = (typeof data === 'string') ? JSON.parse(data) : data; } catch { obj.data = data; }
  attachInteractions(useIndex);
  focusLayer(useIndex);
  relayoutAll();
  return anim;
}


export async function loadMultipleLotties(datas) {
  ensureInit();
  // Click outside any lottie -> clear selection
  try {
    const wrap = commonRefs.wrapper || document.getElementById('wrapper');
    if (wrap) {
      wrap.addEventListener('pointerdown', (e) => {
        const inside = e.target.closest && e.target.closest('.lottie-layer .lot-stage');
        if (!inside) { clearSelection(); }
      });
    }
  } catch {}
  const arr = Array.isArray(datas) ? datas.slice(0, MAX_LAYERS) : [];
  let firstLoaded = null;
  for (let i = 0; i < arr.length && i < MAX_LAYERS; i++) {
    const anim = await addLottieFromData(arr[i]);
    if (!firstLoaded) firstLoaded = anim;
  }
  return firstLoaded;
}

export function setOffset(index, x, y) {
  ensureInit();
  // Click outside any lottie -> clear selection
  try {
    const wrap = commonRefs.wrapper || document.getElementById('wrapper');
    if (wrap) {
      wrap.addEventListener('pointerdown', (e) => {
        const inside = e.target.closest && e.target.closest('.lottie-layer .lot-stage');
        if (!inside) { clearSelection(); }
      });
    }
  } catch {}
  const L = layers[index]; if (!L) return;
  L.offset = { x:+x||0, y:+y||0 };
  if (selectedIndex === index) { try { setLotOffset(L.offset.x, L.offset.y); } catch {} }
  relayoutAll();
}
export function getOffset(index) {
  ensureInit();
  // Click outside any lottie -> clear selection
  try {
    const wrap = commonRefs.wrapper || document.getElementById('wrapper');
    if (wrap) {
      wrap.addEventListener('pointerdown', (e) => {
        const inside = e.target.closest && e.target.closest('.lottie-layer .lot-stage');
        if (!inside) { clearSelection(); }
      });
    }
  } catch {}
  return layers[index]?.offset || { x: 0, y: 0 };
}

export function relayoutAll() {
  ensureInit();
  // Click outside any lottie -> clear selection
  try {
    const wrap = commonRefs.wrapper || document.getElementById('wrapper');
    if (wrap) {
      wrap.addEventListener('pointerdown', (e) => {
        const inside = e.target.closest && e.target.closest('.lottie-layer .lot-stage');
        if (!inside) { clearSelection(); }
      });
    }
  } catch {}
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i]; if (!L) continue;
    try {
      const off = L.offset || { x:0, y:0 };
      window.__lotOffsetX = off.x; window.__lotOffsetY = off.y;
      layoutLottie(L.refs || buildRefsForLayer(L));
    } catch {}
  }
}

export function removeAt(index) {
  ensureInit();
  // Click outside any lottie -> clear selection
  try {
    const wrap = commonRefs.wrapper || document.getElementById('wrapper');
    if (wrap) {
      wrap.addEventListener('pointerdown', (e) => {
        const inside = e.target.closest && e.target.closest('.lottie-layer .lot-stage');
        if (!inside) { clearSelection(); }
      });
    }
  } catch {}
  const L = layers[index]; if (!L) return;
  try { if (L.mount && L.mount.__lp_anim) { L.mount.__lp_anim.destroy?.(); L.mount.__lp_anim = null; } } catch {}
  try { L.layer?.remove?.(); } catch {}
  layers.splice(index, 1);
  // Re-focus
  if (!layers.length) {
    selectedIndex = -1;
    try { setLotOffset(0,0); } catch {}
  } else {
    const ni = Math.max(0, Math.min(index, layers.length - 1));
    focusLayer(ni);
  }
  relayoutAll();
}

// === Debug helpers (enabled with ?debug=1) ===
function dumpLayers() {
  const info = layers.map((L, i) => ({
    i,
    hasAnim: !!(L?.mount?.__lp_anim),
    offset: L?.offset,
    zIndex: (L?.layer && getComputedStyle(L.layer).zIndex) || null,
    stageSize: L?.stage ? { w: L.stage.offsetWidth, h: L.stage.offsetHeight } : null,
    display: (L?.layer && getComputedStyle(L.layer).display) || null,
    opacity: (L?.layer && getComputedStyle(L.layer).opacity) || null,
  }));
  try { console.table(info); } catch { console.log(info); }
  return info;
}

function mountDebugPanel() {
  const params = new URLSearchParams(location.search || '');
  if (params.get('debug') !== '1') return;
  const p = document.createElement('div');
  p.className = 'lp-debug';
  p.innerHTML = \`
  <style>
    .lp-debug{position:fixed;right:8px;bottom:8px;background:#111;color:#fff;padding:8px 10px;border-radius:8px;font:12px/1.3 ui-sans-serif,system-ui;z-index:9999;opacity:0.9}
    .lp-debug button{margin:2px 4px 2px 0;padding:4px 6px;border-radius:6px;border:none;background:#2a6;cursor:pointer;color:#fff}
    .lp-debug .row{margin-top:6px}
    .lp-debug .count{font-weight:600}
  </style>
  <div>Layers: <span class="count">-</span></div>
  <div class="row">
    <button data-cmd="dump">dump</button>
    <button data-cmd="outline">outline all</button>
    <button data-cmd="clear">clear select</button>
  </div>
  \`;
  document.body.appendChild(p);
  const countEl = p.querySelector('.count');
  function refresh(){ try { countEl.textContent = String(layers.length); } catch {} }
  refresh();
  p.addEventListener('click', (e)=>{
    const cmd = e.target?.getAttribute?.('data-cmd');
    if (cmd === 'dump') dumpLayers();
    if (cmd === 'outline') {
      document.body.classList.toggle('lp-outline-all', true);
      setTimeout(()=>document.body.classList.toggle('lp-outline-all', false), 1000);
    }
    if (cmd === 'clear') { try { clearSelection(); } catch {} }
  });
  try { window.__lp_debug_refresh = refresh; } catch {}
}
