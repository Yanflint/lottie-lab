
// src/app/dnd.js
import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { loadMultipleLotties } from './multi.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';

async function readAllAsText(files) {
  const out = [];
  for (const f of files) {
    try { out.push(await f.text()); } catch {}
  }
  return out;
}

export async function initDnD(refs) {
  const dropZone = refs?.wrapper || document.body;

  async function processFilesSequential(files) {
    // Собираем один PNG и до 10 JSON
    let imgFile = null;
    const jsonFiles = [];
    for (const f of files) {
      if (!imgFile && f.type?.startsWith?.('image/')) imgFile = f;
      const isJson = f.type === 'application/json' || f.name?.endsWith?.('.json') || f.type === 'text/plain';
      if (isJson && jsonFiles.length < 10) jsonFiles.push(f);
    }

    if (imgFile) {
      const url = URL.createObjectURL(imgFile);
      await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
      setPlaceholderVisible(refs, false);
      await new Promise(r => requestAnimationFrame(r));
    }

    if (!jsonFiles.length) return;

    if (jsonFiles.length === 1) {
      try {
        const text = await jsonFiles[0].text();
        const json = JSON.parse(text);
        await loadLottieFromData(refs, json);
      } catch (e) { console.error(e); }
    } else {
      const texts = await readAllAsText(jsonFiles);
      const datas = [];
      for (const t of texts) { try { datas.push(JSON.parse(t)); } catch {} }
      if (datas.length) await loadMultipleLotties(datas);
    }

    setPlaceholderVisible(refs, false);
  }

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); setDropActive(refs, true); });
  dropZone.addEventListener('dragleave', () => setDropActive(refs, false));
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    setDropActive(refs, false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) await processFilesSequential(files);
  });

  // paste
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items || [];
    const files = []; let textCandidate = null;
    for (const it of items) {
      if (it.type?.startsWith?.('image/')) { const f = it.getAsFile(); if (f) files.push(f); }
      else if (it.type === 'application/json' || it.type === 'text/plain') {
        try {
          textCandidate = await (it.getAsString
            ? new Promise(r => it.getAsString(r))
            : Promise.resolve(e.clipboardData.getData('text')));
        } catch {}
      }
    }
    if (files.length) await processFilesSequential(files);
    if (textCandidate) {
      try { const json = JSON.parse(textCandidate); await loadLottieFromData(refs, json); setPlaceholderVisible(refs, false); } catch {}
    }
  });
}
