// build yc6
// general_preview/src/app/shareClient.js
import { showSuccessToast, showErrorToast } from './updateToast.js';
import { withLoading } from './utils.js';

const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');
const PATHS = ['']; // пробуем с /share и без

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

function detectKey() {
  // 1) на самой кнопке
  const btn = document.querySelector('[data-share], #shareBtn');
  if (btn && btn.dataset && btn.dataset.key) return btn.dataset.key.trim();
  // 2) скрытый инпут
  const inp = document.getElementById('projectKey');
  if (inp && inp.value) return String(inp.value).trim();
  // 3) meta
  const meta = document.querySelector('meta[name="project-key"]');
  if (meta && meta.content) return meta.content.trim();
  // 4) любой держатель с data-project-key
  const holder = document.querySelector('[data-project-key]');
  if (holder && holder.dataset && holder.dataset.projectKey) return holder.dataset.projectKey.trim();
  // 5) глобальная переменная, если где-то выставляется
  if (window.__PROJECT_KEY) return String(window.__PROJECT_KEY).trim();
  return '';
}

export function setShareKey(key) {
  const k = String(key || '').trim();
  if (!k) return;
  const btn = document.querySelector('[data-share], #shareBtn');
  if (btn) btn.dataset.key = k;
  const inp = document.getElementById('projectKey');
  if (inp) inp.value = k;
  window.__PROJECT_KEY = k;
}

export async function createShareLink(key) {
  const k = (key && String(key).trim()) || detectKey();
  if (!k) throw new Error('initShare: не удалось получить key (проверь data-key/#projectKey)');
  let lastErr = null;
  for (const p of PATHS) {
    try {
      const data = await postJSON(API_BASE + p, { key: k });
      const origin = (window.__PUBLIC_ORIGIN__) || location.origin;
      if (data && typeof data.url === 'string') return data.url;
      if (data && data.id) return origin.replace(/\/$/, '') + '/s/' + encodeURIComponent(data.id);
      throw new Error('share: пустой ответ API');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('share: все попытки не удались');
}

export function initShare({ onSuccess, onError } = {}) {
  const btn = document.querySelector('[data-share], #shareBtn');
  if (!btn) return { destroy(){} };
  async function handler(e) {
    try {
      e?.preventDefault?.();
      const url = await withLoading(btn, () => createShareLink());
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
