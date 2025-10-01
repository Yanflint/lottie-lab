import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';
import { setLastLottie } from './state.js';
import { addToHistory } from './history.js';

async function processFilesSequential(refs, files) {
  // Collect the first image and all JSONs
  let imgFile = null;
  const jsonFiles = [];
  for (const f of files) {
    if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
    const isJson = f.type === 'application/json' || f.name?.endsWith?.('.json') || f.type === 'text/plain';
    if (isJson) jsonFiles.push(f);
  }

  // Background first (optional)
  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    await afterTwoFrames(); await afterTwoFrames();
    try { document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  }

  // Load Lottie files: add all to history; display the last one
  let lastJson = null;
  for (const f of jsonFiles) {
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      addToHistory({ data: json, name: f.name });
      lastJson = json;
    } catch (e) {
      console.error('Ошибка парсинга Lottie JSON', e);
    }
  }

  if (lastJson) {
    await loadLottieFromData(refs, lastJson);
    try { setLastLottie(lastJson); } catch {}
    setPlaceholderVisible(refs, false);
    await afterTwoFrames(); await afterTwoFrames();
    try { document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
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
    const files = dt.files && dt.files.length ? Array.from(dt.files) : [];
    if (!files.length && dt.items && dt.items.length) {
      for (const it of dt.items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
    }
    if (files.length) return processFilesSequential(refs, files);
  };

  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);

  // Paste support
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = []; let textCandidate = null;
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) { const f = it.getAsFile(); if (f) files.push(f); }
      else if (it.type === 'application/json' || it.type === 'text/plain') {
        textCandidate = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
      }
    }
    if (files.length) await processFilesSequential(refs, files);
    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        addToHistory({ data: json, name: 'pasted.json' });
        setLastLottie(json);
        await loadLottieFromData(refs, json);
        setPlaceholderVisible(refs, false);
        await afterTwoFrames(); await afterTwoFrames();
        try { document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
      } catch {}
    }
  });
}
