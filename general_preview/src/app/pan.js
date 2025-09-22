// src/app/pan.js
// Перетаскивание ТОЛЬКО за саму Lottie: target = #lottie (fallback #lotStage)
import { setLotOffset, getLotOffset, setActiveLayer } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }) {
  var target = (refs && refs.lotStage) ? refs.lotStage : (document.getElementById('lotStage') || document);
  if (!target) return;

  try { target.style.touchAction = 'none'; } catch {}
  try { target.style.cursor = 'grab'; } catch {}

  var dragging = false;
  let startX = 0, startY = 0;
  let orig = { x: 0, y: 0 };
  let raf = 0;

  var onPointerDown = (e) => {
  var hit = e.target && e.target.closest ? e.target.closest('.lot-item') : null;
  if (!hit) return;
  try{ if (hit.dataset && hit.dataset.layerId) setActiveLayer(hit.dataset.layerId); }catch(e){}

    // primary mouse or any touch; разрешаем только по Lottie
    if (e.pointerType !== 'touch' && e.button !== 0) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    orig = getLotOffset();
    try { target.setPointerCapture(e.pointerId); } catch {}
    try { target.style.cursor = 'grabbing'; } catch {}
    e.preventDefault();
    e.stopPropagation();
  };

  var onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setLotOffset(orig.x + dx, orig.y + dy);
    if (!raf) {
      raf = requestAnimationFrame(() => { raf = 0; layoutLottie(refs); });
    }
    e.preventDefault();
  };

  var onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    try { target.releasePointerCapture(e.pointerId); } catch {}
    try { target.style.cursor = 'grab'; } catch {}
    e.preventDefault();
  };

  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onPointerUp);
  target.addEventListener('lostpointercapture', onPointerUp);

  return {
    destroy() {
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
      target.removeEventListener('lostpointercapture', onPointerUp);
    }
  };
}
