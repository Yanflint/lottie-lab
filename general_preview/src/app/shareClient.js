// general_preview/src/app/shareClient.js
import { showSuccessToast, showErrorToast } from './updateToast.js';
import { withLoading } from './utils.js';

const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');
const CANDIDATE_PATHS = ['/share', '']; // try with suffix and without

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
  let lastErr = null;
  for (const p of CANDIDATE_PATHS) {
    try {
      const data = await postJSON(API_BASE + p, { key });
      const origin = (window.__PUBLIC_ORIGIN__) || location.origin;
      if (data && typeof data.url === 'string') return data.url;
      if (data && data.id) return origin.replace(/\/$/, '') + '/s/' + encodeURIComponent(data.id);
      throw new Error('share: пустой ответ API');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('share: все попытки не удались');
}

function readKeyFromDOM() {
  const btn = document.querySelector('[data-share], #shareBtn');
  if (btn && btn.dataset && btn.dataset.key) return btn.dataset.key;
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
      // pass BUTTON first (API expects withLoading(el, fn))
      const url = await withLoading(btn, () => createShareLink(key));
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
