// src/app/dnd.js
// Drag-and-drop & paste handler (single-image + single-lottie fallback)
// Kept for backward compatibility; multi-lottie is implemented in dnd-multi.js (capture phase).

import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie } from './state.js';

/**
 * Pick the first image and the first JSON from a FileList/Array
 * and apply: image -> background, json -> lottie (single).
 */
async function processFilesSequential(refs, files) {
  let imgFile = null;
  let jsonFile = null;

  for (const f of Array.from(files || [])) {
    if (!imgFile && f?.type?.startsWith?.('image/')) imgFile = f;
    const isJson = (f?.type === 'application/json') || (f?.type === 'text/plain') || /\.json$/i.test(f?.name || '');
    if (!jsonFile && isJson) jsonFile = f;
  }

  if (imgFile) {
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    try {
      const { afterTwoFrames } = await import('./utils.js');
      afterTwoFrames(() => document.dispatchEvent(new CustomEvent('lp:content-painted')));
    } catch {}
  }

  if (jsonFile) {
    const text = await jsonFile.text();
    const json = JSON.parse(text);
    await loadLottieFromData(refs, json);
    setLastLottie(json);
    setPlaceholderVisible(refs, false);
    try {
      const { afterTwoFrames } = await import('./utils.js');
      afterTwoFrames(() => document.dispatchEvent(new CustomEvent('lp:content-painted')));
    } catch {}
  }
}

export function initDnd({ refs } = {}) {
  const root = document;

  root.addEventListener('dragenter', () => setDropActive(true));
  root.addEventListener('dragover', (e) => {
    e.preventDefault();
    setDropActive(true);
  });
  root.addEventListener('dragleave', () => setDropActive(false));
  root.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);

    const dt = e.dataTransfer;
    const list = dt?.files?.length ? Array.from(dt.files) : [];
    if (list.length === 0 && dt?.items?.length) {
      for (const it of Array.from(dt.items)) {
        const f = it.getAsFile?.();
        if (f) list.push(f);
      }
    }
    if (list.length) {
      await processFilesSequential(refs, list);
    }
  });

  // PASTE handler: image file or JSON as text/plain/application/json
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    let textCandidate = null;

    for (const it of items) {
      if (it.type?.startsWith?.('image/')) {
        const f = it.getAsFile?.();
        if (f) files.push(f);
      } else if (it.type === 'application/json' || it.type === 'text/plain') {
        textCandidate = await (it.getAsString
          ? new Promise((resolve) => it.getAsString(resolve))
          : Promise.resolve(e.clipboardData.getData('text')));
      }
    }

    if (files.length) {
      await processFilesSequential(refs, files);
    }

    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        await loadLottieFromData(refs, json);
        setLastLottie(json);
        setPlaceholderVisible(refs, false);
        try {
          const { afterTwoFrames } = await import('./utils.js');
          afterTwoFrames(() => document.dispatchEvent(new CustomEvent('lp:content-painted')));
        } catch {}
      } catch {}
    }
  });
}
