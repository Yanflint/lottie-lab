// src/app/shareClient.js (YC fix)
import { showSuccessToast, showErrorToast } from './updateToast.js';
import { withLoading } from './utils.js';

// БАЗОВЫЙ URL функции (без суффиксов)
const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__)
  ? String(window.__API_BASE__).replace(/\/+$/, '')
  : 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');

// универсальный POST
async function apiPost(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const txt = await res.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch {}
  if (!res.ok) throw new Error(`API ${res.status}`);
  return data || {};
}

// где взять key
function detectKey() {
  const btn = document.querySelector('#shareBtn,[data-share]');
  if (btn?.dataset?.key) return btn.dataset.key.trim();
  const inp = document.getElementById('projectKey');
  if (inp && inp.value) return String(inp.value).trim();
  const meta = document.querySelector('meta[name="project-key"]');
  if (meta?.content) return meta.content.trim();
  const holder = document.querySelector('[data-project-key]');
  if (holder?.dataset?.projectKey) return String(holder.dataset.projectKey).trim();
  if (typeof window !== 'undefined' && window.__PROJECT_KEY) return String(window.__PROJECT_KEY).trim();
  return '';
}

export function setShareKey(key) {
  const k = String(key || '').trim();
  if (!k) return;
  try { window.__PROJECT_KEY = k; } catch {}
  const btn = document.querySelector('#shareBtn,[data-share]');
  if (btn) btn.dataset.key = k;
  const inp = document.getElementById('projectKey');
  if (inp) inp.value = k;
}

export async function createShareLink(key) {
  const k = (key && String(key).trim()) || detectKey();
  if (!k) throw new Error('initShare: не удалось получить key (проверь data-key/#projectKey)');
  const data = await apiPost({ key: k });
  let url = data?.url || '';
  if (!url && data?.id) {
    const origin = (typeof window !== 'undefined' && (window.__PUBLIC_ORIGIN__ || window.location.origin)) || '';
    url = origin.replace(/\/$/, '') + '/s/' + encodeURIComponent(data.id);
  }
  if (!url) throw new Error('share: пустой ответ API');
  return url;
}

export function initShare() {
  const btn = document.querySelector('#shareBtn,[data-share]');
  if (!btn) return { destroy(){ } };

  async function handler(e) {
    try {
      e?.preventDefault?.();
      const url = await withLoading(btn, () => createShareLink());
      try { await navigator.clipboard.writeText(url); } catch {}
      showSuccessToast('Ссылка скопирована', btn);
      const out = document.querySelector('#shareUrl,[data-share-url]');
      if (out) { if ('value' in out) out.value = url; else out.textContent = url; }
    } catch (err) {
      console.error('[Share]', err);
      showErrorToast('Не удалось создать ссылку — проверьте, что проект выбран', btn);
    }
  }

  btn.addEventListener('click', handler);
  return { destroy(){ btn.removeEventListener('click', handler); } };
}
