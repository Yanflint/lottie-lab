
// src/app/multi.js
// НОВОЕ: Поддержка нескольких лотти, выделение, перемещение мышью/клавиатурой и per-item "цикл".
import { state } from './state.js';

let ACTIVE = false;
const items = new Map(); // id -> { id, container, mount, anim, w, h, x, y, loop }
let selectedId = null;
let idSeq = 1;
let refsCache = null;

const SEL_COLOR = '#2E90FF'; // голубой
const SEL_FILL  = 'rgba(46,144,255,0.10)';

function ensureStylesInjected() {
  if (document.getElementById('multi-lottie-styles')) return;
  const css = `
  .lottie-item{ position:absolute; left:0; top:0; touch-action:none; }
  .lottie-item .lottie-mount{ width:100%; height:100%; pointer-events:none; }
  .lottie-item.selected{ background:${SEL_FILL}; box-shadow: inset 0 0 0 2px ${SEL_COLOR}; }
  .lottie-item.grabbing{ cursor:grabbing; }
  /* чтобы клики по элементам не проваливались под фон */
  #lotStage{ position:relative; }
  /* чекбокс без боковых отступов, как просили */
  #loopChk{ margin-left:0; margin-right:0; }
  `;
  const style = document.createElement('style');
  style.id = 'multi-lottie-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

function setSelected(id) {
  selectedId = id;
  for (const it of items.values()) it.container.classList.toggle('selected', it.id === id);
  // обновим чекбокс цикла, если есть
  try {
    const chk = refsCache?.loopChk;
    if (chk) {
      const loop = id ? !!(items.get(id)?.loop) : !!state.loopOn;
      chk.checked = loop;
    }
  } catch {}
  // триггер callback для controls.js, если он подписан
  try { window.__multiOnSelectionChange && window.__multiOnSelectionChange(getSelected()); } catch {}
}

function getSelected() {
  return selectedId ? items.get(selectedId) : null;
}

function attachDragHandlers(it) {
  const el = it.container;
  let dragging = false;
  let startX = 0, startY = 0, baseX = 0, baseY = 0;

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    setSelected(it.id);
    dragging = true;
    el.classList.add('grabbing');
    el.setPointerCapture?.(e.pointerId);
    startX = e.clientX; startY = e.clientY;
    baseX = it.x; baseY = it.y;
    e.preventDefault();
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const nx = Math.round(baseX + dx);
    const ny = Math.round(baseY + dy);
    it.x = nx; it.y = ny;
    el.style.transform = `translate(${nx}px, ${ny}px)`;
  };
  const onPointerUp = (e) => {
    dragging = false;
    el.classList.remove('grabbing');
    try { el.releasePointerCapture?.(e.pointerId); } catch {}
  };

  el.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

export async function initMulti({ refs }) {
  refsCache = refs;
  ensureStylesInjected();
  ACTIVE = true;
  window.__multiActive = true;

  // перехватываем клавиатуру для перемещения выделенного
  window.addEventListener('keydown', (e) => {
    if (!ACTIVE) return;
    const sel = getSelected();
    if (!sel) return;
    const tag = (e.target?.tagName || '').toLowerCase();
    if (['input','textarea','select'].includes(tag)) return;
    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft')  dx = -step;
    if (e.key === 'ArrowRight') dx = +step;
    if (e.key === 'ArrowUp')    dy = -step;
    if (e.key === 'ArrowDown')  dy = +step;
    if (!dx && !dy) return;
    e.preventDefault();
    sel.x = (sel.x||0) + dx;
    sel.y = (sel.y||0) + dy;
    sel.container.style.transform = `translate(${sel.x}px, ${sel.y}px)`;
  }, { passive: false });
}

export function isActive() { return !!ACTIVE; }

export function setLoopForSelected(on) {
  const sel = getSelected();
  if (!sel || !sel.anim) return;
  sel.loop = !!on;
  try { sel.anim.loop = !!on; } catch {}
}

export function getSelectedLoop() {
  const sel = getSelected();
  return sel ? !!sel.loop : !!state.loopOn;
}

export function nudgeSelected(dx, dy) {
  const sel = getSelected();
  if (!sel) return;
  sel.x = (sel.x||0) + (+dx||0);
  sel.y = (sel.y||0) + (+dy||0);
  sel.container.style.transform = `translate(${sel.x}px, ${sel.y}px)`;
}

export function clearAll() {
  for (const it of items.values()) {
    try { it.anim?.destroy?.(); } catch {}
    try { it.container?.remove?.(); } catch {}
  }
  items.clear();
  selectedId = null;
}

function createItem({ lotJson, initialX=0, initialY=0 }) {
  const w = Number(lotJson.w || 0) || 128;
  const h = Number(lotJson.h || 0) || 128;
  const id = `ml-${idSeq++}`;

  const mount = document.createElement('div');
  mount.className = 'lottie-mount';
  mount.style.width = `${w}px`;
  mount.style.height = `${h}px`;

  const container = document.createElement('div');
  container.className = 'lottie-item';
  container.style.width = `${w}px`;
  container.style.height = `${h}px`;
  container.style.transform = `translate(${initialX}px, ${initialY}px)`;
  container.appendChild(mount);

  // поместим внутрь lotStage
  refsCache?.lotStage?.appendChild(container);

  // создаём анимацию через глобальный lottie (svg)
  const loop = !!state.loopOn;
  const autoplay = !!state.loopOn;
  const anim = window.lottie?.loadAnimation?.({
    container: mount,
    renderer: 'svg',
    loop,
    autoplay,
    animationData: lotJson
  });

  const it = { id, container, mount, anim, w, h, x: initialX, y: initialY, loop };
  items.set(id, it);

  // выбор по клику
  container.addEventListener('mousedown', () => setSelected(id));
  container.addEventListener('click', () => setSelected(id));

  // drag
  attachDragHandlers(it);

  return it;
}

export async function loadMultipleJsonFiles({ refs }, fileList) {
  if (!refs) refs = refsCache;
  refsCache = refs;
  ensureStylesInjected();
  ACTIVE = true;
  window.__multiActive = true;

  // спрячем одиночный mount, чтобы не мешал
  try { refs.lottieMount && (refs.lottieMount.style.display = 'none'); } catch {}

  // читаем все json-файлы
  const jsons = [];
  for (const f of fileList) {
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      jsons.push(data);
    } catch {}
  }
  if (!jsons.length) return;

  // разложим по центру с небольшими смещениями
  let sx = 0, sy = 0;
  const step = 24;
  for (const j of jsons) {
    const it = createItem({ lotJson: j, initialX: sx, initialY: sy });
    sx += step; sy += step;
    setSelected(it.id);
  }
}

export function onExternalSelectionChange(cb) {
  // Controls.js подпишется сюда, чтобы синхронизировать чекбокс
  window.__multiOnSelectionChange = cb;
}

// Утилиты для других модулей
window.__multi = {
  isActive,
  getSelected,
  setLoopForSelected,
  getSelectedLoop,
  nudgeSelected,
  loadMultipleJsonFiles,
  onExternalSelectionChange,
};
