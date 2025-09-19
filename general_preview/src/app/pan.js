// src/app/pan.js
import { setLotOffset, getLotOffset } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }) {
  const target = (refs?.lottieMount) || document.getElementById('lottie')
            || (refs?.lotStage) || document.getElementById('lotStage');
  if (!target) return;
  try { target.style.touchAction = 'none'; } catch {}
  try { target.style.cursor = 'grab'; } catch {}

  let dragging = false, startX = 0, startY = 0, orig = { x:0, y:0 }, raf = 0;
  const onPointerDown = (e) => {
    if (e.pointerType !== 'touch' && e.button !== 0) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY; orig = getLotOffset();
    try { target.setPointerCapture(e.pointerId); } catch {}
    try { target.style.cursor = 'grabbing'; } catch {}
    e.preventDefault(); e.stopPropagation();
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    setLotOffset(orig.x + dx, orig.y + dy);
    if (!raf){ raf = requestAnimationFrame(()=>{ raf=0; layoutLottie(refs); }); }
    e.preventDefault();
  };
  const onPointerUp = (e) => {
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
  return { destroy(){ 
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointercancel', onPointerUp);
    target.removeEventListener('lostpointercapture', onPointerUp);
  }};
}
