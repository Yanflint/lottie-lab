// src/app/pan.js
// Перемещение Lottie мышкой/тачем (pointer events) — работает и если lotStage перекрыт.
import { setLotOffset, getLotOffset } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }) {
  const stage = (refs?.lotStage) || (refs?.previewBox) || (refs?.preview) || document.getElementById('lotStage') || document.getElementById('preview');
  if (!stage) return;

  // Разрешаем перетаскивание на тач-устройствах
  try { stage.style.touchAction = 'none'; } catch {}
  try { stage.style.cursor = 'grab'; } catch {}

  let dragging = false;
  let startX = 0, startY = 0;
  let orig = { x: 0, y: 0 };
  let raf = 0;

  const onPointerDown = (e) => {
    // Только primary button
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    orig = getLotOffset();
    try { stage.setPointerCapture(e.pointerId); } catch {}
    try { stage.style.cursor = 'grabbing'; } catch {}
    document.documentElement.classList.add('dragging-lottie');
    e.preventDefault();
    e.stopPropagation();
  };

  const onPointerMove = (e) => {
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
    e.preventDefault();
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    try { stage.releasePointerCapture(e.pointerId); } catch {}
    try { stage.style.cursor = 'grab'; } catch {}
    document.documentElement.classList.remove('dragging-lottie');
    e.preventDefault();
  };

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('lostpointercapture', onPointerUp);

  return {
    destroy() {
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('lostpointercapture', onPointerUp);
    }
  };
}
