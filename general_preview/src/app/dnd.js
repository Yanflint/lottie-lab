
import { setBackgroundFromSrc, loadLottieFromData, getAnim } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';
import { setLastLottie, state } from './state.js';
import { initMulti, addLottieFromJSON, hasAny as multiHasAny } from './multi.js';

async function migrateSingleToMulti(refs) {
  try {
    const json = state.lastLottieJSON;
    if (!json) return false;
    if (!multiHasAny()) initMulti(refs);
    await addLottieFromJSON(refs, json, 'existing');
    const mount = refs?.lottieMount || document.getElementById('lottie');
    try { const anim = getAnim && getAnim(); anim?.destroy?.(); } catch {}
    try { if (mount) mount.innerHTML = ''; } catch {}
    return true;
  } catch (e) {
    console.warn('[dnd] migrateSingleToMulti failed', e);
    return false;
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
    try { await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  }

  if (jsonFiles.length) {
    if (jsonFiles.length > 1 || multiHasAny() || state.lastLottieJSON) {
      if (!multiHasAny() && state.lastLottieJSON) { await migrateSingleToMulti(refs); }
      if (!multiHasAny()) initMulti(refs);
      for (const f of jsonFiles) {
        try {
          const txt = await f.text();
          const json = JSON.parse(txt);
          await addLottieFromJSON(refs, json, f.name);
          setLastLottie(json);
        } catch (e) { console.error('[dnd] bad json', f?.name, e); }
      }
      setPlaceholderVisible(refs, false);
    } else {
      const f = jsonFiles[0];
      try {
        const txt = await f.text();
        const json = JSON.parse(txt);
        await loadLottieFromData(refs, json);
        setLastLottie(json);
        setPlaceholderVisible(refs, false);
        try { await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
      } catch (e) { console.error('[dnd] bad json', f?.name, e); }
    }
  }
}

export function initDnd({ refs }) {
  let depth = 0, dropBusy = false;

  const onDragEnter = (e) => { e.preventDefault(); if (depth++ === 0) setDropActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
  const onDrop = async (e) => {
    e.preventDefault();
    if (dropBusy) return;
    dropBusy = true;
    depth = 0; setDropActive(false);
    const dt = e.dataTransfer;
    if (dt?.files?.length) {
      await processFilesSequential(refs, Array.from(dt.files));
      dropBusy = false; return;
    }
    if (dt?.items?.length) {
      const files = [];
      for (const it of dt.items) if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); }
      if (files.length) { await processFilesSequential(refs, files); dropBusy = false; return; }
    }
    dropBusy = false;
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
        if (multiHasAny()) { await addLottieFromJSON(refs, json, 'paste'); }
        else { await loadLottieFromData(refs, json); }
        setPlaceholderVisible(refs, false);
      } catch {}
    }
  });
}
