
// src/app/multi.js
import { state } from './state.js';
import { loadLottieFromData } from './lottie.js';

function ensureRefs(refs) {
  if (!refs) refs = {};
  if (!refs.lotList) refs.lotList = document.getElementById('lotList');
  return refs;
}

function render(refs) {
  refs = ensureRefs(refs);
  const list = refs.lotList;
  if (!list) return;
  const items = state.lottieList || [];
  if (!items.length) {
    list.innerHTML = `<div class="empty" role="note">Lottie: ничего не загружено</div>`;
    return;
  }
  list.innerHTML = items.map((it, idx) => {
    const active = (idx === state.selectedLottie) ? 'active' : '';
    const label = it?.name || `#${idx+1}`;
    return `<button type="button" role="listitem" class="item ${active}" data-idx="${idx}" title="${label}">
      <span class="name">${label}</span>
    </button>`;
  }).join('');
  list.querySelectorAll('.item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      selectByIndex({ refs }, idx);
    });
  });
}

export function selectByIndex({ refs }, idx) {
  const items = state.lottieList || [];
  if (!(idx >= 0 && idx < items.length)) return;
  state.selectedLottie = idx;
  const data = items[idx]?.data;
  if (data) {
    loadLottieFromData(refs, data);
  }
  render(refs);
}

export function addLottieItems({ refs }, arr) {
  // arr: [{ name, data }]
  if (!Array.isArray(arr) || !arr.length) return;
  state.lottieList = (state.lottieList || []).concat(arr);
  // auto-select last added if nothing selected yet
  if (state.selectedLottie < 0) {
    state.selectedLottie = 0;
    try { loadLottieFromData(refs, state.lottieList[0].data); } catch {}
  }
  render(refs);
}

export function initMultiLottie({ refs }) {
  refs = ensureRefs(refs);
  render(refs);
}
