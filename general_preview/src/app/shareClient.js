// general_preview/src/app/shareClient.js — builds payload and POSTs to /api/share
import { state, getLotOffset } from './state.js';

async function toDataUrlIfNeeded(src) {
  if (!src) return '';
  if (/^(data:|https?:)/i.test(src)) return src;
  if (/^blob:/i.test(src)) {
    // convert blob URL to data URL via canvas
    const img = new Image();
    img.src = src;
    if (img.decode) { try { await img.decode(); } catch {} }
    await new Promise(r => { if (img.complete) r(); else img.onload = () => r(); });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    try { return canvas.toDataURL('image/png'); } catch(e) { return src; }
  }
  return src;
}

function buildPayload(refs) {
  const lot = state.lastLottieJSON ? JSON.parse(JSON.stringify(state.lastLottieJSON)) : null;
  const loopOn = !!state.loopOn;
  const offset = getLotOffset ? getLotOffset() : (state.lotOffset || {x:0,y:0});
  const bgMeta = state.lastBgMeta || { fileName: '', assetScale: 1 };
  const bgSrc = refs?.bgImg?.src || '';

  if (lot) {
    lot.meta = lot.meta || {};
    lot.meta._lpBgMeta = { fileName: bgMeta.fileName || '', assetScale: +bgMeta.assetScale || 1 };
    lot.meta._lpLotOffset = { x: +offset.x || 0, y: +offset.y || 0 };
  }

  return { lot, opts: { loop: loopOn }, _bgSrc: bgSrc, _bgMeta: bgMeta };
}

async function postShare(fullPayload) {
  const r = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullPayload)
  });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
  if (!r.ok) throw new Error(`share failed ${r.status} ${r.statusText} — ${text.slice(0,200)}`);
  return data || {};
}

export function initShare({ refs } = {}) {
  const btn = document.getElementById('shareBtn') || document.querySelector('[data-share]');
  if (!btn) { console.warn('share: button not found'); return { destroy(){} }; }

  async function handler(e){
    try {
      e?.preventDefault?.();
      const base = buildPayload(refs);

      // Ensure bg is data URL (if blob)
      const bgValue = await toDataUrlIfNeeded(base._bgSrc);
      const payload = {
        bg: bgValue ? { value: bgValue, name: base._bgMeta?.fileName || '', assetScale: +base._bgMeta?.assetScale || 1 } : undefined,
        lot: base.lot,
        opts: base.opts
      };

      const res = await postShare(payload);
      // Back-compat: function may return {id} or {url}
      let url = '';
      if (res.url && typeof res.url === 'string') {
        url = res.url;
      } else if (res.id) {
        const origin = (window.__PUBLIC_ORIGIN__) || (location.origin);
        // Prefer /s/:id viewer route; it works if 404->index.html is configured
        url = origin.replace(/\/$/,'') + '/s/' + encodeURIComponent(res.id);
      }

      if (!url) throw new Error('share: no url/id in response');

      try { await navigator.clipboard.writeText(url); } catch {}
      const out = document.querySelector('#shareUrl,[data-share-url]');
      if (out) { if ('value' in out) out.value = url; else out.textContent = url; }
      // tiny toast
      try {
        const t = document.getElementById('toast');
        if (t) { t.textContent = 'Ссылка скопирована'; t.classList.add('on'); setTimeout(()=>t.classList.remove('on'), 1500); }
      } catch {}

    } catch(err) {
      console.error(err);
      alert('Share failed: ' + (err?.message || err));
    }
  }

  btn.addEventListener('click', handler);
  return { destroy(){ btn.removeEventListener('click', handler); } };
}