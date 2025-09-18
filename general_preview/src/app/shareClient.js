// general_preview/src/app/shareClient.js
// Клиент для Cloud Function, которая отдает ссылку на объект в бакете.
// Работает с публичной функцией из Яндекс Облака (Node.js 22/20).

// !!! ВСТАВЬ сюда URL своей функции (из консоли Cloud Functions)
const DEFAULT_API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'; // <= замени

// Можно переопределить базу из кода/окна: window.__API_BASE__ = 'https://...'
function getApiBase() {
  const base = (typeof window !== 'undefined' && window.__API_BASE__) || DEFAULT_API_BASE;
  return String(base).replace(/\/+$/, ''); // без хвостового слеша
}

/**
 * Внутренний helper для POST-запросов к функции.
 * Бросает осмысленную ошибку с HTTP-статусом и фрагментом ответа.
 */
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

  // Пытаемся прочитать JSON, если не получилось — текст
  let bodyText = '';
  let data = null;
  const text = await res.text();
  bodyText = text.slice(0, 300); // для сообщений об ошибке
  try { data = text ? JSON.parse(text) : null; } catch (_) { /* not json */ }

  if (!res.ok) {
    const msg = `API error ${res.status} ${res.statusText} @ ${url} — ${bodyText}`;
    throw new Error(msg);
  }
  return data ?? {};
}

/**
 * Создает «шаринг»-ссылку на объект в бакете.
 * @param {string} key - путь внутри бакета, например: "projects/demo/animation.json"
 * @returns {Promise<string>} публичный URL
 */
export async function createShareLink(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('createShareLink: "key" обязателен и должен быть строкой');
  }
  // убираем лидирующий слэш, чтобы ключ был относительный к корню бакета
  const normalizedKey = key.replace(/^\/+/, '');

  const res = await apiPost('/share', { key: normalizedKey });
  if (!res || typeof res.url !== 'string') {
    throw new Error('Malformed response from /share: нет поля "url"');
  }
  return res.url;
}

/**
 * Опционально: динамически сменить базовый URL API в рантайме
 * (если удобнее не править DEFAULT_API_BASE).
 */
export function setApiBase(url) {
  if (typeof window !== 'undefined') {
    window.__API_BASE__ = url;
  }
}
