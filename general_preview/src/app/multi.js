
// src/app/multi.js
// Простая "мультитрековая" прослойка для нескольких Lottie одновременно.
// Не трогаем старую одно-лотовую логику — используем её как fallback.
// Здесь каждая лотти — это собственный контейнер внутри #lotStage.

import { pickEngine } from './engine.js';

const BLUE = 'rgba(30,144,255,1)';        // dodgerblue
const BLUE_BG = 'rgba(30,144,255,0.10)';  // 10% заливка

/** @typedef {Object} LotInstance
 *  @property {string} id
 *  @property {HTMLElement} el          // контейнер
 *  @property {any} player              // lottie-web аниматор
 *  @property {{x:number,y:number}} pos // позиция в px
 *  @property {boolean} loop
 *  @property {number} w
 *  @property {number} h
 */

const state = {
  refs: null,
  instances: /** @type {LotInstance[]} */([]),
  selectedId: null,
};

function makeId() {
  return 'lot_' + Math.random().toString(36).slice(2, 9);
}

export function initMulti(refs) {
  state.refs = refs;
  // Обеспечим относительное позиционирование сцены
  try {
    if (refs?.lotStage) {
      refs.lotStage.style.position = 'relative';
      refs.lotStage.style.userSelect = 'none';
    }
  } catch {}
  // Делегируем клавиши для перемещения
  window.addEventListener('keydown', onKeyMove, { passive: false });
}

export function hasAny() { return state.instances.length > 0; }
export function getSelected() {
  return state.instances.find(it => it.id === state.selectedId) || null;
}
export function selectById(id) {
  const inst = state.instances.find(it => it.id === id);
  if (inst) select(inst);
}
export function setLoopForSelected(on) {
  const inst = getSelected();
  if (!inst) return;
  inst.loop = !!on;
  try {
    if (inst.player && typeof inst.player.loop === 'boolean') {
      inst.player.loop = !!on;
    } else if (inst.player?.setLoop) {
      inst.player.setLoop(!!on);
    }
  } catch {}
}
export function restartSelected() {
  const inst = getSelected();
  if (!inst || !inst.player) return;
  try {
    if (inst.player.stop) { inst.player.stop(); }
    if (inst.player.goToAndStop) { inst.player.goToAndStop(0, true); }
    if (inst.player.play) { inst.player.play(); }
  } catch {}
}

export function moveSelectedBy(dx, dy) {
  const inst = getSelected();
  if (!inst) return;
  inst.pos.x += dx; inst.pos.y += dy;
  applyTransform(inst);
}

function onKeyMove(e) {
  // стрелки двигают выбранную лотти
  const codes = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if (!codes.includes(e.code)) return;
  // не мешаем когда вводится в поле
  const t = e.target;
  const isEditable = !!(t && (t.closest?.('input, textarea') || t.isContentEditable || t.getAttribute?.('role') === 'textbox'));
  if (isEditable) return;
  const step = e.shiftKey ? 10 : 1;
  if (e.code === 'ArrowLeft')  moveSelectedBy(-step, 0);
  if (e.code === 'ArrowRight') moveSelectedBy(+step, 0);
  if (e.code === 'ArrowUp')    moveSelectedBy(0, -step);
  if (e.code === 'ArrowDown')  moveSelectedBy(0, +step);
  e.preventDefault();
}

function applyTransform(inst) {
  if (!inst?.el) return;
  inst.el.style.transform = `translate(${inst.pos.x}px, ${inst.pos.y}px)`;
}

function makeSelectionEl() {
  const sel = document.createElement('div');
  sel.className = 'lot-selection-overlay';
  // Заполняем 10% голубым и рисуем рамку 2px ВНУТРИ
  sel.style.position = 'absolute';
  sel.style.inset = '0';
  sel.style.pointerEvents = 'none';
  sel.style.background = BLUE_BG;                  // 10% голубого
  sel.style.boxShadow = `inset 0 0 0 2px ${BLUE}`; // рамка 2px внутрь
  return sel;
}

function attachDrag(inst) {
  const el = inst.el;
  let dragging = false;
  let origin = {x:0, y:0};
  let start = {x:0, y:0};

  const onDown = (e) => {
    // Выделяем по клику
    select(inst);
    dragging = true;
    try { el.setPointerCapture(e.pointerId); } catch {}
    el.style.cursor = 'grabbing';
    start = { x: e.clientX, y: e.clientY };
    origin = { ...inst.pos };
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
}

function select(inst) {
  // Снимаем выделение со всех
  state.instances.forEach(i => { try {
    const s = i.el.querySelector('.lot-selection-overlay');
    if (s) s.remove();
    i.el.style.zIndex = '0';
  } catch {} });
  state.selectedId = inst.id;
  // Подсветка — добавим overlay
  const sel = makeSelectionEl();
  inst.el.appendChild(sel);
  inst.el.style.zIndex = '1';
  // Подсинхроним чекбокс цикла, если он есть
  try {
    const chk = document.getElementById('loopChk');
    if (chk) chk.checked = !!inst.loop;
  } catch {}
}

export async function addLottieFromJSON(refs, lotJson, name='') {
  if (!refs?.lotStage) return null;
  const engine = pickEngine(); // 'lottie-web' or 'rlottie' (здесь используем lottie-web)
  if (engine !== 'lottie-web') {
    console.warn('[multi] RLottie не поддерживается в мультирежиме; переключаю на lottie-web');
  }
  // Контейнер
  const mount = document.createElement('div');
  mount.className = 'lot-instance';
  mount.style.position = 'absolute';
  mount.style.left = '0';
  mount.style.top  = '0';
  mount.style.transform = 'translate(0px, 0px)';
  mount.style.willChange = 'transform';
  mount.style.contain = 'content';
  // Важно: пусть svg будет естественного размера композиции
  refs.lotStage.appendChild(mount);

  // Создаём анимацию
  const player = window.lottie?.loadAnimation ? window.lottie.loadAnimation({
    container: mount,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: lotJson
  }) : null;

  // Вычислим размеры композиции из json (w/h), чтобы задать min-size контейнера
  let compW = 0, compH = 0;
  try { compW = +lotJson?.w || 0; compH = +lotJson?.h || 0; } catch {}
  if (compW > 0 && compH > 0) {
    mount.style.width = compW + 'px';
    mount.style.height = compH + 'px';
  }

  const inst = {
    id: makeId(),
    el: mount,
    player,
    pos: { x: 0, y: 0 },
    loop: true,
    w: compW,
    h: compH
  };
  state.instances.push(inst);

  // Навесим выделение/drag
  attachDrag(inst);
  // Выделим свежедобавленный
  select(inst);

  return inst;
}
