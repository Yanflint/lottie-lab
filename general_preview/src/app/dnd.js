<<<<<<< Updated upstream
<<<<<<< Updated upstream
// src/app/dnd.js
import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';
import { setLastLottie } from './state.js';

/**
 * Process an array-like of File objects:
 *  - First image/* becomes background
 *  - First JSON (or .json / text/plain that parses as JSON) becomes Lottie
 */
async function processFilesSequential(refs, files) {
  let imgFile = null;
  let jsonFile = null;

  for (const f of files) {
    if (!imgFile && f?.type && f.type.startsWith('image/')) {
      imgFile = f;
      continue;
    }
    const looksJson = (f?.type === 'application/json') || (f?.name && f.name.toLowerCase().endsWith('.json')) || (f?.type === 'text/plain');
    if (!jsonFile && looksJson) {
      jsonFile = f;
    }
  }

  // Set background first (if provided)
  if (imgFile) {
    try {
      const url = URL.createObjectURL(imgFile);
      await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
      setPlaceholderVisible(refs, false);
      await afterTwoFrames();
      document.dispatchEvent(new CustomEvent('lp:content-painted'));
    } catch (e) {
      console.error('Failed to set background from dropped file:', e);
    }
  }

  // Then load lottie
  if (jsonFile) {
    try {
      const txt = await jsonFile.text();
      const json = JSON.parse(txt);
      setLastLottie(json);
      await loadLottieFromData(refs, json);
      setPlaceholderVisible(refs, false);
      await afterTwoFrames();
      document.dispatchEvent(new CustomEvent('lp:content-painted'));
    } catch (e) {
      console.error('Failed to parse or load Lottie JSON from dropped file:', e);
    }
  }
}

/**
 * Initialize drag-n-drop and paste handlers
 */
export function initDnd(refs) {
  if (!refs) refs = {};

  // --- Drag & Drop
  const onDragOver = (e) => {
    e.preventDefault();
    setDropActive(true);
    try { if (refs.dropOverlay) refs.dropOverlay.classList.add('visible'); } catch {}
  };

  const onDragLeave = (e) => {
    // If leaving document/window
    if (e.relatedTarget === null) {
      setDropActive(false);
      try { if (refs.dropOverlay) refs.dropOverlay.classList.remove('visible'); } catch {}
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDropActive(false);
    try { if (refs.dropOverlay) refs.dropOverlay.classList.remove('visible'); } catch {}

    const dt = e.dataTransfer;
    const files = [];

    if (dt?.items && dt.items.length) {
      for (const it of dt.items) {
        if (it.kind === 'file') {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
=======

import { setBackgroundFromSrc, addLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';

function isJsonFile(f){
  return f.type === 'application/json' || f.name?.toLowerCase()?.endsWith('.json') || f.type === 'text/plain';
}

async function processFiles(refs, files){
  const imgs = [];
  const jsons = [];
  for (const f of files){
    if (f.type?.startsWith?.('image/')) imgs.push(f);
    else if (isJsonFile(f)) jsons.push(f);
  }

=======

import { setBackgroundFromSrc, addLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';

function isJsonFile(f){
  return f.type === 'application/json' || f.name?.toLowerCase()?.endsWith('.json') || f.type === 'text/plain';
}

async function processFiles(refs, files){
  const imgs = [];
  const jsons = [];
  for (const f of files){
    if (f.type?.startsWith?.('image/')) imgs.push(f);
    else if (isJsonFile(f)) jsons.push(f);
  }

>>>>>>> Stashed changes
  // background: take the FIRST image only (explicit behavior)
  if (imgs.length){
    const imgFile = imgs[0];
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    try{ await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  }

  // lotties: add ALL jsons
  for (const jf of jsons){
    try{
      const txt = await jf.text();
      const json = JSON.parse(txt);
      await addLottieFromData(refs, json, jf.name || json?.nm || '');
      setPlaceholderVisible(refs, false);
      try{ await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
    }catch(e){ console.error('Load JSON failed', e); }
  }
}

export function initDnd({ refs }){
  const holder = refs?.preview || document.getElementById('preview') || document.body;

  holder.addEventListener('dragover', (e) => {
    e.preventDefault(); e.stopPropagation();
    setDropActive(refs, true);
  }, { passive:false });

  holder.addEventListener('dragleave', (e) => {
    e.preventDefault(); e.stopPropagation();
    setDropActive(refs, false);
  }, { passive:false });

  holder.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation();
    setDropActive(refs, false);
    const dt = e.dataTransfer;
    const files = Array.from(dt?.files || []);
    await processFiles(refs, files);
  }, { passive:false });

  document.addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = [];
    let jsonText = null;

    for (const it of items){
      if (it.type?.startsWith?.('image/')) { const f = it.getAsFile(); if (f) files.push(f); }
      else if (isJsonFile({ type: it.type, name: '' })){
        jsonText = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
<<<<<<< Updated upstream
>>>>>>> Stashed changes
      }
    } else if (dt?.files && dt.files.length) {
      for (const f of dt.files) files.push(f);
    }
<<<<<<< Updated upstream

    if (files.length) {
      await processFilesSequential(refs, files);
    }
  };

  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragenter', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);

  // --- Paste (supports image/* and JSON from clipboard)
  document.addEventListener('paste', async (e) => {
    try {
      const items = Array.from(e.clipboardData?.items || []);
      const files = [];
      let textCandidate = null;

      for (const it of items) {
        if (it.type && it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) files.push(f);
        } else if (it.type === 'application/json' || it.type === 'text/plain') {
          // getAsString is async
          if (typeof it.getAsString === 'function') {
            textCandidate = await new Promise((resolve) => it.getAsString(resolve));
          } else {
            textCandidate = e.clipboardData.getData('text') || null;
          }
        }
      }

      if (files.length) {
        await processFilesSequential(refs, files);
      }

      if (textCandidate) {
        try {
          const json = JSON.parse(textCandidate);
          setLastLottie(json);
          await loadLottieFromData(refs, json);
          setPlaceholderVisible(refs, false);
          await afterTwoFrames();
          document.dispatchEvent(new CustomEvent('lp:content-painted'));
        } catch (err) {
          // Non-JSON text in clipboard; ignore
        }
      }
    } catch (err) {
      console.error('paste handler failed:', err);
=======
    if (files.length) await processFiles(refs, files);
    if (jsonText){
      try{ const json = JSON.parse(jsonText); await addLottieFromData(refs, json); setPlaceholderVisible(refs, false); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); }catch{}
>>>>>>> Stashed changes
=======
      }
    }
    if (files.length) await processFiles(refs, files);
    if (jsonText){
      try{ const json = JSON.parse(jsonText); await addLottieFromData(refs, json); setPlaceholderVisible(refs, false); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); }catch{}
>>>>>>> Stashed changes
    }
  });
}
