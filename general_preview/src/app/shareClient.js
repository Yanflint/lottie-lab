
import { showSuccessToast, showErrorToast } from './updateToast.js';
import { withLoading } from './utils.js';
<<<<<<< Updated upstream
import { state, getLotOffset } from './state.js';
=======
import { state } from './state.js';
>>>>>>> Stashed changes

export const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');
const PATHS = [''];

function bgMeta() {
  return {
    name: (state.lastBgMeta?.fileName || ''),
    assetScale: (+state.lastBgMeta?.assetScale || 1)
  };
}

function readCurrentBg() {
  try {
    const img = document.getElementById('bgImg');
    const src = img?.src || '';
    if (src) return { src, meta: bgMeta() };
  } catch {}
  return null;
}

function buildPayload(){
  const bg = readCurrentBg();
  const lots = state.scene.map(it => ({
    id: it.id,
    name: it.name || '',
    lot: it.json,
    offset: { x: +it.offset?.x || 0, y: +it.offset?.y || 0 }
  }));
  const opts = { loop: !!state.loopOn };
  if (!bg && lots.length === 0) { const e = new Error('Загрузите графику'); e.code = 'NO_ASSETS'; throw e; }
  if (!bg) { const e = new Error('Загрузите фон'); e.code = 'NO_BG'; throw e; }
  if (lots.length === 0) { const e = new Error('Загрузите анимацию'); e.code = 'NO_LOTTIE'; throw e; }
  return { bg, lots, opts, // back-compat
           lot: lots[0]?.lot || null };
}

async function postPayload(payload) {
  let lastErr = null;
  for (const p of PATHS) {
    const url = API_BASE + p;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
<<<<<<< Updated upstream
      const txt = await resp.text();
      let data = null; try { data = txt ? JSON.parse(txt) : null; } catch {}
      if (!resp.ok) throw new Error(`share failed: ${resp.status}`);
      if (data && typeof data.url === 'string') return data.url;
      if (data && data.id) {
        const origin = (window.__PUBLIC_ORIGIN__) || location.origin;
        return origin.replace(/\/$/, '') + '/s/' + encodeURIComponent(data.id);
      }
      throw new Error('share: пустой ответ API');
    } catch (e) {
      lastErr = e;
    }
=======
      if (!resp.ok) throw new Error('Share API error '+resp.status);
      const { id } = await resp.json().catch(() => ({}));
      if (id) return id;
      throw new Error('Share API bad response');
    } catch (e) { lastErr = e; }
>>>>>>> Stashed changes
  }
  throw lastErr || new Error('Share failed');
}

async function createShareLink(){
  const payload = buildPayload();
  const id = await postPayload(payload);
  const base = (location.origin || '') + '/s/';
  return base + encodeURIComponent(id);
}

export function initShare({ refs }){
  const btn = refs?.shareBtn || document.getElementById('shareBtn');
  if (!btn) return;

  async function handler(){
    try{
      const url = await withLoading(btn, () => createShareLink());
      try { await navigator.clipboard.writeText(url); } catch {}
      showSuccessToast('Ссылка скопирована', btn);
      const out = document.querySelector('#shareUrl,[data-share-url]');
      if (out) { if ('value' in out) out.value = url; else out.textContent = url; }
    }catch(err){
      const m = (err?.message || '').toLowerCase();
      if (err?.code === 'NO_ASSETS' || m.includes('графику')) showErrorToast('Загрузите графику', btn);
      else if (err?.code === 'NO_BG' || m.includes('фон')) showErrorToast('Загрузите фон', btn);
      else if (err?.code === 'NO_LOTTIE' || m.includes('анимацию')) showErrorToast('Загрузите анимацию', btn);
      else showErrorToast(err?.message || 'Share failed', btn);
    }
  }
  btn.addEventListener('click', handler);
  return { destroy(){ btn.removeEventListener('click', handler); } };
}
