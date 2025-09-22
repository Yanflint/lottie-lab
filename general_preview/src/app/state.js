export const state = {
  VERSION: '58',
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,
  // legacy single-offset for compat
  lotOffset: { x: 0, y: 0 },
  // multi-layer
  layers: [],
  activeLayerId: null,
  // layout/env
  A2HS: false,
  lastBgSize: { w: 0, h: 0 },
  lastBgMeta: { fileName: '', assetScale: 1 },
};

export function setLoop(on){ state.loopOn = !!on; }
export function setAutoplay(on){ state.autoplayOn = !!on; }
export function setLastLottie(json){ state.lastLottieJSON = json || null; }

export function setLastBgSize(w,h){
  const nw = +w||0, nh = +h||0; state.lastBgSize = { w:nw, h:nh };
}
export function setLastBgMeta(meta){
  state.lastBgMeta = Object.assign({}, state.lastBgMeta, meta || {});
}

// Layers
export function addLayer(layer){
  if (!layer || !layer.id) return;
  state.layers.push({ id: layer.id, name: layer.name || ('Layer ' + (state.layers.length+1)), offset: {x:0,y:0} });
  state.activeLayerId = layer.id;
}
export function setActiveLayer(id){ state.activeLayerId = id || null; }
export function getActiveLayer(){
  const id = state.activeLayerId; if (!id) return null;
  return state.layers.find(l=>l.id===id) || null;
}
function _ensureActiveLayer(){
  if (!state.activeLayerId && state.layers.length) state.activeLayerId = state.layers[state.layers.length-1].id;
}

// Offsets
export function setLotOffset(x,y){
  _ensureActiveLayer();
  const L = getActiveLayer();
  const nx = +x||0, ny = +y||0;
  if (L){ L.offset = {x:nx,y:ny}; } else { state.lotOffset = {x:nx,y:ny}; }
  try{ window.__lotOffsetX = nx; window.__lotOffsetY = ny; }catch{}
}
export function bumpLotOffset(dx,dy){
  _ensureActiveLayer();
  const L = getActiveLayer();
  if (L){
    const cx = (L.offset?.x||0), cy = (L.offset?.y||0);
    setLotOffset(cx + (+dx||0), cy + (+dy||0));
  } else {
    const cx = (state.lotOffset?.x||0), cy = (state.lotOffset?.y||0);
    setLotOffset(cx + (+dx||0), cy + (+dy||0));
  }
}
export function getLotOffset(){
  _ensureActiveLayer();
  const L = getActiveLayer();
  if (L) return L.offset || {x:0,y:0};
  return state.lotOffset || {x:0,y:0};
}