// src/app/dnd.js
import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';
import { setLastLottie } from './state.js';

/** Load PNG background (one) + multiple Lottie JSONs/LOTTIEs sequentially */
async function processFilesSequential(refs, files) {
  let imgFile = null;
  const jsonFiles = [];

  for (const f of files) {
    try {
      if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
      const isJson = f.type === 'application/json' || f.type === 'text/plain' || f.name?.toLowerCase?.().endsWith?.('.json') || f.name?.toLowerCase?.().endsWith?.('.lottie');
      if (isJson) jsonFiles.push(f);
    } catch {}
  }

  if (imgFile) {
    try {
      const url = URL.createObjectURL(imgFile);
      await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
      setPlaceholderVisible(refs, false);
      await afterTwoFrames();
    } catch {}
  }

  for (const jf of jsonFiles) {
    try {
      const text = await jf.text();
      let json;
      try { json = JSON.parse(text); } catch { json = text; }
      await loadLottieFromData(refs, json);
      setLastLottie(json);
      setPlaceholderVisible(refs, false);
      await afterTwoFrames();
      try { document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
    } catch {}
  }
}

export function initDnd({ refs }) {
  const target = refs?.preview || window;

  // Drag over
  const onDragOver = (e) => {
    try { e.preventDefault(); } catch {}
    setDropActive(true);
  };
  // Drag leave
  let leaveTO = null;
  const onDragLeave = (e) => {
    // small debounce to avoid flicker when traversing children
    clearTimeout(leaveTO);
    leaveTO = setTimeout(() => setDropActive(false), 50);
  };
  // Drop
  const onDrop = async (e) => {
    try { e.preventDefault(); } catch {}
    setDropActive(false);
    const dt = e.dataTransfer;
    const files = Array.from(dt?.files || []);
    if (files.length) await processFilesSequential(refs, files);
  };

  target.addEventListener('dragover', onDragOver);
  target.addEventListener('dragleave', onDragLeave);
  target.addEventListener('drop', onDrop);

  // Paste support: image/png + JSON text
  document.addEventListener('paste', async (e) => {
    try {
      const items = Array.from(e.clipboardData?.items || []);
      const files = [];
      let textCandidate = null;

      for (const it of items) {
        try {
          if (it.type?.startsWith?.('image/')) {
            const f = it.getAsFile?.();
            if (f) files.push(f);
          } else if (it.type === 'application/json' || it.type === 'text/plain') {
            textCandidate = await (it.getAsString ? new Promise((resolve) => it.getAsString(resolve)) : Promise.resolve(e.clipboardData.getData('text')));
          }
        } catch {}
      }

      if (files.length) await processFilesSequential(refs, files);
      if (textCandidate) {
        try {
          const json = JSON.parse(textCandidate);
          await loadLottieFromData(refs, json);
          setLastLottie(json);
          setPlaceholderVisible(refs, false);
          await afterTwoFrames();
          try { document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
        } catch {}
      }
    } catch {}
  });
}
