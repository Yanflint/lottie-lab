
// src/app/multi.js
import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
import { state, setLastLottie } from './state.js';

function ensureRefs(refs) {
  refs = refs || {};
  if (!refs.lotStage) refs.lotStage = document.getElementById('lotStage');
  if (!refs.lotList) refs.lotList = document.getElementById('lotList');
  return refs;
}

function getStageCSSSizePx(refs) {
  const st = refs?.lotStage;
  if (!st) return { w: 0, h: 0 };
  const w = parseFloat(st.style.width) || 0;
  const h = parseFloat(st.style.height) || 0;
  return { w, h };
}
function getStageScale(refs) {
  const st = refs?.lotStage;
  if (!st) return 1;
  const css = getStageCSSSizePx(refs);
  const br = st.getBoundingClientRect?.() || { width: css.w, height: css.h };
  if (css.w > 0 && br.width > 0) return br.width / css.w;
  return 1;
}

let __id = 1;
function nextId(){ return `lot_${__id++}`; }

function createAnimForItem(refs, item) {
  const engine = pickEngine();
  const mount = document.createElement('div');
  mount.className = 'lottie-mount';
  const wrap = document.createElement('div');
  wrap.className = 'lot-item';
  wrap.tabIndex = 0; // focusable for keyboard
  wrap.dataset.id = item.id;
  wrap.style.width  = `${item.w}px`;
  wrap.style.height = `${item.h}px`;
  wrap.style.position = 'absolute';
  wrap.style.left = `${item.x|0}px`;
  wrap.style.top  = `${item.y|0}px`;

  // selection overlay
  const sel = document.createElement('div');
  sel.className = 'sel-overlay';
  wrap.appendChild(mount);
  wrap.appendChild(sel);

  refs.lotStage?.appendChild(wrap);

  let anim = null;
  const autoplay = !!item.loop;
  const loop = !!item.loop;

  if (engine === 'rlottie') {
    anim = createRlottiePlayer({ container: mount, loop, autoplay, animationData: item.data });
  } else {
    anim = window.lottie?.loadAnimation?.({
      container: mount, renderer: 'svg', loop, autoplay, animationData: item.data
    });
  }

  // Pause at 0 if loop is off
  if (!loop && anim && anim.stop) {
    try { anim.stop(); anim.goToAndStop?.(0, true); } catch {}
  }

  // pointer interactions for selection + dragging
  const onPointerDown = (e) => {
    selectById({ refs }, item.id);
    try { wrap.setPointerCapture?.(e.pointerId); } catch {}
    const scale = getStageScale(refs);
    const startX = item.x;
    const startY = item.y;
    const sx = e.clientX;
    const sy = e.clientY;
    const onMove = (ev) => {
      const dx = (ev.clientX - sx) / (scale || 1);
      const dy = (ev.clientY - sy) / (scale || 1);
      item.x = Math.round(startX + dx);
      item.y = Math.round(startY + dy);
      wrap.style.left = `${item.x}px`;
      wrap.style.top  = `${item.y}px`;
    };
    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp, true);
      try { wrap.releasePointerCapture?.(e.pointerId); } catch {}
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, true);
  };
  wrap.addEventListener('pointerdown', onPointerDown);

  item.__wrap = wrap;
  item.__mount = mount;
  item.__anim  = anim;
}

function destroyItem(item) {
  try { item.__anim?.destroy?.(); } catch {}
  if (item.__wrap?.parentNode) item.__wrap.parentNode.removeChild(item.__wrap);
  delete item.__wrap; delete item.__mount; delete item.__anim;
}

function rerenderList(refs) {
  refs = ensureRefs(refs);
  const list = refs.lotList;
  if (!list) return;
  const items = state.lottieList || [];
  if (!items.length) {
    list.innerHTML = `<div class="empty" role="note">Lottie: ничего не загружено</div>`;
    return;
  }
  list.innerHTML = items.map((it) => {
    const active = (it.id === state.selectedId) ? 'active' : '';
    const label = it?.name || it.id;
    return `<button type="button" class="item ${active}" data-id="${it.id}" title="${label}"><span class="name">${label}</span></button>`;
  }).join('');
  list.querySelectorAll('.item').forEach(btn => {
    btn.addEventListener('click', () => selectById({ refs }, btn.dataset.id));
  });
}

export function addLottieItems({ refs }, arr) {
  refs = ensureRefs(refs);
  const items = (state.lottieList || []);
  for (const it of arr) {
    const w = Number(it?.data?.w || 0) || 256;
    const h = Number(it?.data?.h || 0) || 256;
    const item = {
      id: nextId(),
      name: it?.name || 'animation.json',
      data: it.data,
      w, h,
      x: 0, y: 0,
      loop: true
    };
    items.push(item);
    createAnimForItem(refs, item);
  }
  state.lottieList = items;
  if (!state.selectedId && items.length) state.selectedId = items[0].id;
  updateSelectionStyles();
  syncSelectedToState();
  rerenderList(refs);
}

export function selectByIndex({ refs }, idx) {
  const items = state.lottieList || [];
  if (!(idx >= 0 && idx < items.length)) return;
  selectById({ refs }, items[idx].id);
}

export function selectById({ refs }, id) {
  state.selectedId = id;
  updateSelectionStyles();
  syncSelectedToState();
  rerenderList(refs);
  // sync UI checkbox if present
  try {
    const el = document.getElementById('loopChk');
    if (el) {
      const cur = (state.lottieList || []).find(i => i.id === id);
      el.checked = !!cur?.loop;
    }
  } catch {}
}

export function deleteSelected({ refs }) {
  const id = state.selectedId;
  if (!id) return;
  const items = state.lottieList || [];
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return;
  const [item] = items.splice(idx, 1);
  destroyItem(item);
  state.lottieList = items;
  state.selectedId = items[idx]?.id || items[idx-1]?.id || (items[0]?.id || null);
  updateSelectionStyles();
  syncSelectedToState();
  rerenderList(refs);
}

export function applyLoopToSelected({ refs }, on) {
  const id = state.selectedId;
  const items = state.lottieList || [];
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.loop = !!on;
  const engine = pickEngine();
  if (engine === 'rlottie') {
    // recreate to apply loop flag
    const p = { ...item };
    destroyItem(item);
    createAnimForItem(ensureRefs(refs), p);
    Object.assign(item, p);
  } else {
    try { if (item.__anim) item.__anim.loop = !!on; } catch {}
    if (!on) { try { item.__anim?.stop?.(); item.__anim?.goToAndStop?.(0, true); } catch {} }
    if (on)  { try { item.__anim?.play?.(); } catch {} }
  }
  updateSelectionStyles();
}

function syncSelectedToState(){
  try {
    const cur = (state.lottieList || []).find(i => i.id === state.selectedId) || null;
    setLastLottie(cur ? cur.data : null);
  } catch {}
}

function updateSelectionStyles() {
  const id = state.selectedId;
  (state.lottieList || []).forEach(it => {
    try {
      it.__wrap?.classList?.toggle?.('selected', it.id === id);
    } catch {}
  });
}

export function initMultiLottie({ refs }) {
  refs = ensureRefs(refs);
  // hydrate existing items if any (no-op first run)
  (state.lottieList || []).forEach(it => createAnimForItem(refs, it));

  // keyboard: delete selected
  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (['input','textarea','select'].includes(tag)) return;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      deleteSelected({ refs });
    }
  });
}


export function clearAll({ refs }) {
  (state.lottieList || []).forEach(it => { try { it.__anim?.destroy?.(); } catch {}; try { it.__wrap?.remove?.(); } catch {} });
  state.lottieList = [];
  state.selectedId = null;
}

export function hydrateLots({ refs }, lots = []) {
  clearAll({ refs });
  const items = [];
  for (const src of (lots || [])) {
    const w = Number(src?.data?.w || src?.w || 0) || 256;
    const h = Number(src?.data?.h || src?.h || 0) || 256;
    const item = {
      id: `lot_${Math.random().toString(36).slice(2,8)}`,
      name: src?.name || 'animation.json',
      data: src?.data,
      w, h,
      x: +src?.x || 0,
      y: +src?.y || 0,
      loop: !!src?.loop
    };
    items.push(item);
    createAnimForItem(refs, item);
  }
  state.lottieList = items;
  state.selectedId = items[0]?.id || null;
  updateSelectionStyles();
  try { const el = document.getElementById('loopChk'); if (el) el.checked = !!items[0]?.loop; } catch {}
}
