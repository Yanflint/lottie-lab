// shareClient.js — direct Cloud Function call (no proxy)
export function setApiBase(url) {
  if (typeof window !== 'undefined') window.__API_BASE__ = String(url || '').replace(/\/+$/, '');
}

const DEFAULT_API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');
function apiBase() { return (typeof window!=='undefined'&&window.__API_BASE__) || DEFAULT_API_BASE; }

async function postJson(path, payload, { timeout=15000 }={}) {
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), timeout);
  const url = apiBase() + (path.startsWith('/')?path:'/'+path);
  try {
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload||{}), signal: ctrl.signal });
    const txt = await r.text(); let data=null; try{ data = txt?JSON.parse(txt):null }catch{}
    if(!r.ok) throw new Error(`share failed ${r.status} ${r.statusText} — ${txt.slice(0,200)}`);
    return data||{};
  } finally { clearTimeout(t); }
}

export async function createShareLink(key) {
  if(!key||typeof key!=='string') throw new Error('createShareLink: need key');
  const res = await postJson('/share', { key: key.replace(/^\/+/, '') });
  if (typeof res.url !== 'string') throw new Error('Bad response: no url');
  return res.url;
}

function getState() { try { return window.appState || window.state || {}; } catch { return {}; } }

export function initShare(options={}) {
  const { buttonSelector = '#shareBtn,[data-share]', keySelector = '#projectKey,[data-key]', key: keyOverride, onSuccess, onError } = options;
  const btn = document.querySelector(buttonSelector);
  if(!btn) { console.warn('initShare: button not found'); return { destroy(){} }; }
  async function handler(e) {
    try {
      e?.preventDefault?.();
      let key = keyOverride;
      if(!key) {
        const src = document.querySelector(keySelector);
        if (src) key = src.getAttribute('data-key') || ('value' in src ? src.value : src.textContent?.trim());
      }
      if(!key) throw new Error('initShare: не удалось получить key (проверь options.key или data-key)');
      const url = await createShareLink(key);
      try { await navigator.clipboard.writeText(url); } catch { }
      const out = document.querySelector('#shareUrl,[data-share-url]'); if(out) { if('value' in out) out.value=url; else out.textContent=url; }
      onSuccess?.(url);
    } catch(err) { console.error(err); onError?.(err); alert('Share failed: '+(err?.message||err)); }
  }
  btn.addEventListener('click', handler);
  return { destroy(){ btn.removeEventListener('click', handler); } };
}
