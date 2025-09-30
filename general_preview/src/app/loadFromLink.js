
import { setPlaceholderVisible, afterTwoFrames } from './utils.js';
import { setBackgroundFromSrc, addLottieFromData, layoutLottie } from './lottie.js';
import { setSelectedId, setItemOffset } from './state.js';

<<<<<<< Updated upstream
async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function fetchStableLastPayload(maxMs=2000){
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline){
    const pr = await fetch('https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p?id=last', { cache: 'no-store' });
    if (!pr.ok) throw new Error('payload get failed '+pr.status);
    const et = (pr.headers.get('ETag') || '').replace(/"/g,'');
    const data = await pr.json().catch(()=>null);
    let revNow = '';
    try{
      const rr = await fetch('https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p?id=last&rev=1', { cache: 'no-store' });
      if (rr.ok){ const j = await rr.json().catch(()=>({})); revNow = String(j.rev||''); }
    }catch{}
    const hasLot = !!(data && typeof data === 'object' && data.lot);
    if (hasLot && et && revNow && et === revNow) return { data, etag: et };
    await sleep(250);
  }
  const pr2 = await fetch('https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p?id=last', { cache: 'no-store' });
  const data2 = await pr2.json().catch(()=>null);
  const et2 = (pr2.headers.get('ETag') || '').replace(/"/g,'');
  return { data: data2, etag: et2 };
}

import { setLotOffset } from './state.js';
import { setLastLottie, state } from './state.js';
import { setBackgroundFromSrc, loadLottieFromData, layoutLottie } from './lottie.js';
import { loadPinned } from './pinned.js';

function getShareIdFromLocation() {
=======
export function getShareIdFromLocation(){
>>>>>>> Stashed changes
  const m = location.pathname.match(/\/s\/([^/?#]+)/);
  if (m && m[1]) return m[1];
  const u = new URL(location.href);
  return u.searchParams.get('id');
}

<<<<<<< Updated upstream
function applyLoopFromPayload(refs, data) {
  if (data && data.opts && typeof data.opts.loop === 'boolean') {
    state.loopOn = !!data.opts.loop;
    if (refs?.loopChk) refs.loopChk.checked = state.loopOn;
  }
}

async function applyPayload(refs, data) {
  let _hid=false; try {

  if (!data || typeof data !== 'object') return false;

  // ВАЖНО: сначала применяем флаг цикла
  applyLoopFromPayload(refs, data);

  // временно спрячем слой лотти до пересчёта, чтобы не было "вспышки" старого расположения
  try { if (refs?.lotStage) refs.lotStage.style.visibility = 'hidden'; _hid=true; } catch {}

  // скрываем лотти до полного применения размеров и конвертации
  try { if (refs?.lotStage) refs.lotStage.style.visibility = 'hidden'; } catch {}
  if (data.bg) {
    const src = typeof data.bg === 'string' ? data.bg : data.bg.value;
    const meta = (typeof data.bg === 'object') ? { fileName: data.bg.name, assetScale: data.bg.assetScale } : {};
    if (!meta.fileName && data.lot && data.lot.meta && data.lot.meta._lpBgMeta) { meta.fileName = data.lot.meta._lpBgMeta.fileName; meta.assetScale = data.lot.meta._lpBgMeta.assetScale; }
    if (src) await setBackgroundFromSrc(refs, src, meta);
  }
  if (data.lot) {
    try {
      const m = data?.lot?.meta?._lpOffset;
      if (m && typeof m.x === 'number' && typeof m.y === 'number') setLotOffset(m.x || 0, m.y || 0);
    
    
    try { layoutLottie(refs); } catch {}try { layoutLottie(); } catch {}
} catch {}
    setLastLottie(data.lot);
    await loadLottieFromData(refs, data.lot); // учтёт state.loopOn
  }

  setPlaceholderVisible(refs, false);
  layoutLottie(refs);
  try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  
  } finally { try { if (_hid && refs?.lotStage) refs.lotStage.style.visibility = ''; } catch {} }
  return true;
return true;
}

export async function initLoadFromLink({ refs, isStandalone }) {
=======
export async function initLoadFromLink({ refs, isStandalone }){
>>>>>>> Stashed changes
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
