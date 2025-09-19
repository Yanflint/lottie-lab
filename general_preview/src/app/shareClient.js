// general_preview/src/app/shareClient.js
// Патч: уводим с /api/share на Cloud Function. Поддерживаем старую логику тостов и withLoading.

import { showSuccessToast, showErrorToast } from './updateToast.js';
import { withLoading } from './utils.js';

const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');
const CANDIDATE_PATHS = ['/share', '']; // пробуем и с /share, и без

async function postJSON(url, payload) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const txt = await r.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { }
  if (!r.ok) throw new Error(`share failed: ${r.status}`);
  return data || {};
}

export async function createShareLink(key) {
  if (!key || typeof key !== 'string') throw new Error('initShare: не удалось получить key (проверь data-key/#projectKey)');
  // payload совместим со старым бэком: { key }
  let lastErr = null;
  for (const p of CANDIDATE_PATHS) {
    const url = API_BASE + p;
    try {
      const data = await postJSON(url, { key });
      const origin = (window.__PUBLIC_ORIGIN__) || location.origin;
      if (data && typeof data.url === 'string') return data.url;
      if (data && data.id) return origin.replace(/\/$/, '') + '/s/' + encodeURIComponent(data.id);
      throw new Error('share: пустой ответ API');
    } catch (e) {
      lastErr = e;
      // попробуем следующий путь
    }
  }
  throw lastErr || new Error('share: все попытки не удались');
}

function readKeyFromDOM() {
  // 1) data-key на кнопке
  const btn = document.querySelector('[data-share], #shareBtn');
  if (btn && btn.dataset && btn.dataset.key) return btn.dataset.key;
  // 2) скрытое поле #projectKey
  const inp = document.getElementById('projectKey');
  if (inp && inp.value) return inp.value;
  return null;
}

export function initShare({ onSuccess, onError } = {}) {
  const btn = document.querySelector('[data-share], #shareBtn');
  if (!btn) return { destroy(){} };
  async function handler(e) {
    try {
      e?.preventDefault?.();
      const key = readKeyFromDOM();
      const url = await withLoading(() => createShareLink(key));
      try { await navigator.clipboard.writeText(url); } catch { }
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
