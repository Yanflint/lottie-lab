
// src/app/pan.js
import { setLotOffset, getLotOffset } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }) {
  const target = (refs?.lottieMount) || document.getElementById('lottie')
              || (refs?.lotStage)     || document.getElementById('lotStage');
  if (!target) return;

  try { target.style.touchAction = 'none'; } catch {}
  try { target.style.cursor = 'grab'; } catch {}

  let dragging = false;
  let startX = 0, startY = 0;
  let orig = { x: 0, y: 0 };

  function onPointerDown(e) {
    dragging = true;
    try { target.setPointerCapture?.(e.pointerId); } catch {}
    startX = e.clientX; startY = e.clientY;
    orig = getLotOffset();
    try { target.style.cursor = 'grabbing'; } catch {}
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = (e.clientX - startX);
    const dy = (e.clientY - startY);
    setLotOffset(orig.x + dx, orig.y + dy);
    layoutLottie({ ...(refs||{}), lottieMount: target, lotStage: (refs?.lotStage || document.getElementById('lotStage')) });
  }
  function onPointerUp(e) {
    dragging = false;
    try { target.releasePointerCapture?.(e.pointerId); } catch {}
    try { target.style.cursor = 'grab'; } catch {}
  }

  target.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  return {
    destroy() {
      target.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }
  };
}
