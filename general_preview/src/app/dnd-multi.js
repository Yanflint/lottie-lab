// src/app/dnd-multi.js
// Multi-Lottie DnD bound strictly to the preview area (no global document handlers).

import { setBackgroundFromSrc } from './lottie.js';
import { addLottieFromJSON, initMultiLottie } from './multilottie.js';

function getPreviewEl() {
  return document.getElementById('preview')
      || document.getElementById('lotStage')
      || document.querySelector('.lot-stage')
      || document.querySelector('.wrapper');
}

function isJsonFile(file) {
  if (!file) return false;
  if (file.type === 'application/json' || file.type === 'text/plain') return true;
  return /\.json$/i.test(file.name || '');
}

function fileToJSON(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error || new Error('read error'));
    fr.onload = () => { try { resolve(JSON.parse(String(fr.result))); } catch(e){ reject(e); } };
    fr.readAsText(file);
  });
}

async function handleFiles(refs, files) {
  initMultiLottie();
  const list = Array.from(files || []);

  const imgs = list.filter(f => f?.type?.startsWith?.('image/'));
  if (imgs.length) {
    const url = URL.createObjectURL(imgs[0]);
    try { await setBackgroundFromSrc(refs, url, { fileName: imgs[0]?.name }); } catch {}
  }

  const jsons = list.filter(isJsonFile);
  for (const f of jsons) {
    try {
      const json = await fileToJSON(f);
      addLottieFromJSON(json, { name: f?.name, autoplay: true, loop: true, fps: 60 });
    } catch (e) {
      console.warn('Bad Lottie file', f?.name, e);
    }
  }
}

export function initMultiDnD({ refs } = {}) {
  const target = getPreviewEl();
  if (!target) return;

  // Visual hint: add class while dragging
  let dragDepth = 0;
  const addHover = () => target.classList.add('dnd-hover');
  const rmHover  = () => target.classList.remove('dnd-hover');

  target.addEventListener('dragenter', (e) => {
    dragDepth++;
    if (dragDepth === 1) addHover();
  }, true);

  target.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragDepth <= 0) dragDepth = 1;
    addHover();
  }, true);

  target.addEventListener('dragleave', (e) => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) rmHover();
  }, true);

  target.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth = 0;
    rmHover();

    const dt = e.dataTransfer;
    const list = dt?.files?.length ? Array.from(dt.files) : [];
    if (list.length === 0 && dt?.items?.length) {
      for (const it of Array.from(dt.items)) {
        const f = it.getAsFile?.();
        if (f) list.push(f);
      }
    }
    if (list.length) await handleFiles(refs, list);
  }, true);

  // Optional: paste only when focus is inside preview
  target.addEventListener('paste', async (e) => {
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

    if (files.length) await handleFiles(refs, files);
    if (textCandidate) {
      try {
        const json = JSON.parse(textCandidate);
        addLottieFromJSON(json, { autoplay: true, loop: true, fps: 60 });
      } catch {}
    }
  }, true);
}
