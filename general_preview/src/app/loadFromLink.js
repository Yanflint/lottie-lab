// src/app/loadFromLink.js
import { setPlaceholderVisible } from './utils.js';
import { setBackgroundFromSrc } from './lottie.js';
import { addLottieFromData, setOffset, relayoutAll } from './multi.js';
import { API_BASE } from './shareClient.js';

function getShareIdFromLocation() {
  try {
    const p = location.pathname || '';
    const q = location.search || '';
    const h = location.hash || '';
    let m = p.match(/\/s\/([^\/\?#]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    const sp = new URLSearchParams(q);
    const idQ = sp.get('id');
    if (idQ) return decodeURIComponent(idQ);
    m = h.match(/\/s\/([^\/\?#]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  } catch {}
  return null;
}

export async function initLoadFromLink({ refs }) {
  const id = getShareIdFromLocation();
  if (!id) return;

  setPlaceholderVisible(refs, true);
  try {
    const url = API_BASE + '?id=' + encodeURIComponent(id);
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error('payload get failed ' + resp.status);
    const payload = await resp.json();

    if (payload?.bg?.value) {
      await setBackgroundFromSrc(refs, payload.bg.value, { fileName: payload?.bg?.name || '' });
    }

    let lots = Array.isArray(payload?.lots) && payload.lots.length ? payload.lots : null;
    if (!lots && payload?.lot?.meta?._lpLots && Array.isArray(payload.lot.meta._lpLots) && payload.lot.meta._lpLots.length) {
      lots = payload.lot.meta._lpLots;
    }
    if (!lots && payload?.lot) lots = [payload.lot];

    if (lots && lots.length) {
      for (let i=0;i<lots.length;i++){
        const lot = lots[i];
        await addLottieFromData(lot);
        const off = (lot?.meta?._lpOffset || lot?.meta?._lpPos || {x:0,y:0});
        try { setOffset(i, off.x||0, off.y||0); } catch {}
      }
      try { relayoutAll(); } catch {}
    }
  } catch (e) {
    console.error('initLoadFromLink error', e);
  } finally {
    setPlaceholderVisible(refs, false);
  }
}
