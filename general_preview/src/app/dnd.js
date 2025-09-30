
import { setBackgroundFromSrc, addLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive, afterTwoFrames } from './utils.js';

function isJsonFile(f){
  return f.type === 'application/json' || f.name?.toLowerCase()?.endsWith('.json') || f.type === 'text/plain';
}

async function processFiles(refs, files){
  const imgs = [];
  const jsons = [];
  for (const f of files){
    if (f.type?.startsWith?.('image/')) imgs.push(f);
    else if (isJsonFile(f)) jsons.push(f);
  }

  // background: take the FIRST image only (explicit behavior)
  if (imgs.length){
    const imgFile = imgs[0];
    const url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile?.name });
    setPlaceholderVisible(refs, false);
    try{ await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
  }

  // lotties: add ALL jsons
  for (const jf of jsons){
    try{
      const txt = await jf.text();
      const json = JSON.parse(txt);
      await addLottieFromData(refs, json, jf.name || json?.nm || '');
      setPlaceholderVisible(refs, false);
      try{ await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); } catch {}
    }catch(e){ console.error('Load JSON failed', e); }
  }
}

export function initDnd({ refs }){
  const holder = refs?.preview || document.getElementById('preview') || document.body;

  holder.addEventListener('dragover', (e) => {
    e.preventDefault(); e.stopPropagation();
    setDropActive(refs, true);
  }, { passive:false });

  holder.addEventListener('dragleave', (e) => {
    e.preventDefault(); e.stopPropagation();
    setDropActive(refs, false);
  }, { passive:false });

  holder.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation();
    setDropActive(refs, false);
    const dt = e.dataTransfer;
    const files = Array.from(dt?.files || []);
    await processFiles(refs, files);
  }, { passive:false });

  document.addEventListener('paste', async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = [];
    let jsonText = null;

    for (const it of items){
      if (it.type?.startsWith?.('image/')) { const f = it.getAsFile(); if (f) files.push(f); }
      else if (isJsonFile({ type: it.type, name: '' })){
        jsonText = await (it.getAsString ? new Promise(r => it.getAsString(r)) : Promise.resolve(e.clipboardData.getData('text')));
      }
    }
    if (files.length) await processFiles(refs, files);
    if (jsonText){
      try{ const json = JSON.parse(jsonText); await addLottieFromData(refs, json); setPlaceholderVisible(refs, false); await afterTwoFrames(); document.dispatchEvent(new CustomEvent('lp:content-painted')); }catch{}
    }
  });
}
