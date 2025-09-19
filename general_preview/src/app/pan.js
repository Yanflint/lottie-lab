// src/app/pan.js
// Перемещение Lottie мышкой/тачем (только в редакторе).
import { setLotOffset, getLotOffset } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }) {
  const isViewer = /^\/s\//.test(location.pathname || '');
  if (isViewer) return;

  const stage = refs?.lotStage || document.getElementById('lotStage');
  if (!stage) return;

  let dragging = false;
  let startX = 0, startY = 0;
  let orig = { x: 0, y: 0 };
  let pointerId = null;

  const getFitScale = () => {
    try {
      const fs = window.__lpMetrics?.fitScale;
      return (fs && isFinite(fs) && fs > 0) ? fs : 1;
    } catch { return 1; }
  };

  const onPointerDown = (e) => {
    try {
      // ЛКМ или тач
      const isMouse = e.pointerType === 'mouse' || e.type === 'mousedown';
      if (isMouse && e.button !== 0) return;
      if (e.ctrlKey || e.metaKey) return;
      // Только по самой сцене
      if (!stage.contains(e.target)) return;

      dragging = true;
      pointerId = e.pointerId ?? null;
      startX = e.clientX;
      startY = e.clientY;
      orig = getLotOffset() || { x: 0, y: 0 };
      document.body.classList.add('lp-grabbing');

      try { stage.setPointerCapture?.(pointerId); } catch {}
      e.preventDefault();
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    try {
      const dxDisp = (e.clientX - startX);
      const dyDisp = (e.clientY - startY);
      const fit = getFitScale();
      // Переводим дисплейные px в базовые px (как хранится lotOffset)
      const nx = orig.x + (dxDisp / (fit || 1));
      const ny = orig.y + (dyDisp / (fit || 1));
      setLotOffset(nx, ny);
      layoutLottie(refs);
      e.preventDefault();
    } catch {}
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    try { stage.releasePointerCapture?.(pointerId); } catch {}
    pointerId = null;
    document.body.classList.remove('lp-grabbing');
  };

  stage.addEventListener('pointerdown', onPointerDown, { passive: false });
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', endDrag, { passive: true });
  window.addEventListener('pointercancel', endDrag, { passive: true });
  window.addEventListener('blur', endDrag, { passive: true });
}
