import { state, setLastBgMeta, setLastBgSize } from './state.js';
import { addLayerFromJson, layoutStage, importPayload } from './layers.js';
import { createShareLink, loadById } from './share.js';

function qs(id){ return document.getElementById(id); }

function isViewer(){
  const u = new URL(location.href);
  return !!(u.searchParams.get('s') || (location.pathname.match(/^\/s\//)));
}
function getShareId(){
  const u = new URL(location.href);
  const q = (u.searchParams.get('s')||'').trim();
  if(q) return q;
  const m = location.pathname.match(/\/s\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function onResize(){ layoutStage(); }
window.addEventListener('resize', onResize);

function bindUI(){
  const bgInput = qs('bgInput');
  const lotInput = qs('lotInput');
  const shareBtn = qs('shareBtn');
  const shareUrl = qs('shareUrl');
  const bgImg = qs('bgImg');

  bgInput.addEventListener('change', async (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const url = URL.createObjectURL(f);
    bgImg.src = url;
    await new Promise(r=>{ bgImg.onload=r; bgImg.onerror=r; });
    setLastBgMeta({ fileName: f.name, assetScale: 1 });
    setLastBgSize({ w: bgImg.naturalWidth||0, h:bgImg.naturalHeight||0 });
    layoutStage();
  });

  lotInput.addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files||[]);
    for(const f of files){
      if(!/json|text/.test(f.type) && !/\.json$/i.test(f.name)) continue;
      const txt = await f.text();
      try{ await addLayerFromJson(JSON.parse(txt)); }catch{}
    }
  });

  shareBtn.addEventListener('click', async ()=>{
    try{
      const url = await createShareLink();
      shareUrl.value = url;
      try{ await navigator.clipboard.writeText(url); }catch{}
    }catch(e){
      alert('Share error: '+(e&&e.message));
    }
  });
}

async function maybeViewer(){
  if(!isViewer()) return;
  // Ensure base for assets
  try{
    const base=document.querySelector('base'); if(!base) { const b=document.createElement('base'); b.href='/'; document.head.appendChild(b); }
  }catch{}
  const id = getShareId();
  if(!id) return;
  try{
    const data = await loadById(id);
    await importPayload(data);
  }catch(e){
    console.error('Viewer load error', e);
  }
}

window.addEventListener('DOMContentLoaded', ()=>{
  bindUI();
  maybeViewer();
});
