import { setBackgroundFromSrc } from './lottie.js';
import { addLayerFromJSON } from './layers.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie } from './state.js';

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
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); document?.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  }

  for (const jf of jsonFiles) {
    try {
      const text = await jf.text();
      const json = JSON.parse(text);
      setLastLottie(json); // keep legacy state updated
      addLayerFromJSON(json, jf.name?.replace?.(/\.json$/i, ''));
      setPlaceholderVisible(refs, false);
    } catch (e) {
      console.error('JSON parse failed', e);
    }
  }
}

export function initDnd({ refs }) {
  let depth = 0;
  const onDragEnter = (e) => { e.preventDefault(); if (++depth === 1) setDropActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
  const onDrop = async (e) => {
    e.preventDefault(); depth = 0; setDropActive(false);
    const dt = e.dataTransfer; if (!dt) return;
    if (dt.files && dt.files.length) { await processFilesSequential(refs, Array.from(dt.files)); return; }
    if (dt.items && dt.items.length) {
      const files = [];
      for (const it of dt.items) {
        if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
      }
      if (files.length) { await processFilesSequential(refs, files); return; }
    }
  };
  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);
  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);

  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    let textCandidate = null;

    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const f = it.getAsFile(); if (f) files.push(f);
      } else if (it.type === 'application/json' || it.type === 'text/plain') {
        if (typeof it.getAsString === 'function') {
          textCandidate = await new Promise((resolve) => it.getAsString(resolve));
        } else {
          textCandidate = e.clipboardData?.getData?.('text') || null;
        }
      }
    }

    if (files.length) await processFilesSequential(refs, files);
    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        setLastLottie(json);
        addLayerFromJSON(json);
        setPlaceholderVisible(refs, false);
        try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); document?.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
      } catch (_e) {}
    }
  });
}
