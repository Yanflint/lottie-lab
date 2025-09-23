
// src/app/multi.js (v12)
import { pickEngine } from './engine.js';

const BLUE = 'rgba(30,144,255,1)';
const BLUE_BG = 'rgba(30,144,255,0.10)';

const state = {
  refs: null,
  items: [], // {id, el, player, pos:{x,y}, loop, w, h, json, name}
  selectedId: null,
};

function makeId(){ return 'lot_' + Math.random().toString(36).slice(2,9); }

export function initMulti(refs){
  state.refs = refs;
  try { window.__lp_multi_on = true; } catch {}
  if (refs?.lotStage) {
    refs.lotStage.style.position = 'relative';
    refs.lotStage.classList.add('lot-stage');
  }
}

export function hasAny(){ return state.items.length > 0; }
export function getAll(){ return state.items.slice(); }

export function getSelected(){
  return state.items.find(x => x.id === state.selectedId) || null;
}

function makeSelectionOverlay(){
  const sel = document.createElement('div');
  sel.className = 'lot-selection-overlay';
  sel.style.position = 'absolute';
  sel.style.inset = '0';
  sel.style.pointerEvents = 'none';
  sel.style.background = BLUE_BG;
  sel.style.boxShadow = `inset 0 0 0 2px ${BLUE}`;
  return sel;
}

function applyTransform(inst){
  if (!inst?.el) return;
  const s = getSceneScale(state.refs);
  const x = (inst.pos.x || 0) * s;
  const y = (inst.pos.y || 0) * s;
  inst.el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}

function select(inst){
  state.items.forEach(i => {
    try { i.el.querySelector('.lot-selection-overlay')?.remove(); } catch {}
    try { i.el.style.zIndex = '0'; } catch {}
  });
  if (!inst) { state.selectedId = null; return; }
  state.selectedId = inst.id;
  try { inst.el.appendChild(makeSelectionOverlay()); inst.el.style.zIndex = '1'; } catch {}
  try { const chk = document.getElementById('loopChk'); if (chk) chk.checked = !!inst.loop; } catch {}
}

function attachDrag(inst){
  const el = inst.el;
  let dragging = false, origin = {x:0,y:0}, start = {x:0,y:0};

  const onDown = (e) => {
    select(inst);
    dragging = true;
    origin = { ...inst.pos };
    start = { x: e.clientX, y: e.clientY };
    try { el.setPointerCapture(e.pointerId); } catch {}
    el.style.cursor = 'grabbing';
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    inst.pos = { x: origin.x + dx, y: origin.y + dy };
    applyTransform(inst);
    e.preventDefault();
  };
  const onUp = (e) => {
    dragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch {}
    el.style.cursor = 'grab';
    e.preventDefault();
  };

  el.style.touchAction = 'none';
  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('lostpointercapture', onUp);

  // click-to-play once when loop is off
  el.addEventListener('click', () => {
    try {
      if (!inst.loop && inst.player) {
        inst.player.stop?.();
        inst.player.goToAndStop?.(0, true);
        inst.player.play?.();
      }
    } catch {}
  });
}

export function moveSelectedBy(dx, dy){
  const inst = getSelected(); if (!inst) return;
  const s = getSceneScale(state.refs);
  const k = s || 1;
  inst.pos.x += (dx || 0) / k; inst.pos.y += (dy || 0) / k;
  applyTransform(inst);
}

export function setLoopForSelected(on){
  const inst = getSelected();
  if (!inst) return;
  inst.loop = !!on;
  try {
    if ('loop' in inst.player) inst.player.loop = !!on;
    inst.player.setLoop?.(!!on);
  } catch {}
}

export function restartSelected(){
  const inst = getSelected();
  if (!inst?.player) return;
  try { inst.player.stop?.(); inst.player.goToAndStop?.(0, true); inst.player.play?.(); } catch {}
}

export function snapshot(){
  return state.items.map(i => ({
    json: i.json || null,
    pos: { ...i.pos },
    loop: !!i.loop,
    name: i.name || ''
  }));
}

export async function addLottieFromJSON(refs, lotJson, name=''){
  if (!refs?.lotStage) return null;
  const mount = document.createElement('div');
  mount.className = 'lot-instance';
  Object.assign(mount.style, {
    position: 'absolute', left: '0', top: '0',
    willChange: 'transform', contain: 'content',
  });
  refs.lotStage.appendChild(mount);

  let compW = 0, compH = 0;
  try { compW = +lotJson?.w || 0; compH = +lotJson?.h || 0; } catch {}
  if (compW>0 && compH>0) {
    mount.style.width = compW + 'px';
    mount.style.height = compH + 'px';
  }

  const player = window.lottie?.loadAnimation ? window.lottie.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: lotJson
  }) : null;

  const inst = {
    id: makeId(),
    el: mount,
    player,
    pos: { x: 0, y: 0 },
    loop: true,
    w: compW,
    h: compH,
    json: lotJson,
    name
  };
  state.items.push(inst);
  attachDrag(inst);
  select(inst);
  applyTransform(inst);
  return inst;
}


function getSceneScale(refs){
  try {
    const img = refs?.bgImg;
    const rect = img?.getBoundingClientRect?.();
    const cssW = rect?.width || 0, cssH = rect?.height || 0;
    const natW = img?.naturalWidth || 0, natH = img?.naturalHeight || 0;
    if (natW > 0 && natH > 0) {
      const sW = cssW / natW, sH = cssH / natH;
      const s = Math.min(sW || 0, sH || 0) || 1;
      return s;
    }
  } catch {}
  return 1;
}

function applyTransformAll(){
  try { state.items.forEach(applyTransform); } catch {}
}
export function updateSceneScaleFromBackground(refs){ try { state.refs = refs || state.refs; } catch {} applyTransformAll(); }
export function remapPositionsOnBackgroundChange(oldW, oldH, newW, newH){
  if (!(oldW>0 && oldH>0 && newW>0 && newH>0)) { applyTransformAll(); return; }
  const sx = newW/oldW, sy = newH/oldH;
  for (const inst of state.items) {
    inst.pos.x = (inst.pos.x || 0) * sx;
    inst.pos.y = (inst.pos.y || 0) * sy;
  }
  applyTransformAll();
}
