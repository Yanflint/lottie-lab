import { setBackgroundFromSrc, loadLottieFromData, getAnim } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';
import { setLastLottie, state } from './state.js';
import { initMulti, addLottieFromJSON, hasAny as multiHasAny } from './multi.js';


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
    try { await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  }

  if (jsonFiles.length) {
    if (jsonFiles.length > 1 || multiHasAny() || state.lastLottieJSON) {
      if (!multiHasAny() && state.lastLottieJSON) {
        // migrate existing single lottie into multi
        try {
          initMulti(refs);
          const json = state.lastLottieJSON;
          if (json) {
            await addLottieFromJSON(refs, json, 'existing');
            // wipe single mount
            const mount = refs?.lottieMount || document.getElementById('lottie');
            try { const anim = getAnim && getAnim(); anim?.destroy?.(); } catch {}
            try { if (mount) mount.innerHTML = ''; } catch {}
          }
        } catch {}
      } else if (!multiHasAny()) {
        initMulti(refs);
      }

      for (const f of jsonFiles) {
        try {
          const txt = await f.text(); const json = JSON.parse(txt);
          await addLottieFromJSON(refs, json, f.name);
          setLastLottie(json);
        } catch (e) { console.error('[dnd] bad json', f?.name, e); }
      }
      setPlaceholderVisible(refs, false);
    } else {
      const f = jsonFiles[0];
      try {
        const txt = await f.text(); const json = JSON.parse(txt);
        await loadLottieFromData(refs, json);
        setLastLottie(json);
        setPlaceholderVisible(refs, false);
        try { await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
      } catch (e) { console.error('[dnd] bad json', f?.name, e); }
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
