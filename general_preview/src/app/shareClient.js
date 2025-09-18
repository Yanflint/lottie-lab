// auto-generated shareClient.js (patched)
// Function base URL injected
const DEFAULT_API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p';

function getApiBase() {
  const base = (typeof window !== 'undefined' && window.__API_BASE__) || DEFAULT_API_BASE;
  return String(base).replace(/\/+$/, '');
}

async function apiPost(path, payload, { timeout = 15000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const snippet = text.slice(0, 300);
    throw new Error(`API error ${res.status} ${res.statusText} — ${snippet}`);
  }
  return data ?? {};
}

export async function createShareLink(key) {
  if (!key || typeof key !== 'string') throw new Error('createShareLink: "key" обязателен');
  const normalizedKey = key.replace(/^\/+/, '');
  const res = await apiPost('/share', { key: normalizedKey });
  if (!res || typeof res.url !== 'string') throw new Error('Malformed response from /share');
  return res.url;
}

export function setApiBase(url) {
  if (typeof window !== 'undefined') window.__API_BASE__ = String(url || '').replace(/\/+$/, '');
}

export function initShare(options = {}) {
  const {
    buttonSelector = '#shareBtn,[data-share]',
    keySelector = '#projectKey,[data-key]',
    key: keyOverride,
    endpointBase,
    onSuccess,
    onError,
  } = options;

  if (endpointBase) setApiBase(endpointBase);
  const btn = document.querySelector(buttonSelector);
  if (!btn) {
    console.warn('initShare: не нашла кнопку по селектору', buttonSelector);
    return { destroy() {} };
  }
  async function handler(e) {
    try {
      e?.preventDefault?.();
      let key = keyOverride;
      if (!key) {
        const src = document.querySelector(keySelector);
        if (src) key = src.getAttribute('data-key') || ('value' in src ? src.value : src.textContent?.trim());
      }
      if (!key) {
        // Попробуем спросить у пользователя имя проекта и сформировать key
        let base = (document.getElementById('projectName')?.value
                    || document.querySelector('[data-project-name]')?.getAttribute('data-project-name')
                    || document.title || 'project').toString();
        // простая "slugify"
        base = base.toLowerCase().trim()
          .replace(/\s+/g,'-')
          .replace(/[^a-z0-9._-]+/g,'-')
          .replace(/-+/g,'-')
          .replace(/^-|-$/g,'');
        const input = prompt('Введите имя проекта для ссылки (латиницей):', base);
        if (!input) { alert('Нужно указать имя проекта'); return; }
        const slug = String(input).toLowerCase().trim()
          .replace(/\s+/g,'-')
          .replace(/[^a-z0-9._-]+/g,'-')
          .replace(/-+/g,'-')
          .replace(/^-|-$/g,'');
        key = `projects/${slug}/animation.json`;
        // запомним на странице для следующих кликов
        let pk = document.getElementById('projectKey');
        if (!pk) {
          pk = document.createElement('input');
          pk.type = 'hidden';
          pk.id = 'projectKey';
          document.body.appendChild(pk);
        }
        pk.value = key;
      }
      const url = await createShareLink(key);
      try { await navigator.clipboard.writeText(url); } catch (e) { }
      const out = document.querySelector('#shareUrl,[data-share-url]');
      if (out) { if ('value' in out) out.value = url; else out.textContent = url; }
      onSuccess?.(url);
    } catch (err) {
      console.error(err);
      onError?.(err);
    }
  }
  btn.addEventListener('click', handler);
  return { destroy() { btn.removeEventListener('click', handler); } };
}