// Загружаем по /s/:id. Если id нет и это standalone, пробуем "последний" снимок.
// Флаг цикла (opts.loop) применяем до создания анимации.
import { setPlaceholderVisible, afterTwoFrames } from './utils.js';

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
  const m = location.pathname.match(/\/s\/([^/?#]+)/);
  if (m && m[1]) return m[1];
  const u = new URL(location.href);
  const q = u.searchParams.get('id');
  return q || null;
}

function applyLoopFromPayload(refs, data) {
  if (data && data.opts && typeof data.opts.loop === 'boolean') {
    state.loopOn = !!data.opts.loop;
    if (refs?.loopChk) refs.loopChk.checked = state.loopOn;
  }
}

async function applyPayload(refs, data) {
  try { 
    console.groupCollapsed('LOAD PAYLOAD');
    console.log('payload keys:', Object.keys(data||{}));
    console.log('has bg:', !!(data && data.bg));
    console.log('top-level lots length:', Array.isArray(data && data.lots) ? data.lots.length : 0);
    try { console.log('embedded lot.meta._lpLots length:', Array.isArray(data && data.lot && data.lot.meta && data.lot.meta._lpLots) ? data.lot.meta._lpLots.length : 0); } catch {}
    console.log('has single lot:', !!(data && data.lot));
    console.groupEnd();
  } catch(e){}
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
  // Multi-lottie support
  if (Array.isArray(data.lots) && data.lots.length) {
    try {
      const { hydrateLots } = await import('./multi.js');
      hydrateLots({ refs }, data.lots);
      // When lots are present, skip single lot branch
    } catch (e) { console.error('hydrateLots failed', e); }
  } else if (data.lot && data.lot.meta && Array.isArray(data.lot.meta._lpLots) && data.lot.meta._lpLots.length) {
    try {
      const { hydrateLots } = await import('./multi.js');
      hydrateLots({ refs }, data.lot.meta._lpLots);
    } catch (e) { console.error('hydrateLots(_lpLots) failed', e); }
  } else if (data.lot) {
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
  try {
    console.groupCollapsed('APPLY RESULT');
    const s = (await import('./state.js'));
    const items = s.state && s.state.lottieList || [];
    console.log('items on canvas:', items.length);
    items.forEach((it, i) => console.log(i, {id: it.id, name: it.name, x: it.x, y: it.y, w: it.w, h: it.h, loop: it.loop}));
    console.groupEnd();
  } catch(e) {}
  try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  
  } finally { try { if (_hid && refs?.lotStage) refs.lotStage.style.visibility = ''; } catch {} }
  return true;
return true;
}

function readDataParam(){
  try{
    const u = new URL(location.href);
    let d = u.searchParams.get('d');
    if (!d && u.hash) {
      const sp = new URLSearchParams(u.hash.replace(/^#/, ''));
      d = sp.get('d') || null;
    }
    if (!d) return null;
    // URL-safe base64 -> normal base64
    d = d.replace(/-/g,'+').replace(/_/g,'/');
    const pad = d.length % 4; if (pad) d += '='.repeat(4-pad);
    const json = decodeURIComponent(escape(atob(d)));
    const payload = JSON.parse(json);
    return payload || null;
  }catch(e){ return null; }
}

export async function initLoadFromLink({ refs, isStandalone }) {
  setPlaceholderVisible(refs, true);
  // 0) data-url payload
  try{ const data = readDataParam(); if (data){ await applyPayload(refs, data); return; } } catch(e) {}
// 1) Пробуем id из URL
  const id = getShareIdFromLocation();
  if (id) {
    try {
      let data=null;
    if (id === 'last' || id === '__last__') {
      try { const st = await fetchStableLastPayload(2000); data = st?.data || null; } catch {}
    } else {
      const r = await fetch(`https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (r.ok) data = await r.json().catch(() => null);
    }
    if (data && await applyPayload(refs, data)) return;
    } catch (e) { console.error('share GET error', e); }
  }

  // 2) Если ярлык — тянем "последний" снимок с сервера
  if (isStandalone) {
    try {
      const r = await fetch('https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p?id=last', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (await applyPayload(refs, data)) return;
      }
    } catch (e) { console.error('last GET error', e); }
  }

  // 3) Резерв: локальный pinned
  if (isStandalone) {
    const pinned = loadPinned();
    if (pinned && await applyPayload(refs, pinned)) return;
  }

  // 4) Ничего не нашли — остаётся плейсхолдер
}
