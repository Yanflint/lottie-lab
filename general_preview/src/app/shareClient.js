// general_preview/src/app/shareClient.js
import { showSuccessToast, showErrorToast } from './updateToast.js';
import { withLoading } from './utils.js';
import { state, getLotOffset } from './state.js';

const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');
const PATHS = ['/share', '']; // пробуем с /share и без

console.info('[shareClient] build yc5', new Date().toISOString(), { API_BASE, PATHS });

// ─── helpers ─────────────────────────────────────────────────────────────────
function tinyTestPayload(){
  return {
    lot: { v:'5.7.4', fr:30, ip:0, op:1, w:100, h:100, layers:[], meta:{} },
    bg:  { value:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBr9o9yVQAAAAASUVORK5CYII=', name:'x.png', assetScale:1 },
    opts:{ loop:true }
  };
}

async function collectCurrentPayload() {
  const lot = state.lastLottieJSON;
  if (!lot) throw new Error('Нет данных Lottie — загрузите JSON и фон');

  try {
    lot.meta = lot.meta || {};
    const off = getLotOffset();
    lot.meta._lpOffset = { x: +off.x || 0, y: +off.y || 0 };
    if (state.lastBgMeta && (state.lastBgMeta.fileName || state.lastBgMeta.assetScale)) {
      lot.meta._lpBgMeta = { fileName: state.lastBgMeta.fileName || '', assetScale: +state.lastBgMeta.assetScale || 1 };
    }
  } catch {}

  let bg = null;
  try {
    const img = document.getElementById('bgImg');
    if (img && (img.currentSrc || img.src)) {
      const src = (img.currentSrc || img.src || '').trim();
      const meta = { name: (state.lastBgMeta?.fileName || ''), assetScale: (+state.lastBgMeta?.assetScale || 1) };
      if (/^blob:/.test(src)) {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (w > 0 && h > 0) {
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = c.toDataURL('image/png');
          bg = { value: dataUrl, ...meta };
        }
      } else {
        bg = { value: src, ...meta };
      }
    }
  } catch {}

  const opts = { loop: !!state.loopOn };
  return { lot, ...(bg ? { bg } : {}), opts };
}

async function postPayload(payload){
  let lastErr = null;
  for (const p of PATHS) {
    const url = API_BASE + p;
    try {
      const bodyStr = JSON.stringify(payload);
      console.info('[shareClient] POST', { url, bytes: bodyStr.length });
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
      const txt = await resp.text();
      console.info('[shareClient] RESP', { status: resp.status, len: (txt||'').length, text: txt.slice(0,200) });
      let data = null; try { data = txt ? JSON.parse(txt) : null; } catch {}
      if (!resp.ok) throw new Error(`share failed: ${resp.status}`);
      if (data && typeof data.url === 'string') return data.url;
      if (data && data.id) {
        const origin = (window.__PUBLIC_ORIGIN__) || location.origin;
        return origin.replace(/\/$/, '') + '/s/' + encodeURIComponent(data.id);
      }
      throw new Error('share: пустой ответ API');
    } catch (e) {
      console.error('[shareClient] POST error', e);
      lastErr = e;
    }
  }
  throw lastErr || new Error('share: все попытки не удались');
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function createShareLink(key, opts = {}) {
  // В ЭТОЙ СБОРКЕ МЫ ПОЛНОСТЬЮ ИГНОРИРУЕМ key → всегда payload-режим
  // Alt/Option клик → tiny test payload (для диагностики бэкенда).
  const useTiny = !!opts.tinyTest;
  const payload = useTiny ? tinyTestPayload() : await collectCurrentPayload();
  return postPayload(payload);
}

export function initShare({ onSuccess, onError } = {}) {
  const btn = document.querySelector('[data-share], #shareBtn');
  if (!btn) return { destroy(){} };
  async function handler(e) {
    try {
      e?.preventDefault?.();
      const tinyTest = !!(e && (e.altKey || e.metaKey) && e.shiftKey); // Alt+Shift(+Cmd) для tiny
      const url = await withLoading(btn, () => createShareLink(null, { tinyTest }));
      try { await navigator.clipboard.writeText(url); } catch {}
      showSuccessToast('Ссылка скопирована', btn);
      const out = document.querySelector('#shareUrl,[data-share-url]');
      if (out) { if ('value' in out) out.value = url; else out.textContent = url; }
      onSuccess?.(url);
    } catch (err) {
      console.error(err);
      showErrorToast(err?.message || 'Share failed', btn);
      onError?.(err);
    }
  }
  btn.addEventListener('click', handler);
  return { destroy(){ btn.removeEventListener('click', handler); } };
}
