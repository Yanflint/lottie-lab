import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { initMulti, addLottieFromJSON, hasAny as multiHasAny } from './multi.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie, state } from './state.js';


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
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  }
  if (jsonFiles.length) {
    if (jsonFiles.length > 1 || multiHasAny() || state.lastLottieJSON) {
      if (!multiHasAny()) initMulti(refs);
      for (const f of jsonFiles) {
        try {
          const txt = await f.text(); const json = JSON.parse(txt);
          await addLottieFromJSON(refs, json, f.name);
          setLastLottie(json);
        } catch (e) { console.error('Invalid JSON', e); }
      }
      setPlaceholderVisible(refs, false);
    } else {
      const f = jsonFiles[0];
      try {
        const txt = await f.text(); const json = JSON.parse(txt);
        setLastLottie(json);
        await loadLottieFromData(refs, json);
        setPlaceholderVisible(refs, false);
        try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
      } catch (e) { console.error('Invalid JSON', e); }
    }
  }
}
  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  }
  if (jsonFile) {
    const text = await jsonFile.text();
    try {
      const json = JSON.parse(text);
      setLastLottie(json);
      await loadLottieFromData(refs, json);
      setPlaceholderVisible(refs, false);
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
    } catch (e) { console.error('Invalid JSON', e); }
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
    if (dt.files && dt.files.length) return processFilesSequential(refs, Array.from(dt.files));
    if (dt.items && dt.items.length) {
      const files = [];
      for (const it of dt.items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
      if (files.length) return processFilesSequential(refs, files);
    }
  };
  
let depth = 0; let dropBusy = false;
const onDragEnter = (e) => { e.preventDefault(); if (depth++ === 0) setDropActive(true); };
const onDragOver  = (e) => { e.preventDefault(); };
const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
const onDrop = async (e) => {
  e.preventDefault(); depth = 0; setDropActive(false);
  if (dropBusy) return; dropBusy = true;
  const dt = e.dataTransfer; if (!dt) { dropBusy=false; return; }
  if (dt.files && dt.files.length) { await processFilesSequential(refs, Array.from(dt.files)); dropBusy=false; }
  else if (dt.items && dt.items.length) {
    const files = []; for (const it of dt.items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
    if (files.length) { await processFilesSequential(refs, files); dropBusy=false; }
  } else { dropBusy=false; }
};
for (const t of [window, document]) {
  t.addEventListener('dragenter', onDragEnter);
  t.addEventListener('dragover',  onDragOver);
  t.addEventListener('dragleave', onDragLeave);
  t.addEventListener('drop',      onDrop);
}
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
    if (textCandidate) { try { const json = JSON.parse(textCandidate); setLastLottie(json); await loadLottieFromData(refs, json); setPlaceholderVisible(refs, false);
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {} } catch {} }
  });
}
