import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie } from './state.js';

async function processFilesSequential(refs, files) {
  let imgFile = null;
  const jsonFiles = [];
  for (const f of files) {
    if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
    const isJson = f.type === 'application/json' || f.name?.toLowerCase?.().endsWith('.json') || f.type === 'text/plain';
    if (isJson) jsonFiles.push(f);
  }
  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); window.dispatchEvent?.(new CustomEvent('lp:content-painted')); } catch {}
  }
  for (const jf of jsonFiles) {
    try {
      const text = await jf.text();
      const json = JSON.parse(text);
      await loadLottieFromData(refs, json);
      setLastLottie(json);
      setPlaceholderVisible(refs, false);
      try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); window.dispatchEvent?.(new CustomEvent('lp:content-painted')); } catch {}
    } catch (e) { console.error(e); }
  }
}

export function initDnd({ refs }) {
  let depth = 0;

  const onDragEnter = (e) => { e.preventDefault(); if (++depth === 1) setDropActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
  let __dropGuard = false;
  const onDrop = async (e) => {
    e.preventDefault();
    if (__dropGuard) return; __dropGuard = true; setTimeout(()=>__dropGuard=false, 300);
    depth = 0; setDropActive(false);
    const dt = e.dataTransfer;
    const files = [];
    if (dt?.files?.length) {
      for (const f of Array.from(dt.files)) files.push(f);
    } else if (dt?.items?.length) {
      for (const it of dt.items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
    }
    if (files.length) await processFilesSequential(refs, files);
  };

  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);
  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  // document-level drop removed to avoid double handling
  // document.addEventListener('drop', onDrop);

  document.addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = [];
    const textCandidates = [];
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) { const f = it.getAsFile(); if (f) files.push(f); }
      else if (it.type === 'application/json' || it.type === 'text/plain') {
        const str = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
        if (str) textCandidates.push(str);
      }
    }
    if (files.length) await processFilesSequential(refs, files);
    for (const text of textCandidates) {
      try {
        const json = JSON.parse(text);
        await loadLottieFromData(refs, json);
        setLastLottie(json);
        setPlaceholderVisible(refs, false);
        try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); window.dispatchEvent?.(new CustomEvent('lp:content-painted')); } catch {}
      } catch {}
    }
  });

  return {
    destroy() {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
      document.removeEventListener('paste', this._onPaste);
    }
  };
}