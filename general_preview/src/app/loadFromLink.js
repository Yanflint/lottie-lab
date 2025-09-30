
import { setPlaceholderVisible, afterTwoFrames } from './utils.js';
import { setBackgroundFromSrc, addLottieFromData, layoutLottie } from './lottie.js';
import { setSelectedId, setItemOffset } from './state.js';

export function getShareIdFromLocation(){
  const m = location.pathname.match(/\/s\/([^/?#]+)/);
  if (m && m[1]) return m[1];
  const u = new URL(location.href);
  return u.searchParams.get('id');
}

export async function initLoadFromLink({ refs, isStandalone }){
  setPlaceholderVisible(refs, true);
  const id = getShareIdFromLocation();
  if (!id){ setPlaceholderVisible(refs, false); return; }

  try{
    const url = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p?id=' + encodeURIComponent(id);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('payload get failed '+r.status);
    const data = await r.json();

    // background
    if (data?.bg?.src) await setBackgroundFromSrc(refs, data.bg.src, data?.bg?.meta || {});

    // multi
    if (Array.isArray(data?.lots) && data.lots.length){
      for (const it of data.lots){
        const id = await addLottieFromData(refs, it.lot, it.name || '');
        if (it?.offset) setItemOffset(id, +it.offset.x || 0, +it.offset.y || 0);
      }
      layoutLottie(refs);
    } else if (data?.lot){
      const id = await addLottieFromData(refs, data.lot);
      // old payload also might have meta._lpOffset
      const off = data?.lot?.meta?._lpOffset || data?.lot?.meta?._lpPos;
      if (off) setItemOffset(id, +off.x || 0, +off.y || 0);
      layoutLottie(refs);
    }
  }catch(e){ console.error('Load payload error', e); }
  setPlaceholderVisible(refs, false);
  try{ await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); }catch{}
}
