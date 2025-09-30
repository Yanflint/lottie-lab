
export const state = {
  VERSION: '60',
  loopOn: false,
  autoplayOn: true,

  // MULTI-LOTTIE SCENE
  scene: [],            // [{ id, name, json, w, h, offset:{x,y} }]
  selectedId: null,

  // Background meta
  lastBgSize: { w: 0, h: 0 },
  lastBgMeta: { fileName: '', assetScale: 1 },
};

function genId() {
  return 'lot_' + Math.random().toString(36).slice(2,8) + '_' + Date.now().toString(36);
}

export function setLoop(on){ state.loopOn = !!on; }
export function setAutoplay(on){ state.autoplayOn = !!on; }

export function setLastBgSize(w, h){ state.lastBgSize = { w:+w||0, h:+h||0 }; }
export function setLastBgMeta(meta){ state.lastBgMeta = { fileName: meta?.fileName || '', assetScale: +meta?.assetScale || 1 }; }

export function addLottieItem(json, name=''){
  const w = Number(json?.w || 0) || 512;
  const h = Number(json?.h || 0) || 512;
  const id = genId();
  const item = { id, name: name || json?.nm || '', json, w, h, offset: { x: 0, y: 0 } };
  state.scene.push(item);
  state.selectedId = id;
  try { window.__lotOffsetX = 0; window.__lotOffsetY = 0; } catch {}
  return item;
}

export function getItem(id){ return state.scene.find(x => x.id === id) || null; }
export function getSelectedId(){ return state.selectedId; }
export function setSelectedId(id){ state.selectedId = id; const it = getItem(id); try { window.__lotOffsetX = it?.offset?.x || 0; window.__lotOffsetY = it?.offset?.y || 0; } catch {} }
export function setItemOffset(id, x, y){
  const it = getItem(id); if (!it) return;
  const nx = +x || 0, ny = +y || 0;
  it.offset = { x: nx, y: ny };
  if (id === state.selectedId) { try { window.__lotOffsetX = nx; window.__lotOffsetY = ny; } catch {} }
}
export function bumpItemOffset(id, dx, dy){
  const it = getItem(id); if (!it) return;
  setItemOffset(id, (it.offset?.x || 0) + (+dx||0), (it.offset?.y || 0) + (+dy||0));
}
export function clearScene(){ state.scene = []; state.selectedId = null; }

/// === Back-compat shims (old single-lottie API) ===
export function setLotOffset(x, y){ const id = state.selectedId; if (id) setItemOffset(id, x, y); }
export function bumpLotOffset(dx, dy){ const id = state.selectedId; if (id) bumpItemOffset(id, dx, dy); }
export function getLotOffset(){ const it = getItem(state.selectedId); return it?.offset || { x:0, y:0 }; }

// legacy helpers used elsewhere
export function setLastLottie(json){ return addLottieItem(json); }
