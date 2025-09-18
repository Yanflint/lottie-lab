// general_preview/src/app/shareClient.js
// Клиент к Cloud Function. НЕ требует key. Кнопка Share всегда даёт фидбек (тост + clipboard).

import { showSuccessToast, showErrorToast } from './updateToast.js';

const DEFAULT_API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'; // базовый URL функции БЕЗ /share

function getApiBase() {
  const base = (typeof window !== 'undefined' && window.__API_BASE__) || DEFAULT_API_BASE;
  return String(base).replace(/\/+$/, ''); // без хвостового слеша
}

async function apiPost(payload, { timeout = 15000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  const url = getApiBase(); // ВАЖНО: БЕЗ /share
  let res, text = '';
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: controller.signal,
    });
    text = await res.text();
  } finally { clearTimeout(t); }

  let data = null; try { data = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!res?.ok) throw new Error(`HTTP {res?.status} {res?.statusText} — ` + text.slice(0,200));
  return data || {};
}

async function readState(refs) {
  const st = (window.state || window.appState || {});
  const lot = st.lastLottieJSON ? JSON.parse(JSON.stringify(st.lastLottieJSON)) : null;
  const loop = !!st.loopOn;
  const off  = (st.getLotOffset ? st.getLotOffset() : st.lotOffset) || {x:0,y:0};
  const bgMeta = st.lastBgMeta || { fileName: '', assetScale: 1 };
  const bgSrc = (refs && refs.bgImg && refs.bgImg.src) || st.bgSrc || '';

  async function toDataUrlIfBlob(src) {
    if (!src) return '';
    if (/^(data:|https?:)/i.test(src)) return src;
    if (/^blob:/i.test(src)) {
      const img = new Image(); img.crossOrigin='anonymous'; img.src = src;
      if (img.decode) { try { await img.decode(); } catch {} }
      await new Promise(r => { if (img.complete) r(); else img.onload = () => r(); });
      const c = document.createElement('canvas'); c.width = img.naturalWidth||img.width; c.height = img.naturalHeight||img.height;
      const ctx = c.getContext('2d'); ctx.drawImage(img,0,0); try { return c.toDataURL('image/png'); } catch { return src; }
    }
    return src;
  }

  if (lot) {
    lot.meta = lot.meta || {};
    lot.meta._lpBgMeta   = { fileName: bgMeta.fileName || '', assetScale: +bgMeta.assetScale || 1 };
    lot.meta._lpLotOffset = { x: +off.x || 0, y: +off.y || 0 };
  }
  const bg = await toDataUrlIfBlob(bgSrc);
  return { lot, opts: { loop }, bg: bg ? { value: bg, name: bgMeta.fileName || '', assetScale: +bgMeta.assetScale || 1 } : undefined };
}

export function setApiBase(url) { try { window.__API_BASE__ = String(url||'').replace(/\/+$/, ''); } catch {} }

export function initShare({ refs, onSuccess, onError } = {}) {
  const btn = document.querySelector('#shareBtn,[data-share]');
  if (!btn) return { destroy(){} };

  async function handler(e) {
    try {
      e?.preventDefault?.();
      // Собираем состояние и отправляем
      const payload = await readState(refs);
      const res = await apiPost(payload);

      let url = res?.url || (res?.id ? ( (window.__PUBLIC_ORIGIN__||location.origin).replace(/\/$/,'') + '/s/' + encodeURIComponent(res.id) ) : '');
      if (!url && res?.ok) url = 'OK';

      if (!url) throw new Error('Пустой ответ API');
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
      const out = document.querySelector('#shareUrl,[data-share-url]'); if (out) { if ('value' in out) out.value = url; else out.textContent = url; }
      showSuccessToast('Ссылка скопирована');
      onSuccess?.(url);
    } catch(err) {
      console.error('[share] failed:', err);
      showErrorToast(err?.message || 'Share failed', btn);
      onError?.(err);
    }
  }

  btn.addEventListener('click', handler);
  return { destroy(){ btn.removeEventListener('click', handler); } };
}
