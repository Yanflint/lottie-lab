// src/app/pan.js
// Перемещение Lottie мышкой (только в редакторе).
import { setLotOffset, getLotOffset } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }) {
  const stage = refs?.lotStage || document.getElementById('lotStage');
  if (!stage) return;

  let dragging = false;
  let startX = 0, startY = 0;
  let orig = { x: 0, y: 0 };
  let raf = 0;

  const setCursor = (c) => { try { stage.style.cursor = c; } catch {} };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    orig = getLotOffset();
    setCursor('grabbing');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setLotOffset(orig.x + dx, orig.y + dy);
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        layoutLottie();
      });
    }
  };

  const onMouseUp = () => {
    if (!dragging) return;
    dragging = false;
    setCursor('grab');
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  // Touch support
  const onTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    dragging = true;
    startX = t.clientX; startY = t.clientY;
    orig = getLotOffset();
    setCursor('grabbing');
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
  };
  const onTouchMove = (e) => {
    if (!dragging || !e.touches || e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    setLotOffset(orig.x + dx, orig.y + dy);
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        layoutLottie();
      });
    }
  };
  const onTouchEnd = () => {
    if (!dragging) return;
    dragging = false;
    setCursor('grab');
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
  };

  // Init cursor and listeners
  setCursor('grab');
  stage.addEventListener('mousedown', onMouseDown);
  stage.addEventListener('touchstart', onTouchStart, { passive: false });

  return {
    destroy() {
      stage.removeEventListener('mousedown', onMouseDown);
      stage.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    }
  };
}
