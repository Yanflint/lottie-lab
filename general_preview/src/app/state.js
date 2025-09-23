export const state = {
  VERSION: '58',
  loopOn: false,
  autoplayOn: true,
  lastLottieJSON: null,

  // Multi-Lottie
  items: [],            // [{id, el, anim, w,h, offset:{x,y}, loopOn}]
  selectedId: null,


  // смещение лотти (px)
  lotOffset: { x: 0, y: 0 },

  // для layout.js
  A2HS: false,                 // режим «на рабочем столе» (PWA / standalone)
  lastBgSize: { w: 0, h: 0 },  // последние известные размеры фонового изображения
  lastBgMeta: { fileName: '', assetScale: 1 }, // метаданные фона
};

export function setLoop(on) {
  const it = state.items.find(x => x.id === state.selectedId);
  if (it && it.anim) {
    try { it.anim.loop = !!on; it.loopOn = !!on; if (on) { it.anim.play?.(); } } catch {}
  }
  state.loopOn = !!on;
}
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
  const it = state.items.find(x => x.id === state.selectedId);
  if (it) {
    const nx = +x || 0, ny = +y || 0;
    it.offset = { x: nx, y: ny };
  } else {
    state.lotOffset = { x: +x||0, y: +y||0 };
  }
}
export function bumpLotOffset(dx, dy) {
  const it = state.items.find(x => x.id === state.selectedId);
  if (it) {
    const cx = (it.offset?.x || 0), cy = (it.offset?.y || 0);
    setLotOffset(cx + (+dx || 0), cy + (+dy || 0));
  } else {
    const cx = (state.lotOffset?.x || 0), cy = (state.lotOffset?.y || 0);
    setLotOffset(cx + (+dx || 0), cy + (+dy || 0));
  }
}
export function getLotOffset() {
  const it = state.items.find(x => x.id === state.selectedId);
  if (it) return it.offset || { x:0,y:0 };
  return state.lotOffset || { x: 0, y: 0 };
}

export function addItem(it) {
  if (!it || !it.id) return;
  if (!it.offset) it.offset = { x: 0, y: 0 };
  if (typeof it.loopOn !== 'boolean') it.loopOn = !!state.loopOn;
  state.items.push(it);
  try {
    document.querySelectorAll('.lot-item.selected').forEach(el => el.classList.remove('selected'));
    it.el?.classList?.add('selected');
  } catch {}
  state.selectedId = it.id;
  try { window.dispatchEvent(new CustomEvent('lp:selected-changed', { detail: { id: it.id } })); } catch {}
}
export function selectItem(id) {
  state.selectedId = id;
  try {
    document.querySelectorAll('.lot-item').forEach(el => el.classList.toggle('selected', el.dataset.id === String(id)));
  } catch {}
  try { window.dispatchEvent(new CustomEvent('lp:selected-changed', { detail: { id } })); } catch {}
}
export function getSelectedItem() {
  return state.items.find(x => x.id === state.selectedId) || null;
}
