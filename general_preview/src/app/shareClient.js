// general_preview/src/app/shareClient.js
// Клиент к Cloud Function, возвращающей ссылку на объект в бакете.
// Экспортирует initShare (для твоего main.js), createShareLink и setApiBase.

// !!! ВСТАВЬ URL своей функции (из Cloud Functions)
const DEFAULT_API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'; // <= замени

function getApiBase() {
  const base = (typeof window !== 'undefined' && window.__API_BASE__) || DEFAULT_API_BASE;
  return String(base).replace(/\/+$/, ''); // срезаем хвостовой слеш
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
  try { data = text ? JSON.parse(text) : null; } catch (_) { /* not json */ }

  if (!res.ok) {
    const snippet = text.slice(0, 300);
    throw new Error(`API error ${res.status} ${res.statusText} — ${snippet}`);
  }
  return data ?? {};
}

// === Публичные функции ===

/** Вернуть публичный URL для объекта в бакете */
export async function createShareLink(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('createShareLink: "key" обязателен и должен быть строкой');
  }
  const normalizedKey = key.replace(/^\/+/, ''); // без лидирующего /
  const res = await apiPost('/share', { key: normalizedKey });
  if (!res || typeof res.url !== 'string') {
    throw new Error('Malformed response from /share: нет поля "url"');
  }
  return res.url;
}

/** Переопределить базовый URL функции в рантайме (не правя DEFAULT_API_BASE) */
export function setApiBase(url) {
  if (typeof window !== 'undefined') {
    window.__API_BASE__ = String(url || '').replace(/\/+$/, '');
  }
}

/**
 * Инициализация кнопки «Share» — drop-in для твоего main.js
 * Подвешивает обработчик клика и копирует ссылку в буфер обмена.
 *
 * @param {Object} options
 * @param {string} [options.buttonSelector='#shareBtn,[data-share]'] - где искать кнопку
 * @param {string} [options.keySelector='#projectKey,[data-key]']     - откуда брать key
 * @param {string} [options.key]                                     - можно передать key напрямую
 * @param {string} [options.endpointBase]                             - если хочешь указать URL функции здесь
 * @param {(url:string)=>void} [options.onSuccess]
 * @param {(err:Error)=>void} [options.onError]
 * @returns {{destroy:()=>void}}
 */
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
        if (src) {
          key = src.getAttribute('data-key') || ('value' in src ? src.value : src.textContent?.trim());
        }
      }
      if (!key) throw new Error('initShare: не удалось получить key (проверь options.key или data-key)');

      const url = await createShareLink(key);

      // копируем в буфер, если доступно
      try { await navigator.clipboard.writeText(url); } catch {}

      // если есть поле для вывода — заполним
      const out = document.querySelector('#shareUrl,[data-share-url]');
      if (out) { if ('value' in out) out.value = url; else out.textContent = url; }

      onSuccess?.(url);
    } catch (err) {
      console.error(err);
      onError?.(err);
      // можно всплывашку/тост, если есть свой UI
    }
  }

  btn.addEventListener('click', handler);
  return { destroy() { btn.removeEventListener('click', handler); } };
}
