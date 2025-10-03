// multiShare.js — URL share for multi-layer state (no backend)
import { showSuccessToast, showErrorToast } from './updateToast.js';
import { getLayersSnapshot, addLottieLayer } from './layers.js';
import { setPlaceholderVisible } from './utils.js';
import './vendor/lzstring.js';

function encodeState(obj){
  try {
    const json = JSON.stringify(obj);
    return LZString.compressToEncodedURIComponent(json);
  } catch(e){ return null; }
}
function decodeState(s){
  try {
    const json = LZString.decompressFromEncodedURIComponent(s);
    return JSON.parse(json);
  } catch(e){ return null; }
}

function buildState(){
  const layers = getLayersSnapshot();
  return { v:2, layers };
}

async function restoreState(state){
  if (!state || !Array.isArray(state.layers)) return false;
  for (const it of state.layers){
    try {
      const id = await addLottieLayer({}, it.data, it.name || 'Lottie', it.tagId || null);
      // position
      const el = document.querySelector(`.multi-stage .lot-layer[data-id="${CSS.escape(String(id))}"]`);
      if (el){
        el.__pos = { x:+it.x||0, y:+it.y||0 };
        el.style.transform = `translate(${+it.x||0}px, ${+it.y||0}px)`;
        el.style.display = it.visible === false ? 'none' : '';
      }
    } catch (e) { console.error('restore failed for layer', e); }
  }
  try { setPlaceholderVisible({ placeholder: document.getElementById('ph') }, false); } catch {}
  return true;
}

function makeLink(){
  const st = buildState();
  if (!st.layers.length){
    throw new Error('NO_LAYERS');
  }
  const s = encodeState(st);
  if (!s) throw new Error('ENCODE_FAIL');
  const u = new URL(location.href);
  u.searchParams.set('ms', s);
  return u.toString();
}

function hookShareButton(){
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  const handler = async (e) => {
    try {
      // Stop any old handlers that expect single-lottie
      e.preventDefault(); e.stopImmediatePropagation();
      const url = makeLink();
      try {
        await navigator.clipboard.writeText(url);
        showSuccessToast('Ссылка скопирована', btn);
      } catch {
        showSuccessToast('Ссылка готова: ' + url, btn);
      }
    } catch (err){
      if (String(err?.message).includes('NO_LAYERS')) showErrorToast('Загрузите анимацию', btn);
      else showErrorToast('Не удалось подготовить ссылку', btn);
      console.error('share failed', err);
    }
  };
  btn.addEventListener('click', handler, true); // capture to override existing
}

function tryAutoLoad(){
  const u = new URL(location.href);
  const s = u.searchParams.get('ms');
  if (!s) return;
  const state = decodeState(s);
  if (!state) return;
  restoreState(state);
}

document.addEventListener('DOMContentLoaded', () => {
  hookShareButton();
  tryAutoLoad();
});
