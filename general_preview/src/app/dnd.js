
import { setBackgroundFromSrc, loadLottieFromData, getAnim } from './lottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie, state } from './state.js';
import { initMulti, addLottieFromJSON, hasAny as multiHasAny } from './multi.js';


async function migrateSingleToMulti(refs) {
  try {
    const json = state.lastLottieJSON;
    if (!json) return false;
    await addLottieFromJSON(refs, json, 'existing');
    // Очищаем одиночный контейнер
    const mount = refs?.lottieMount || document.getElementById('lottie');
    try { const anim = getAnim(); anim?.destroy?.(); } catch {}
    try { if (mount) mount.innerHTML = ''; } catch {}
    return true;
  } catch (e) {
    console.warn('[dnd] migrateSingleToMulti failed', e);
    return false;
  }
}

async function handleJsonList(refs, jsonFiles) {
  // Если более одного JSON — включаем мультирежим
  if (jsonFiles.length > 1 || multiHasAny() || state.lastLottieJSON) {
    if (!multiHasAny() && state.lastLottieJSON) { await migrateSingleToMulti(refs); }
    for (const f of jsonFiles) {
      try {
        const txt = await f.text();
        const json = JSON.parse(txt);
        await addLottieFromJSON(refs, json, f.name);
        setPlaceholderVisible(refs, false);
        setLastLottie(json);
      } catch (e) { console.error('[dnd] bad json', f?.name, e); }
    }
  } else if (jsonFiles.length === 1) {
    const f = jsonFiles[0];
    try {
      const txt = await f.text();
      const json = JSON.parse(txt);
      await loadLottieFromData(refs, json);
      setPlaceholderVisible(refs, false);
      setLastLottie(json);
    } catch (e) { console.error('[dnd] bad json', f?.name, e); }
  }
}

async function processFilesSequential(refs, files) {
  let imgFile = null;
  const jsonFiles = [];
  for (const f of files) {
    if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
    const isJson = f.type === 'application/json' || f.name?.endsWith?.('.json') || f.type === 'text/plain';
    if (isJson) jsonFiles.push(f);
  }
  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    try {
      const { afterTwoFrames } = await import('./utils.js');
      await afterTwoFrames();
      document.dispatchEvent(new CustomEvent('lp:content-painted'));
    } catch {}
  }
  if (jsonFiles.length) {
    await handleJsonList(refs, jsonFiles);
  }
}


export function initDnd({ refs }) {
  initMulti(refs);

  let dragDepth = 0;
  let dropBusy = false;
  const setDrop = (on) => { try { setDropActive(refs?.dropOverlay || document.getElementById('dropOverlay'), on); } catch {} };

  function onDragEnter(e){ dragDepth++; setDrop(true); e.preventDefault(); try{e.stopPropagation();}catch{} }
  function onDragOver(e){ e.preventDefault(); try{e.stopPropagation();}catch{} }
  function onDragLeave(e){ dragDepth = Math.max(0, dragDepth - 1); if (dragDepth === 0) setDrop(false); try{e.stopPropagation();}catch{} }
  async function onDrop(e){
    if (dropBusy) { try{e.preventDefault(); e.stopPropagation();}catch{} return; }
    dropBusy = true;
    e.preventDefault(); try{e.stopPropagation();}catch{}
    dragDepth = 0; setDrop(false);
    const files = Array.from(e.dataTransfer?.files || []);
    await processFilesSequential(refs, files);
    setTimeout(()=>{ dropBusy=false; }, 0);
  }

  const targets = [document];
  for (const t of targets) {
    if (!t) continue;
    t.addEventListener('dragenter', onDragEnter);
    t.addEventListener('dragover', onDragOver);
    t.addEventListener('dragleave', onDragLeave);
    t.addEventListener('drop', onDrop);
  }

  // paste (img or single json)

  initMulti(refs);
  // paste (img or multiple json via text/plain won't really work, but keep single-json support)
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = []; let textCandidate = null;
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const f = it.getAsFile(); if (f) files.push(f);
      } else if (it.type === 'application/json' || it.type === 'text/plain') {
        textCandidate = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
      }
    }
    if (files.length) await processFilesSequential(refs, files);
    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        if (multiHasAny()) {
          await addLottieFromJSON(refs, json, 'paste');
        } else {
          await loadLottieFromData(refs, json);
        }
        setPlaceholderVisible(refs, false);
      } catch {}
    }
  });
}


try {
  window.addEventListener('drop', () => { document.body.classList.remove('dragging'); }, { passive: true });
  window.addEventListener('dragend', () => { document.body.classList.remove('dragging'); }, { passive: true });
} catch {}
