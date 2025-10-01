// src/app/dnd-multi.js
// Multi-Lottie DnD handler (capture phase): drop/paste many JSONs -> add as layers.
import { setBackgroundFromSrc } from './lottie.js';
import { addLottieFromJSON, initMultiLottie } from './multilottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';

function isJsonFile(file) {
  if (!file) return false;
  if (file.type === 'application/json' || file.type === 'text/plain') return true;
  return /\.json$/i.test(file.name || '');
}

function fileToJSON(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error || new Error('read error'));
    fr.onload = () => {
      try { resolve(JSON.parse(String(fr.result))); }
      catch(e){ reject(e); }
    };
    fr.readAsText(file);
  });
}

async function handleFiles(files) {
  initMultiLottie();

  // First image -> background
  const imgs = Array.from(files).filter(f => f.type?.startsWith?.('image/'));
  if (imgs.length) {
    const url = URL.createObjectURL(imgs[0]);
    try { await setBackgroundFromSrc({}, url, { fileName: imgs[0]?.name }); } catch {}
    setPlaceholderVisible({}, false);
  }

  // All JSONs -> layers
  const jsons = Array.from(files).filter(isJsonFile);
  for (const f of jsons) {
    try {
      const json = await fileToJSON(f);
      addLottieFromJSON(json, { name: f?.name, autoplay: true, loop: true, fps: 60 });
      setPlaceholderVisible({}, false);
    } catch (e) {
      console.warn('Bad Lottie file', f?.name, e);
    }
  }
}

function bindDnD(root) {
  const target = root || document;

  target.addEventListener('dragenter', () => setDropActive(true), true);
  target.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); setDropActive(true); }, true);
  target.addEventListener('dragleave', () => setDropActive(false), true);
  target.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); setDropActive(false);
    const dt = e.dataTransfer;
    const list = dt?.files?.length ? Array.from(dt.files) : [];
    if (list.length === 0 && dt?.items?.length) {
      for (const it of Array.from(dt.items)) {
        const f = it.getAsFile?.();
        if (f) list.push(f);
      }
    }
    if (list.length) await handleFiles(list);
  }, true);

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

    if (files.length) await handleFiles(files);
    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        addLottieFromJSON(json, { autoplay: true, loop: true, fps: 60 });
        setPlaceholderVisible({}, false);
      } catch {}
    }
  }, true);
}

bindDnD(document);
