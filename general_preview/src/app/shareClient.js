// general_preview/src/app/shareClient.js
// build yc11 (silent)
import { showSuccessToast, showErrorToast } from './updateToast.js';
import { withLoading } from './utils.js';
import { state, getLotOffset } from './state.js';

// API endpoint (Yandex Cloud Function). No trailing slash.
const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');
// Use only the base path (no /share) to avoid CORS noise.
const PATHS = [''];

function bgMeta() {
  return {
    name: (state.lastBgMeta?.fileName || ''),
    assetScale: (+state.lastBgMeta?.assetScale || 1)
  };
}

function readCurrentBg() {
  const img = document.getElementById('bgImg');
  if (!img) return null;
  const src = (img.currentSrc || img.src || '').trim();
  if (!src) return null;
  const meta = bgMeta();

  if (/^blob:/.test(src)) {
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w <= 0 || h <= 0) return null;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = c.toDataURL('image/png');
    return { value: dataUrl, ...meta };
  }
  return { value: src, ...meta };
}

async function collectPayloadOrThrow() {
  const lot = state.lastLottieJSON || null;
  const bg  = readCurrentBg();

  if (!lot && !bg) {
    const err = new Error('Загрузите графику');
    err.code = 'NO_ASSETS';
    throw err;
  }
  if (lot && !bg) {
    const err = new Error('Загрузите фон');
    err.code = 'NO_BG';
    throw err;
  }
  if (bg && !lot) {
    const err = new Error('Загрузите анимацию');
    err.code = 'NO_LOTTIE';
    throw err;
  }

  try {
    lot.meta = lot.meta || {};
    const off = getLotOffset();
    lot.meta._lpOffset = { x: +off.x || 0, y: +off.y || 0 };
    if (state.lastBgMeta && (state.lastBgMeta.fileName || state.lastBgMeta.assetScale)) {
      lot.meta._lpBgMeta = { fileName: state.lastBgMeta.fileName || '', assetScale: +state.lastBgMeta.assetScale || 1 };
    }
  } catch {}

  const opts = { loop: !!state.loopOn };
  return { lot, bg, opts };
}

async function postPayload(payload) {
  let lastErr = null;
  for (const p of PATHS) {
    const url = API_BASE + p;
    try {
      const bodyStr = JSON.stringify(payload);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
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
  }
  throw lastErr || new Error('share: все попытки не удались');
}

// Public API
export async function createShareLink() {
  const payload = await collectPayloadOrThrow();
  return postPayload(payload);
}

export function initShare({ onSuccess, onError } = {}) {
  const btn = document.querySelector('[data-share], #shareBtn');
  if (!btn) return { destroy(){} };
  async function handler(e) {
    try {
      e?.preventDefault?.();
      // Pre-check: specific toasts depending on what's missing
      const hasLot = !!state.lastLottieJSON;
      const hasBg  = !!readCurrentBg();
      if (!hasLot && !hasBg) {
        showErrorToast('Загрузите графику', btn);
        return;
      }
      if (hasLot && !hasBg) {
        showErrorToast('Загрузите фон', btn);
        return;
      }
      if (hasBg && !hasLot) {
        showErrorToast('Загрузите анимацию', btn);
        return;
      }
      const url = await withLoading(btn, () => createShareLink());
      try { await navigator.clipboard.writeText(url); } catch {}
      showSuccessToast('Ссылка скопирована', btn);
      const out = document.querySelector('#shareUrl,[data-share-url]');
      if (out) { if ('value' in out) out.value = url; else out.textContent = url; }
      onSuccess?.(url);
    } catch (err) {
      const m = (err?.message || '').toLowerCase();
      if (err?.code === 'NO_ASSETS' || m.includes('Загрузите графику')) {
        showErrorToast('Загрузите графику', btn);
      } else if (err?.code === 'NO_BG' || m.includes('Загрузите фон')) {
        showErrorToast('Загрузите фон', btn);
      } else if (err?.code === 'NO_LOTTIE' || m.includes('Загрузите анимацию')) {
        showErrorToast('Загрузите анимацию', btn);
      } else {
        showErrorToast(err?.message || 'Share failed', btn);
      }
      onError?.(err);
    }
  }
  btn.addEventListener('click', handler);
  return { destroy(){ btn.removeEventListener('click', handler); } };
}
