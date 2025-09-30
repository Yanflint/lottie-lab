export const state = {
  lastBgMeta: null,
  lastBgSize: null
};
export function setLastBgMeta(meta){ state.lastBgMeta = meta || null; }
export function setLastBgSize(size){ state.lastBgSize = size || null; }
