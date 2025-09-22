export const state = {
  layers: [],
  activeLayerId: null,

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


export function addLayer(layer) {
  if (!layer || !layer.id) return;
  state.layers = state.layers || [];
  state.layers.push({ id: layer.id, name: layer.name || ('Layer ' + state.layers.length+1), offset: {x:0,y:0} });
  state.activeLayerId = layer.id;
}
export function setActiveLayer(id) {
  state.activeLayerId = id;
}
export function getActiveLayer() {
  const id = state.activeLayerId;
  if (!id) return null;
  return (state.layers || []).find(l => l.id === id) || null;
}
function _ensureActiveLayer() {
  if (!state.activeLayerId && state.layers && state.layers.length) {
    state.activeLayerId = state.layers[state.layers.length - 1].id;
  }
}
export function setLoop(on)       { state.loopOn = !!on; }
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
export function setLotOffset(x, y) {
  try {
    _ensureActiveLayer();
    const L = getActiveLayer();
    if (!L) { state.lotOffset = {x:+x||0, y:+y||0}; return; } // fallback
    const nx = +x || 0, ny = +y || 0;
    L.offset = { x: nx, y: ny };
    // keep legacy globals for metrics/compat
    try { window.__lotOffsetX = nx; window.__lotOffsetY = ny; } catch {}
  } catch {}
}
export function bumpLotOffset(dx, dy) {
  _ensureActiveLayer();
  const L = getActiveLayer();
  if (!L) { 
    const cx = (state.lotOffset?.x || 0), cy = (state.lotOffset?.y || 0);
    setLotOffset(cx + (+dx || 0), cy + (+dy || 0));
    return;
  }
  const cx = (L.offset?.x || 0), cy = (L.offset?.y || 0);
  setLotOffset(cx + (+dx || 0), cy + (+dy || 0));
}
(dx, dy) {
  const cx = (state.lotOffset?.x || 0), cy = (state.lotOffset?.y || 0);
  setLotOffset(cx + (+dx || 0), cy + (+dy || 0));
}
export function getLotOffset() {
  _ensureActiveLayer();
  const L = getActiveLayer();
  if (!L) return state.lotOffset || {x:0,y:0};
  return L.offset || { x: 0, y: 0 };
}
