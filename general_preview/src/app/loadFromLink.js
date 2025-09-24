
// src/app/loadFromLink.js
import { setPlaceholderVisible } from './utils.js';
import { setBackgroundFromSrc } from './lottie.js';
import { addLottieFromData, setOffset, relayoutAll } from './multi.js';
import { API_BASE } from './shareClient.js';

function getShareIdFromLocation() {
  try {
    const m = location.pathname.match(/\/s\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

export async function initLoadFromLink({ refs }) {
  setPlaceholderVisible(refs, true);
  const id = getShareIdFromLocation();
  if (!id) { setPlaceholderVisible(refs, false); return; }

  try {
    const url = API_BASE + '?id=' + encodeURIComponent(id);
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error('payload get failed ' + resp.status);
    const payload = await resp.json();

    // background
    if (payload?.bg?.value) {
      await setBackgroundFromSrc(refs, payload.bg.value, { fileName: payload?.bg?.name || '' });
    }

    // lots multi
    if (Array.isArray(payload?.lots) && payload.lots.length) {
      for (let i=0;i<payload.lots.length;i++){
        const lot = payload.lots[i];
        await addLottieFromData(lot);
        const off = (lot?.meta?._lpOffset || lot?.meta?._lpPos || {x:0,y:0});
        try { setOffset(i, off.x||0, off.y||0); } catch {}
      }
      try { relayoutAll(); } catch {}
    } else if (payload?.lot) {
      // single fallback
      await addLottieFromData(payload.lot);
      const off = (payload?.lot?.meta?._lpOffset || payload?.lot?.meta?._lpPos || {x:0,y:0});
      try { setOffset(0, off.x||0, off.y||0); } catch {}
      try { relayoutAll(); } catch {}
    }

  } catch (e) {
    console.error('initLoadFromLink error', e);
  } finally {
    setPlaceholderVisible(refs, false);
  }
}
