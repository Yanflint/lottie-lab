import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';

async function processFilesSequential(refs, files) {
  // Determine first image (as background) and collect all JSON files
  let imgFile = null;
  const jsonFiles = [];
  for (const f of files) {
    if (!imgFile && f?.type?.startsWith?.('image/')) imgFile = f;
    const isJson = (f?.type === 'application/json') || (f?.name?.endsWith?.('.json')) || (f?.type === 'text/plain');
    if (isJson) jsonFiles.push(f);
  }

  // Apply background if present
  if (imgFile) {
    try {
      const url = URL.createObjectURL(imgFile);
      await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
      setPlaceholderVisible(refs, false);
      await afterTwoFrames();
      document.dispatchEvent(new CustomEvent('lp:content-painted'));
    } catch (e) {
      console.warn('Background set failed', e);
    }
  }

  // Load all lottie JSONs into the list
  if (jsonFiles.length) {
    const items = [];
    for (const jf of jsonFiles) {
      try {
        const txt = await jf.text();
        const data = JSON.parse(txt);
        items.push({ name: jf?.name || 'animation.json', data });
      } catch (e) {
        console.warn('Invalid JSON', jf?.name, e);
      }
    }
    if (items.length) {
      const { addLottieItems } = await import('./multi.js');
      addLottieItems({ refs }, items);
      setPlaceholderVisible(refs, false);
      await afterTwoFrames();
      document.dispatchEvent(new CustomEvent('lp:content-painted'));
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
    const dt = e.dataTransfer; if (!dt) return;

    if (dt.files && dt.files.length) {
      await processFilesSequential(refs, Array.from(dt.files));
      return;
    }

    if (dt.items && dt.items.length) {
      const files = [];
      for (const it of dt.items) {
        try {
          if (it.kind === 'file') {
            const f = it.getAsFile();
            if (f) files.push(f);
          }
        } catch {}
      }
      if (files.length) await processFilesSequential(refs, files);
    }
  };

  document.addEventListener('dragenter', onDragEnter);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);

  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    let textCandidate = null;

    for (const it of items) {
      try {
        if (it.type?.startsWith?.('image/')) {
          const f = it.getAsFile();
          if (f) files.push(f);
        } else if (it.type === 'application/json' || it.type === 'text/plain') {
          // Try to read JSON text
          if (it.getAsString) {
            textCandidate = await new Promise((resolve) => it.getAsString(resolve));
          } else {
            textCandidate = e.clipboardData.getData('text');
          }
        }
      } catch {}
    }

    if (files.length) await processFilesSequential(refs, files);

    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        const { addLottieItems } = await import('./multi.js');
        addLottieItems({ refs }, [{ name: 'pasted.json', data: json }]);
        setPlaceholderVisible(refs, false);
        await afterTwoFrames();
        document.dispatchEvent(new CustomEvent('lp:content-painted'));
      } catch {}
    }
  });
}
