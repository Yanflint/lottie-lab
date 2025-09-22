
import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie } from './state.js';
import { initMulti, addLottieFromJSON, hasAny as multiHasAny } from './multi.js';

async function handleJsonList(refs, jsonFiles) {
  // Если более одного JSON — включаем мультирежим
  if (jsonFiles.length > 1 || multiHasAny()) {
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

  // drag-over indicator
  const dropOverlay = refs?.dropOverlay || document.getElementById('dropOverlay');
  const setDrop = (on) => { try { setDropActive(dropOverlay, on); } catch {} };

  // drop
  document.addEventListener('dragover', (e) => { e.preventDefault(); setDrop(true); });
  document.addEventListener('dragleave', (e) => { setDrop(false); });
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    setDrop(false);
    const files = Array.from(e.dataTransfer?.files || []);
    await processFilesSequential(refs, files);
  });

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
