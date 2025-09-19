// src/app/pan.js
// Перемещение Lottie: pointer events на контейнере #preview с pointer capture.
// Работает даже если слой лотти перекрыт другими элементами.
import { setLotOffset, getLotOffset } from './state.js';
import { layoutLottie } from './lottie.js';

function isUiElement(el) {
  return !!(el && (el.closest('[data-ui]') || el.closest('button, [role="button"], input, textarea, select, [contenteditable="true"]')));
}

export function initLottiePan({ refs }) {
  const container = document.getElementById('preview') || refs?.preview || document.body;
  if (!container) return;

  try { container.style.touchAction = 'none'; } catch {}
  try { container.style.cursor = 'grab'; } catch {}

  let dragging = false;
  let startX = 0, startY = 0;
  let orig = { x: 0, y: 0 };
  let raf = 0;

  const onPointerDown = (e) => {
    // primary mouse or touch; игнорим UI-клики
    if ((e.pointerType !== 'touch' && e.button !== 0) || isUiElement(e.target)) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    orig = getLotOffset();
    try { container.setPointerCapture(e.pointerId); } catch {}
    try { container.style.cursor = 'grabbing'; } catch {}
    document.documentElement.classList.add('dragging-lottie');
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setLotOffset(orig.x + dx, orig.y + dy);
    if (!raf) {
      raf = requestAnimationFrame(() => { raf = 0; layoutLottie(refs); });
    }
    e.preventDefault();
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    try { container.releasePointerCapture(e.pointerId); } catch {}
    try { container.style.cursor = 'grab'; } catch {}
    document.documentElement.classList.remove('dragging-lottie');
    e.preventDefault();
  };

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);
  container.addEventListener('lostpointercapture', onPointerUp);

  return {
    destroy() {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('lostpointercapture', onPointerUp);
    }
  };
}
