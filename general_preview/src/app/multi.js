// src/app/multi.js
import { pickEngine } from './engine.js';
import { createPlayer as createRlottiePlayer } from './rlottieAdapter.js';
import { state, bumpLotOffset } from './state.js';

let _inited = false;
let _refs = null;
let _layersRoot = null;
let _extras = []; // [{ id, container, player, json, meta:{name?}, offset:{x,y} }]
let _idSeq = 1;
let _panel = null;

function $id(id){ return document.getElementById(id); }

function ensureRefs() {
  if (_refs) return _refs;
  _refs = {
    wrapper: document.getElementById('preview') || document.querySelector('.wrapper'),
    bgImg: document.getElementById('bgImg'),
    lotStage: document.getElementById('lotStage'),
    lottieMount: document.getElementById('lottie'),
  };
  return _refs;
}

function ensureLayersRoot() {
  ensureRefs();
  if (_layersRoot && _layersRoot.parentNode) return _layersRoot;
  const st = _refs?.lotStage;
  if (!st) return null;
  // A container to host extra layers (sits UNDER the primary "#lottie")
  const root = document.createElement('div');
  root.id = 'lotLayers';
  root.className = 'lot-layers';
  // Ensure same size and stacking inside the stage
  root.style.position = 'absolute';
  root.style.left = '0';
  root.style.top = '0';
  root.style.right = '0';
  root.style.bottom = '0';
  root.style.pointerEvents = 'none'; // extras are not draggable by default
  try {
    // Insert BEFORE primary to render below it by default
    st.insertBefore(root, $id('lottie'));
  } catch {
    st.appendChild(root);
  }
  _layersRoot = root;
  return _layersRoot;
}

function makeLayerContainer() {
  const c = document.createElement('div');
  c.className = 'lot-layer-extra';
  c.style.position = 'absolute';
  c.style.left = '0';
  c.style.top = '0';
  c.style.width = '100%';
  c.style.height = '100%';
  c.style.transform = 'translate(0px, 0px)';
  c.style.pointerEvents = 'none';   // not draggable; we move via panel controls
  c.style.willChange = 'transform';
  return c;
}

function createPlayer(container, lotJson, { loop, autoplay } = {}) {
  const engine = pickEngine();
  if (engine === 'rlottie') {
    return createRlottiePlayer({ container, loop: !!loop, autoplay: !!autoplay, animationData: lotJson });
  }
  // lottie-web
  return window.lottie.loadAnimation({
    container, renderer: 'svg', loop: !!loop, autoplay: !!autoplay, animationData: lotJson
  });
}

function updateTransform(layer) {
  const x = Math.round(+layer.offset?.x || 0);
  const y = Math.round(+layer.offset?.y || 0);
  layer.container.style.transform = `translate(${x}px, ${y}px)`;
}

function syncPanel() {
  if (!_panel) return;
  // Rebuild the list of items
  const list = _panel.querySelector('.lp-layers-list');
  if (!list) return;
  list.innerHTML = '';
  const mkItem = (id, title, type) => {
    const li = document.createElement('div');
    li.className = 'lp-layer-item';
    li.setAttribute('data-id', String(id));
    li.setAttribute('data-type', type);

    const btn = document.createElement('button');
    btn.className = 'btn tertiary';
    btn.type = 'button';
    btn.textContent = title;

    const del = document.createElement('button');
    del.className = 'btn danger';
    del.type = 'button';
    del.textContent = '×';
    del.title = 'Удалить слой';
    del.style.marginLeft = '6px';

    li.appendChild(btn);
    if (type === 'extra') li.appendChild(del);
    list.appendChild(li);

    if (type === 'extra') {
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        removeExtraById(id);
      });
    }
    btn.addEventListener('click', () => {
      setActive(id, type);
    });
  };

  mkItem(0, 'Основная', 'primary');
  _extras.forEach((ex, idx) => mkItem(ex.id, `Доп. ${idx+1}`, 'extra'));

  // Selection highlight
  const selId = _active?.id || 0;
  const selType = _active?.type || 'primary';
  list.querySelectorAll('.lp-layer-item').forEach(el => {
    const isSel = (Number(el.getAttribute('data-id')) === selId) &&
                  (el.getAttribute('data-type') === selType);
    el.classList.toggle('selected', isSel);
  });

  // Position readouts
  const ox = _active?.offset?.x || 0;
  const oy = _active?.offset?.y || 0;
  const posEl = _panel.querySelector('.lp-pos');
  if (posEl) posEl.textContent = `${Math.round(ox)} × ${Math.round(oy)} px`;
}

let _active = { id: 0, type: 'primary', ref: null, offset: null };

function setActive(id, type='extra') {
  if (type === 'primary') {
    _active = { id: 0, type: 'primary', ref: $id('lottie'), offset: (state?.lotOffset || {x:0,y:0}) };
  } else {
    const layer = _extras.find(x => x.id === id);
    if (!layer) return;
    _active = { id, type: 'extra', ref: layer, offset: layer.offset };
  }
  syncPanel();
}

function nudge(dx, dy) {
  if (_active?.type === 'primary') {
    // Bump global offset using public API if available
    try { bumpLotOffset(dx, dy); } catch { window.dispatchEvent(new CustomEvent('lp:bump-offset', { detail: { dx, dy } })); }
    return;
  }
  // Move extra
  const layer = _extras.find(x => x.id === _active.id);
  if (!layer) return;
  layer.offset = { x: (layer.offset?.x || 0) + dx, y: (layer.offset?.y || 0) + dy };
  updateTransform(layer);
  setActive(layer.id, 'extra'); // refresh panel
}

function ensurePanel() {
  if (_panel) return _panel;
  const pnl = document.createElement('div');
  pnl.id = 'layersPanel';
  pnl.className = 'lp-panel';
  pnl.innerHTML = `
    <div class="lp-title">Слои</div>
    <div class="lp-layers-list"></div>
    <div class="lp-controls">
      <div class="lp-pos" aria-live="polite">0 × 0 px</div>
      <div class="lp-arrows">
        <button class="btn icon" data-dir="up">↑</button>
        <button class="btn icon" data-dir="down">↓</button>
        <button class="btn icon" data-dir="left">←</button>
        <button class="btn icon" data-dir="right">→</button>
      </div>
      <div class="lp-hint">SHIFT = ×10, ALT = ×20</div>
    </div>
  `;
  document.body.appendChild(pnl);
  _panel = pnl;

  pnl.querySelector('.lp-arrows').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-dir]');
    if (!b) return;
    const dir = b.getAttribute('data-dir');
    let step = 1;
    // inspect event modifiers if available
    if (e.shiftKey) step *= 10;
    if (e.altKey) step *= 20;
    switch (dir) {
      case 'up': nudge(0, -step); break;
      case 'down': nudge(0, step); break;
      case 'left': nudge(-step, 0); break;
      case 'right': nudge(step, 0); break;
    }
  });

  // Keyboard arrows focus
  window.addEventListener('keydown', (e) => {
    if (document.documentElement.classList.contains('viewer')) return;
    let step = 1;
    if (e.shiftKey) step *= 10;
    if (e.altKey) step *= 20;
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); nudge(0, -step); break;
      case 'ArrowDown': e.preventDefault(); nudge(0, step); break;
      case 'ArrowLeft': e.preventDefault(); nudge(-step, 0); break;
      case 'ArrowRight': e.preventDefault(); nudge(step, 0); break;
      default: break;
    }
  });

  return _panel;
}

export function initMulti() {
  if (_inited) return;
  _inited = true;
  ensureRefs();
  ensureLayersRoot();
  ensurePanel();
  setActive(0, 'primary');

  // Hide panel in viewer mode
  if (document.documentElement.classList.contains('viewer')) {
    _panel.style.display = 'none';
  }
}

export function addExtraFromData(lotJson, meta = {}) {
  ensureRefs();
  const root = ensureLayersRoot();
  if (!root || !lotJson) return null;

  const id = _idSeq++;
  const container = makeLayerContainer();
  root.appendChild(container);

  const loop = !!state.loopOn;
  const autoplay = !!state.autoplayOn;

  const player = createPlayer(container, lotJson, { loop, autoplay });

  const layer = {
    id,
    container,
    player,
    json: lotJson,
    meta: meta || {},
    offset: { x: 0, y: 0 }
  };

  // Offset from meta
  try {
    const off = lotJson?.meta?._lpOffset || lotJson?.meta?._lpPos;
    if (off && typeof off.x === 'number' && typeof off.y === 'number') {
      layer.offset = { x: +off.x || 0, y: +off.y || 0 };
    }
  } catch {}

  updateTransform(layer);
  _extras.push(layer);
  syncPanel();
  return layer;
}

export function removeExtraById(id) {
  const idx = _extras.findIndex(x => x.id === id);
  if (idx < 0) return;
  const ex = _extras[idx];
  try { ex.player?.destroy?.(); } catch {}
  try { ex.container?.remove?.(); } catch {}
  _extras.splice(idx, 1);
  // Reset active if removed
  if (_active?.type === 'extra' && _active.id === id) setActive(0, 'primary');
  syncPanel();
}

export function clearExtras() {
  _extras.slice().forEach(ex => removeExtraById(ex.id));
}

export function getExtrasPayload() {
  // Return array of raw JSON objects with meta _lpOffset for each layer
  return _extras.map(ex => {
    try {
      const json = (typeof ex.json === 'string') ? JSON.parse(ex.json) : JSON.parse(JSON.stringify(ex.json));
      json.meta = json.meta || {};
      json.meta._lpOffset = { x: +ex.offset.x || 0, y: +ex.offset.y || 0 };
      return json;
    } catch {
      // fallback: wrap existing object
      const j = ex.json || {};
      j.meta = j.meta || {};
      j.meta._lpOffset = { x: +ex.offset.x || 0, y: +ex.offset.y || 0 };
      return j;
    }
  });
}

export function extrasCount() { return _extras.length; }
export function eachExtra(fn) { _extras.forEach(fn); }