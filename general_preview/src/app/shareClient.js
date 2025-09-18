// shareClient.js — payload mode; no key required, direct CF base (no /share)
const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');

// Read state safely
function readState() { try { return window.state || window.appState || {}; } catch { return {}; } }

async function toDataUrlIfBlob(src) {
  if (!src) return '';
  if (/^(data:|https?:)/i.test(src)) return src;
  if (/^blob:/i.test(src)) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    if (img.decode) { try { await img.decode(); } catch {} }
    await new Promise(r => { if (img.complete) r(); else img.onload = () => r(); });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    try { return canvas.toDataURL('image/png'); } catch { return src; }
  }
  return src;
}

async function postShare(payload) {
  const url = API_BASE; // БЕЗ /share
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
  if (!r.ok) throw new Error(`share failed ${r.status} ${r.statusText} — ` + text.slice(0,200));
  return data || {};
}

export async function createShareLinkFromState(refs) {
  const st = readState();
  const lot = st.lastLottieJSON ? JSON.parse(JSON.stringify(st.lastLottieJSON)) : null;
  const loop = !!st.loopOn;
  const offset = (st.getLotOffset ? st.getLotOffset() : st.lotOffset) || {x:0,y:0};
  const bgMeta = st.lastBgMeta || { fileName: '', assetScale: 1 };
  const bgSrc = (refs && refs.bgImg && refs.bgImg.src) || st.bgSrc || '';

  if (lot) {
    lot.meta = lot.meta || {};
    lot.meta._lpBgMeta = { fileName: bgMeta.fileName || '', assetScale: +bgMeta.assetScale || 1 };
    lot.meta._lpLotOffset = { x: +offset.x || 0, y: +offset.y || 0 };
  }

  const bg = await toDataUrlIfBlob(bgSrc);
  const payload = { lot, opts: { loop }, bg: bg ? { value: bg, name: bgMeta.fileName || '', assetScale: +bgMeta.assetScale || 1 } : undefined };

  const res = await postShare(payload);
  if (res && typeof res.url === 'string') return res.url;
  if (res && res.id) {
    const origin = (window.__PUBLIC_ORIGIN__) || location.origin;
    return origin.replace(/\/$/,'') + '/s/' + encodeURIComponent(res.id);
  }
  if (res && res.ok) return 'OK';
  throw new Error('share: no url/id in response');
}

export function initShare(options={}) {
  const { buttonSelector = '#shareBtn,[data-share]', refs, onSuccess, onError } = options;
  const btn = document.querySelector(buttonSelector);
  if (!btn) { console.warn('initShare: button not found'); return { destroy(){} }; }
  async function handler(e) {
    try {
      e?.preventDefault?.();
      const url = await createShareLinkFromState(refs);
      try { await navigator.clipboard.writeText(url); } catch {}
      const out = document.querySelector('#shareUrl,[data-share-url]'); if (out) { if ('value' in out) out.value = url; else out.textContent = url; }
      onSuccess?.(url);
    } catch (err) { console.error(err); onError?.(err); alert('Share failed: ' + (err?.message||err)); }
  }
  btn.addEventListener('click', handler);
  return { destroy(){ btn.removeEventListener('click', handler); } };
}
