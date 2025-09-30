import { state } from './state.js';

const layers = []; // {id, el, box, mount, anim, json, offset:{x,y}, loop:false}
let selected = null;
let seq = 1;

function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }
function stage(){ return document.getElementById('stage'); }
function bg(){ return document.getElementById('bgImg'); }
function fitScale(){
  try{
    const b = bg(); const st = stage(); if(!b||!st) return 1;
    const r = b.getBoundingClientRect(); const realW=r.width||0, realH=r.height||0;
    const baseW=+(state.lastBgSize?.w||0), baseH=+(state.lastBgSize?.h||0);
    if(!(realW>0&&realH>0&&baseW>0&&baseH>0)) return 1;
    return Math.min(realW/baseW, realH/baseH);
  }catch{return 1;}
}

export function layoutStage(){
  const st = stage(); if(!st) return;
  const scale = fitScale();
  st.style.transform = `translate(-50%,-50%) scale(${scale})`;
}

export async function addLayerFromJson(json){
  const lot = (typeof json==='string') ? JSON.parse(json) : json;
  const st = stage();
  const cont = el('div','lot-layer');
  const box = el('div','box');
  const mount = el('div','mount');
  box.appendChild(mount); cont.appendChild(box); st.appendChild(cont);

  const w=Math.max(1,Number(lot.w||0)||512);
  const h=Math.max(1,Number(lot.h||0)||512);
  box.style.width = w+'px'; box.style.height = h+'px';

  const anim = window.lottie.loadAnimation({container: mount, renderer:'svg', loop:false, autoplay:true, animationData: lot});

  const id = 'L'+(seq++);
  const layer = { id, el:cont, box, mount, anim, json:lot, offset:{x:0,y:0}, loop:false };
  layers.push(layer);
  select(id);
  wireDrag(layer);
  layoutStage();
  return layer;
}

export function select(id){
  selected = id;
  for(const l of layers){ l.el.classList.toggle('selected', l.id===selected); }
}

export function getSelected(){ return layers.find(l=>l.id===selected) || null; }
export function getAll(){ return layers.slice(); }

export function setOffset(id,x,y){
  const l = layers.find(l=>l.id===id); if(!l) return;
  l.offset = {x:+x||0, y:+y||0};
  l.box.style.transform = `translate(calc(-50% + ${l.offset.x}px), calc(-50% + ${l.offset.y}px))`;
}

export function centerAll(){
  for(const l of layers){ setOffset(l.id,0,0); }
}

function wireDrag(layer){
  let dragging=false,sx=0,sy=0,start={x:0,y:0};
  layer.box.addEventListener('pointerdown', (e)=>{
    select(layer.id);
    try{ layer.box.setPointerCapture(e.pointerId);}catch{}
    dragging=true; sx=e.clientX; sy=e.clientY; start={...layer.offset};
  });
  layer.box.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    const scale = fitScale() || 1;
    const dx=(e.clientX-sx)/scale, dy=(e.clientY-sy)/scale;
    setOffset(layer.id, start.x+dx, start.y+dy);
  });
  const stop=()=>{dragging=false; try{layer.box.releasePointerCapture?.()}catch{}};
  layer.box.addEventListener('pointerup', stop);
  layer.box.addEventListener('pointercancel', stop);
}

export function exportPayload(){
  const b = bg();
  if(!b || !b.src) throw Object.assign(new Error('NO_BG'), {code:'NO_BG'});
  if(!layers.length) throw Object.assign(new Error('NO_LOTTIE'), {code:'NO_LOTTIE'});
  const base = { w: +(state.lastBgSize?.w||0), h: +(state.lastBgSize?.h||0) };
  return {
    bg: { value: b.src, name: (state.lastBgMeta?.fileName||''), assetScale: +(state.lastBgMeta?.assetScale||1) },
    base,
    layers: layers.map(l=>({ json: l.json, meta:{ _lpOffset:{...l.offset} } }))
  };
}

export async function importPayload(data){
  if(!data) return false;
  // bg
  if(data.bg && data.bg.value){
    const img = bg();
    img.src = data.bg.value;
    await new Promise(r=>{ img.onload=r; img.onerror=r; });
    const w=img.naturalWidth||0,h=img.naturalHeight||0;
    state.lastBgSize = {w,h};
    state.lastBgMeta = { fileName: data.bg.name||'', assetScale: data.bg.assetScale||1 };
  }
  // layers
  const st = stage();
  st.innerHTML='';
  const arr = Array.isArray(data.layers) ? data.layers : [];
  for(const l of arr){
    const lyr = await addLayerFromJson(l.json);
    const off = l?.meta?._lpOffset || {x:0,y:0};
    setOffset(lyr.id, +off.x||0, +off.y||0);
  }
  layoutStage();
  return true;
}
