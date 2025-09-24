
// src/app/state.js
export const state = {
  loopOn: true,
  lastBgSize: { w: 0, h: 0 },      // "база" — натуральный размер PNG
  lastBgMeta: { fileName: '', assetScale: 1 },
  lotOffset: { x: 0, y: 0 },
};

export function setLastBgSize(w, h) {
  state.lastBgSize = { w: +w || 0, h: +h || 0 };
  try { window.__bgBaseW = state.lastBgSize.w; window.__bgBaseH = state.lastBgSize.h; } catch {}
}
export function setLastBgMeta(meta) {
  state.lastBgMeta = Object.assign({}, state.lastBgMeta, meta || {});
}

export function setLotOffset(x, y) {
  state.lotOffset = { x: +x || 0, y: +y || 0 };
  try { window.__lotOffsetX = state.lotOffset.x; window.__lotOffsetY = state.lotOffset.y; } catch {}
}
export function bumpLotOffset(dx, dy) {
  const cx = state.lotOffset.x || 0, cy = state.lotOffset.y || 0;
  setLotOffset(cx + (+dx || 0), cy + (+dy || 0));
}
export function getLotOffset() {
  return state.lotOffset || { x: 0, y: 0 };
}
