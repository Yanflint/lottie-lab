import { setBackgroundFromSrc } from './lottie.js';
import { addLayerFromData } from './layers.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';
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
    try { await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:bg-updated')); } catch {}
  }

  for (const jf of jsonFiles) {
    try {
      const txt = await jf.text();
      const json = JSON.parse(txt);
      setLastLottie(json);
      await addLayerFromData(refs, json);
      setPlaceholderVisible(refs, false);
      try { await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
    } catch (e) {
      console.error('Invalid JSON', e);
    }
  }
}

export function initDnd({ refs }) {
  let depth = 0;

  const onDragEnter = (e) => { e.preventDefault(); if (depth++ === 0) setDropActive(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; setDropActive(false); } };
  const onDrop = async (e) => {
    e.preventDefault(); depth = 0; setDropActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) await processFilesSequential(refs, files);
  };

  const root = refs?.wrapper || document;
  root.addEventListener('dragenter', onDragEnter);
  root.addEventListener('dragover',  onDragOver);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop',      onDrop);

  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    let textCandidate = null;

    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const f = it.getAsFile?.(); if (f) files.push(f);
      } else if (it.type === 'application/json' || it.type === 'text/plain') {
        if (it.getAsString) {
          textCandidate = await new Promise((resolve) => it.getAsString(resolve));
        } else {
          textCandidate = e.clipboardData.getData('text');
        }
      }
    }

    if (files.length) await processFilesSequential(refs, files);

    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        setLastLottie(json);
        await addLayerFromData(refs, json);
        setPlaceholderVisible(refs, false);
        try { await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
      } catch (e) {
        console.error('Invalid JSON from clipboard', e);
      }
    }
  });
}
