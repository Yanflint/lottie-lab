import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';
import { setLastLottie } from './state.js';

function looksLikeJsonFile(f){
  const name = (f?.name || '').toLowerCase();
  const type = (f?.type || '');
  return (
    type === 'application/json' ||
    type === 'application/octet-stream' ||
    type === 'text/plain' ||
    type === '' ||
    name.endsWith('.json')
  );
}

async function processFilesSequential(refs, files) {
  let imgFile = null;
  const jsonFiles = [];
  for (const f of files) {
    if (!imgFile && f?.type?.startsWith?.('image/')) imgFile = f;
    if (looksLikeJsonFile(f)) jsonFiles.push(f);
  }

  // 1) Background (optional)
  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    try { await afterTwoFrames(); await afterTwoFrames(); } catch {}
  }

  // 2) All Lottie JSONs — add each one
  for (const jf of jsonFiles) {
    try {
      const text = await jf.text();
      let payload = text;
      try { payload = JSON.parse(text); } catch {}
      if (typeof payload === 'object') setLastLottie(payload);
      await loadLottieFromData(refs, payload);
      setPlaceholderVisible(refs, false);
      try { await afterTwoFrames(); } catch {}
      try { window.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
    } catch(e) { console.warn('json add failed', e); }
  }
}

export function initDnd({ refs }) {
  let depth = 0;
  const onDragEnter = (e) => { e.preventDefault(); if (depth++ === 0) setDropActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
  const onDrop = async (e) => {
    e.preventDefault(); depth = 0; setDropActive(false);
    const dt = e.dataTransfer; if (!dt) return;
    const files = [];
    if (dt.files && dt.files.length) for (const f of dt.files) files.push(f);
    else if (dt.items && dt.items.length) {
      for (const it of dt.items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
    }
    if (files.length) return processFilesSequential(refs, files);
  };

  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);
  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);

  // Paste: allow multiple items (images + multiple JSON texts)
  document.addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = []; const texts = [];
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) { const f = it.getAsFile(); if (f) files.push(f); }
      else if (it.type === 'application/json' || it.type === 'text/plain') {
        const t = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
        if (t) texts.push(t);
      }
    }
    if (files.length) await processFilesSequential(refs, files);
    for (const t of texts) {
      try {
        let payload = t;
        try { payload = JSON.parse(t); } catch {}
        if (typeof payload === 'object') setLastLottie(payload);
        await loadLottieFromData(refs, payload);
        setPlaceholderVisible(refs, false);
        try { await afterTwoFrames(); } catch {}
        try { window.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
      } catch {}
    }
  });
}
