export const state = {
  // === Multi-Lottie additions ===
  lotties: [],            // {id, loop, offset:{x,y}, w,h, mountEl, wrapEl, anim}
  selectedId: null,

  VERSION: '58',
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,

  // смещение лотти (px)
  lotOffset: { x: 0, y: 0 },

  // для layout.js
  A2HS: false,                 // режим «на рабочем столе» (PWA / standalone)
  lastBgSize: { w: 0, h: 0 },  // последние известные размеры фонового изображения
  lastBgMeta: { fileName: '', assetScale: 1 }, // метаданные фона
};

export function setLoop(on){ state.loopOn = !!on; try{ const it = (state.selectedId && (state.lotties||[]).find(x=>x.id===state.selectedId)); if (it){ it.loop = !!on; try{ it.anim?.setLooping?.(!!on); }catch{} } } catch{} }
export function setAutoplay(on)   { state.autoplayOn = !!on; }
export function setLastLottie(j)  { state.lastLottieJSON = j || null; }
export function setA2HS(on)       { state.A2HS = !!on; }
export function setLastBgSize(w,h){ state.lastBgSize = { w: +w||0, h: +h||0 }; }


export function setLastBgMeta(meta){
  try {
    const fn = (meta && meta.fileName) ? String(meta.fileName) : '';
    const sc = (meta && +meta.assetScale > 0) ? +meta.assetScale : 1;
    state.lastBgMeta = { fileName: fn, assetScale: sc };
  } catch { state.lastBgMeta = { fileName: '', assetScale: 1 }; }
}


// === позиционирование лотти ===
export function setLotOffset(x, y){ try{ const nx=+x||0, ny=+y||0; state.lotOffset = {x:nx, y:ny}; try { window.__lotOffsetX = nx; window.__lotOffsetY = ny; } catch {}
  try{ const it=(state.selectedId && (state.lotties||[]).find(x=>x.id===state.selectedId)); if(it){ it.offset = {x:nx, y:ny}; } }catch{}
} catch {} };
    // пробрасываем в глобал, если layout читает оттуда
    try { window.__lotOffsetX = nx; window.__lotOffsetY = ny; } catch {}
  } catch {}
}
export function bumpLotOffset(dx, dy) {
  const cx = (state.lotOffset?.x || 0), cy = (state.lotOffset?.y || 0);
  setLotOffset(cx + (+dx || 0), cy + (+dy || 0));
}
export function getLotOffset() {
  return state.lotOffset || { x: 0, y: 0 };
}


// === Multi-Lottie helpers ===
export function addLottieItem(item){ (state.lotties || (state.lotties=[])).push(item); if (!state.selectedId) state.selectedId = item.id; }
export function getLottieItems(){ return state.lotties || []; }
export function findItem(id){ return (state.lotties || []).find(x=>x.id===id) || null; }
export function getSelectedItem(){ return findItem(state.selectedId); }
export function setSelected(id){ state.selectedId = id; try { window.dispatchEvent(new CustomEvent('lp:selected-changed', { detail:{ id } })); } catch {} }
export function setItemLoop(id, on){ const it=findItem(id); if (it){ it.loop = !!on; try{ it.anim?.setLooping?.(!!on); }catch{} } }
export function setItemOffset(id, x, y){ const it=findItem(id); if (it){ it.offset = { x:+x||0, y:+y||0 }; } }
export function bumpItemOffset(id, dx, dy){ const it=findItem(id); if (it){ const o=it.offset||{x:0,y:0}; setItemOffset(id, (o.x||0)+(+dx||0), (o.y||0)+(+dy||0)); } }
