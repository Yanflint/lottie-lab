import { exportPayload } from './layers.js';

export const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/,''); // your function

async function postPayload(payload){
  const url = API_BASE;
  const resp = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const txt = await resp.text();
  let data=null; try{ data = txt ? JSON.parse(txt) : null; }catch{}
  if(!resp.ok) throw new Error('share failed '+resp.status);
  // Prefer id; fallback to extracting from url
  let id = data && data.id;
  if(!id && data && typeof data.url==='string'){
    const m = data.url.match(/\/s\/([^/?#]+)/) || data.url.match(/[?&]id=([^&]+)/);
    if(m) id = decodeURIComponent(m[1]);
  }
  if(!id) throw new Error('no id in response');
  const origin = location.origin.replace(/\/$/,'');
  return origin + '/?s=' + encodeURIComponent(id);
}

export async function createShareLink(){
  const payload = exportPayload();
  // If bg is blob:, convert to dataURL for portability
  try{
    const img = document.getElementById('bgImg');
    if(/^blob:/.test(img.src)){
      const w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,w,h);
      payload.bg.value = c.toDataURL('image/png');
    }
  }catch{}
  return postPayload(payload);
}

export async function loadById(id){
  const url = API_BASE + '?id=' + encodeURIComponent(id);
  const resp = await fetch(url, { cache:'no-store' });
  if(!resp.ok) throw new Error('payload get failed '+resp.status);
  return await resp.json();
}
