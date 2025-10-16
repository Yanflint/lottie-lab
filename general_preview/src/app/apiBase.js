// src/app/apiBase.js
// Centralized API base URL builder used by all API calls (GET/POST).
// Priority: window.__API_BASE__ (set in config.js) -> <html data-api-base> -> empty (relative '/api').

export function getApiBase() {
  try {
    const w = (typeof window !== 'undefined') ? window : {};
    const doc = (typeof document !== 'undefined') ? document : null;
    const fromWindow = w.__API_BASE__ || '';
    const fromHtml = (doc && doc.documentElement && doc.documentElement.getAttribute('data-api-base')) || '';
    const base = String(fromWindow || fromHtml || '').trim();
    return base.replace(/\/+$/, ''); // strip trailing slash
  } catch (e) {
    return '';
  }
}

export function buildApiUrl(pathWithLeadingSlash, query='') {
  const p = pathWithLeadingSlash.startsWith('/') ? pathWithLeadingSlash : ('/' + pathWithLeadingSlash);
  const base = getApiBase();
  if (!base) return p + (query ? (p.includes('?') ? '&' : '?') + query : '');
  return base + p + (query ? (p.includes('?') ? '&' : '?') + query : '');
}