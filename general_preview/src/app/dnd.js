import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie } from './state.js';

async function processFilesSequential(refs, files) {
  let imgFile = null;
  const jsonFiles = [];
  for (const f of files) {
    if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
    const isJson = (f.type === 'application/json') || (f.name?.endsWith?.('.json')) || (f.name?.endsWith?.('.lottie')) || (f.type === 'text/plain');
    if (isJson) jsonFiles.push(f);
  }

  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    try {
      const { afterTwoFrames } = await import('./utils.js');
      await afterTwoFrames();
      window.dispatchEvent(new CustomEvent('lp:content-painted'));
    } catch {}
  }

  if (jsonFiles.length) {
    if (jsonFiles.length > 1 && window.__lp_multi) {
      try { window.__lp_multi.ensureStage(refs); } catch {}
      for (const jf of jsonFiles) {
        try { await window.__lp_multi.addFromFile(refs, jf); } catch (e) { console.error('multi add error', e); }
      }
      setPlaceholderVisible(refs, false);
      try {
        const { afterTwoFrames } = await import('./utils.js');
        await afterTwoFrames();
        window.dispatchEvent(new CustomEvent('lp:content-painted'));
      } catch {}
    } else {
      const text = await jsonFiles[0].text();
      try {
        const json = JSON.parse(text);
        setLastLottie(json);
        await loadLottieFromData(refs, json);
        setPlaceholderVisible(refs, false);
        try {
          const { afterTwoFrames } = await import('./utils.js');
          await afterTwoFrames();
          window.dispatchEvent(new CustomEvent('lp:content-painted'));
        } catch {}
      } catch (e) {
        console.error('Invalid JSON', e);
      }
    }
  }
}

export function initDnd({ refs }) {
  let depth = 0;
  const onDragEnter = (e) => { e.preventDefault(); if (depth++ === 0) setDropActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
  const onDrop = async (e) => {
    e.preventDefault();
    depth = 0;
    setDropActive(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    const files = Array.from(dt.files || []);
    if (!files.length) return;
    await processFilesSequential(refs, files);
  };

  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover',  onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop',      onDrop);
  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover',  onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop',      onDrop);

  // paste support
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = []; let textCandidate = null;
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      } else if (it.type === 'application/json' || it.type === 'text/plain') {
        textCandidate = await (it.getAsString
          ? new Promise(r => it.getAsString(r))
          : Promise.resolve(e.clipboardData.getData('text')));
      }
    }
    if (files.length) await processFilesSequential(refs, files);
    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        if (window.__lp_multi?.isActive?.()) {
          try { window.__lp_multi.ensureStage(refs); } catch {}
          try { window.__lp_multi.addFromJSON(refs, 'pasted.json', json); } catch (err) { console.error('multi paste add error', err); }
          setPlaceholderVisible(refs, false);
        } else {
          setLastLottie(json);
          await loadLottieFromData(refs, json);
          setPlaceholderVisible(refs, false);
        }
        try {
          const { afterTwoFrames } = await import('./utils.js');
          await afterTwoFrames();
          window.dispatchEvent(new CustomEvent('lp:content-painted'));
        } catch {}
      } catch {}
    }
  });
}
