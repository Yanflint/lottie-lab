
// src/app/history.js
const KEY = 'lp_lottie_history_v1';

function readArr(){
  try { const t = localStorage.getItem(KEY); return t ? JSON.parse(t) : []; } catch { return []; }
}
function writeArr(arr){
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
}

/** @param {{data:any,name?:string,id?:string}} item */
export function addToHistory(item){
  const arr = readArr();
  const id = item?.id || ('id_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const name = String(item?.name || item?.data?.nm || 'Lottie');
  arr.push({ id, name, data: item.data, createdAt: new Date().toISOString() });
  writeArr(arr);
  return id;
}
export function getHistory(){ return readArr(); }
export function getItem(id){ return readArr().find(x=>x.id===id)||null; }
export function removeItem(id){ const arr = readArr().filter(x=>x.id!==id); writeArr(arr); }
export function clearHistory(){ writeArr([]); }
