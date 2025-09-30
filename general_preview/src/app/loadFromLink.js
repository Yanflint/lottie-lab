// Minimal load-from-link (prototype): fetch payload by ?s=<id> or /s/<id>, import into layers
import { setPlaceholderVisible } from './utils.js';
import { importPayload } from './layers.js';
import { API_BASE } from './shareClient.js';

function getShareId(){
  try{
    const u = new URL(location.href);
    const q = (u.searchParams.get('s')||'').trim();
    if (q) return q;
    const m = location.pathname.match(/\/s\/(.+)$/);
    if (m) return decodeURIComponent(m[1]);
  }catch{}
  return '';
}

export async function initLoadFromLink({ refs, isStandalone }){
  const id = getShareId();
  if (!id) return;
  try{
    setPlaceholderVisible(refs, true);
    const url = `${API_BASE}?id=${encodeURIComponent(id)}`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error('payload get failed ' + resp.status);
    const data = await resp.json();
    await importPayload(refs, data);
    setPlaceholderVisible(refs, false);
  }catch(e){
    console.error('viewer load failed', e);
    setPlaceholderVisible(refs, false);
  }
}
