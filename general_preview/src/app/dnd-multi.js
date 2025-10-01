// src/app/dnd-multi.js
// Multi-Lottie DnD bound to the preview area; shows original hover overlay via setDropActive.

import { setBackgroundFromSrc } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';
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
    setPlaceholderVisible(refs, false);
    try { afterTwoFrames(() => document.dispatchEvent(new CustomEvent('lp:content-painted'))); } catch {}
  }

  const jsons = list.filter(isJsonFile);
  for (const f of jsons) {
    try {
      const json = await fileToJSON(f);
      addLottieFromJSON(json, { name: f?.name, autoplay: true, loop: true, fps: 60 });
      setPlaceholderVisible(refs, false);
    try { afterTwoFrames(() => document.dispatchEvent(new CustomEvent('lp:content-painted'))); } catch {}
    } catch (e) {
      console.warn('Bad Lottie file', f?.name, e);
    }
  }
}

export function initMultiDnD({ refs } = {}) {
  const target = getPreviewEl();
  if (!target) return;

  let dragDepth = 0;

  target.addEventListener('dragenter', (e) => {
    dragDepth++;
    if (dragDepth === 1) setDropActive(true);
  }, true);

  target.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragDepth <= 0) dragDepth = 1;
    setDropActive(true);
  }, true);

  target.addEventListener('dragleave', (e) => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) setDropActive(false);
  }, true);

  target.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth = 0;
    setDropActive(false);

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
}
