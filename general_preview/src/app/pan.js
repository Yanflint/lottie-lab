
// Multi-item pan: drag selected lot-item on stage
import { getSelectedId, setSelectedId, getItem, setItemOffset } from './state.js';
import { layoutLottie } from './lottie.js';

export function initLottiePan({ refs }){
  const stage = refs?.lotStage || document.getElementById('lotStage');
  if (!stage) return;

  try { stage.style.touchAction = 'none'; } catch {}
  let dragging = false;
  let startX=0, startY=0, origX=0, origY=0, dragId=null;

  function onPointerDown(e){
    const host = e.target.closest?.('.lot-item');
    if (!host) return;
    e.preventDefault();
    dragId = host.dataset.id;
    setSelectedId(dragId);
    document.querySelectorAll('.lot-item.selected').forEach(el => el.classList.remove('selected'));
    host.classList.add('selected');

    const it = getItem(dragId);
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    origX = it?.offset?.x || 0; origY = it?.offset?.y || 0;
    try { host.setPointerCapture?.(e.pointerId); } catch {}
    document.documentElement.classList.add('lp-grabbing');
  }

  function onPointerMove(e){
    if (!dragging || !dragId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setItemOffset(dragId, origX + dx, origY + dy);
    layoutLottie({ refs });
    e.preventDefault();
  }

  function onPointerUp(e){
    if (!dragging) return;
    dragging = false;
    try{ const host = stage.querySelector(`.lot-item[data-id="${dragId}"]`); host?.releasePointerCapture?.(e.pointerId); } catch {}
    dragId = null;
    document.documentElement.classList.remove('lp-grabbing');
    e.preventDefault();
  }

  stage.addEventListener('pointerdown', onPointerDown);
  stage.addEventListener('pointermove', onPointerMove);
  stage.addEventListener('pointerup', onPointerUp);
  stage.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('lostpointercapture', onPointerUp);

  return { destroy(){
    stage.removeEventListener('pointerdown', onPointerDown);
    stage.removeEventListener('pointermove', onPointerMove);
    stage.removeEventListener('pointerup', onPointerUp);
    stage.removeEventListener('pointercancel', onPointerUp);
    stage.removeEventListener('lostpointercapture', onPointerUp);
  }};
}
