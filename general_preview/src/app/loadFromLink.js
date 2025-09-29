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
  try{
    const { importPayload } = await import('./layers.js');
    const ok = await importPayload(refs, data);
    return !!ok;
  } catch (e) {
    console.error('applyPayload (multi) error', e);
    return false;
  }
}

export async function initLoadFromLink({ refs, isStandalone }) {
  setPlaceholderVisible(refs, true);

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


