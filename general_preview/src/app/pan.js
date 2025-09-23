// src/app/pan.js
import { setLotOffset, getLotOffset } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }) {
  const stage = (refs?.lotStage) || document.getElementById('lotStage');
  if (!stage) return;

  try { stage.style.touchAction = 'none'; } catch {}

  let dragging = false;
  let startX = 0, startY = 0;
  let orig = { x: 0, y: 0 };

  function fitScaleMetric(){
    return (window.__lpMetrics && window.__lpMetrics.fitScale) ? window.__lpMetrics.fitScale : 1;
  }

  const onPointerDown = (e) => {
    const target = e.target.closest?.('.lot-item');
    if (!target) return;
    dragging = true;
    try { target.setPointerCapture?.(e.pointerId); } catch {}
    startX = e.clientX; startY = e.clientY;
    const cur = getLotOffset();
    orig = { x: cur.x, y: cur.y };
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const k = fitScaleMetric() || 1;
    const dx = (e.clientX - startX) / k;
    const dy = (e.clientY - startY) / k;
    setLotOffset(orig.x + dx, orig.y + dy);
    layoutLottie(refs);
    e.preventDefault();
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    try { document.querySelectorAll('.lot-item').forEach(el => el.releasePointerCapture?.(e.pointerId)); } catch {}
    e.preventDefault();
  };

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('lostpointercapture', onPointerUp);
}
