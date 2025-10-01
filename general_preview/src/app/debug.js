
// src/app/debug.js
import { pickEngine } from './engine.js';
import { addLottieLayer } from './layers.js';

const SMOKE = {
  v:"5.7.6", fr:30, ip:0, op:90, w:256, h:256, nm:"SmokeTest",
  ddd:0, assets:[],
  layers:[{
    ddd:0, ty:4, nm:"rect",
    ks:{ o:{a:0,k:100}, r:{a:0,k:0}, p:{a:0,k:[128,128,0]}, a:{a:0,k:[0,0,0]}, s:{a:0,k:[100,100,100]}},
    shapes:[
      {ty:"rc", d:1, s:{a:0,k:[180,180]}, p:{a:0,k:[0,0]}, r:{a:0,k:24}, nm:"rect"},
      {ty:"fl", c:{a:0,k:[1,0.466,0,1]}, o:{a:0,k:100}, nm:"fill"}
    ],
    ip:0, op:90, st:0, sr:1, bm:0
  }]
};

function h(tag, attrs={}, children=[]){
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k==="class") el.className = v;
    else if (k==="style") el.setAttribute("style", v);
    else el.setAttribute(k, v);
  });
  children.forEach(c => el.appendChild(typeof c==="string" ? document.createTextNode(c) : c));
  return el;
}

function ensurePanel(){
  let p = document.getElementById('dbgPanel');
  if (p) return p;
  const css = document.createElement('style');
  css.textContent = `
  #dbgPanel{ position:fixed; right:12px; top:12px; width:360px; max-height:80vh; overflow:auto;
    background:#0b0f1a; color:#fff; border:1px solid #293040; border-radius:12px; z-index:10000; box-shadow:0 10px 40px rgba(0,0,0,.5); }
  #dbgPanel .hd{ display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #293040; position:sticky; top:0; background:#0b0f1a; }
  #dbgPanel .hd .ttl{ font-weight:700; }
  #dbgPanel .bd{ padding:10px; display:flex; flex-direction:column; gap:8px; }
  #dbgPanel .row{ display:flex; gap:6px; flex-wrap:wrap; }
  #dbgPanel .btn{ cursor:pointer; border:1px solid #38445a; background:#131827; color:#fff; border-radius:8px; padding:6px 10px; }
  #dbgPanel .btn:hover{ background:#192037; }
  #dbgPanel .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:11px; white-space:pre-wrap; }
  #dbgPanel .ok{ color:#9fe870 } #dbgPanel .warn{ color:#ffd166 } #dbgPanel .err{ color:#ff7373 }
  `;
  document.head.appendChild(css);
  p = h('div', {id:'dbgPanel'}, [
    h('div', {class:'hd'}, [
      h('div', {class:'ttl'}, ['Debug (Shift+D)']),
      h('div', {style:'flex:1'}),
      h('button', {class:'btn', id:'dbgClose'}, ['×'])
    ]),
    h('div', {class:'bd'}, [
      h('div', {id:'dbgStatus', class:'mono'}),
      h('div', {class:'row'}, [
        h('button', {id:'dbgSmokeLottie', class:'btn'}, ['Smoke: Lottie-web']),
        h('button', {id:'dbgSmokeRlottie', class:'btn'}, ['Smoke: rlottie']),
        h('button', {id:'dbgHidePH', class:'btn'}, ['Hide Placeholder']),
        h('button', {id:'dbgStageOutline', class:'btn'}, ['Toggle Stage Outline']),
      ]),
      h('div', {class:'row'}, [
        h('button', {id:'dbgForceAuto', class:'btn'}, ['Engine: auto']),
        h('button', {id:'dbgForceLw', class:'btn'}, ['Engine: lottie-web']),
        h('button', {id:'dbgForceRl', class:'btn'}, ['Engine: rlottie']),
      ]),
      h('div', {id:'dbgLog', class:'mono'})
    ])
  ]);
  document.body.appendChild(p);
  document.getElementById('dbgClose').onclick = () => p.remove();
  return p;
}

function log(s){ try {
  const el = document.getElementById('dbgLog'); if (!el) return;
  const line = `[${new Date().toLocaleTimeString()}] ${s}\n`;
  el.textContent = (el.textContent + line).split('\n').slice(-200).join('\n');
  console.log('%cDBG','color:#9fe870', s);
} catch {}}

function collect(){
  const st = {};
  const w = document.getElementById('wrapper');
  const prev = document.getElementById('preview');
  const lot = document.getElementById('lottie');
  const ph = document.getElementById('ph');
  const stage = document.getElementById('multiStage');
  st.enginePick = (function(){ try{ return pickEngine(); }catch(e){ return 'ERR: '+e; } })();
  st.hasWindowLottie = !!(window.lottie && window.lottie.loadAnimation);
  st.wrapper = !!w; st.preview = !!prev; st.lottie = !!lot; st.placeholder = !!ph;
  const r = el => (el && el.getBoundingClientRect) ? el.getBoundingClientRect() : null;
  st.rect = { preview:r(prev), lottie:r(lot), stage:r(stage) };
  st.layers = Array.from(document.querySelectorAll('.multi-stage .lot-layer')).length;
  st.placeholderHidden = ph ? ph.classList.contains('hidden') : null;
  st.z = {
    preview: getComputedStyle(prev||document.body).zIndex,
    lottie:  getComputedStyle(lot||document.body).zIndex,
    stage:   stage ? getComputedStyle(stage).zIndex : null
  };
  return st;
}

function paintStatus(){
  const s = collect();
  const el = document.getElementById('dbgStatus'); if (!el) return;
  el.textContent = JSON.stringify(s, null, 2);
}

function togglePanel(on){
  if (on === undefined) on = !document.getElementById('dbgPanel');
  if (on){ ensurePanel(); paintStatus(); } else { document.getElementById('dbgPanel')?.remove(); }
}

async function smoke(engineKind){
  if (engineKind === 'lottie') window.__forceEngine = 'lottie';
  else if (engineKind === 'rlottie') window.__forceEngine = 'rlottie';
  else window.__forceEngine = null;
  try {
    await addLottieLayer({}, SMOKE, `Smoke-${engineKind||'auto'}`);
    log('Smoke test layer requested');
  } catch (e) {
    log('Smoke test failed: '+e);
  } finally {
    paintStatus();
  }
}

function bind(){
  // Auto open if ?debug=1
  const u = new URL(location.href);
  if (u.searchParams.get('debug') === '1') togglePanel(true);
  window.addEventListener('keydown', (e)=>{
    if (e.shiftKey && e.key.toLowerCase()==='d'){ togglePanel(); }
  });
  document.addEventListener('click', (e) => {
    const id = e.target?.id || '';
    if (id==='dbgSmokeLottie') smoke('lottie');
    else if (id==='dbgSmokeRlottie') smoke('rlottie');
    else if (id==='dbgHidePH'){ try{ document.getElementById('ph')?.classList.add('hidden'); }catch{} paintStatus(); }
    else if (id==='dbgStageOutline'){
      const st = document.getElementById('multiStage');
      if (st){ const on = st.style.outline !== ''; st.style.outline = on ? '' : '1px solid #6ee7b7'; }
    } else if (id==='dbgForceAuto'){ window.__forceEngine = null; log('forceEngine=auto'); }
      else if (id==='dbgForceLw'){ window.__forceEngine = 'lottie'; log('forceEngine=lottie'); }
      else if (id==='dbgForceRl'){ window.__forceEngine = 'rlottie'; log('forceEngine=rlottie'); }
  });

  setInterval(paintStatus, 500);
}

// Minimal console bridge
(function(){
  const _err = console.error;
  console.error = function(...a){ try{ log('[ERR] '+a.join(' ')); }catch{}; return _err.apply(console, a); };
})();

document.addEventListener('DOMContentLoaded', bind);
