import { setBackgroundFromSrc, loadLottieFromData } from './lottie.js';
import { setPlaceholderVisible, setDropActive } from './utils.js';
import { setLastLottie } from './state.js';

async function processFilesSequential(refs, files) {
  var imgFile = null;
  var jsonFiles = [];
  for (var i=0;i<files.length;i++){
    var f = files[i];
    if (!imgFile && f.type && f.type.indexOf('image/')===0) imgFile = f;
    var isJson = (f.type==='application/json') || (f.name && f.name.toLowerCase && f.name.toLowerCase().endsWith('.json')) || (f.type==='text/plain');
    if (isJson) jsonFiles.push(f);
  }
  if (imgFile) {
    var url = URL.createObjectURL(imgFile);
    await setBackgroundFromSrc(refs, url, { fileName: imgFile && imgFile.name });
    setPlaceholderVisible(refs, false);
    try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('lp:content-painted')); } catch(e){}
  }
  for (var j=0;j<jsonFiles.length;j++){
    try {
      var jf = jsonFiles[j];
      var text = jf.text ? await jf.text() : await new Response(jf).text();
      var json = JSON.parse(text);
      await loadLottieFromData(refs, json);
      setLastLottie(json);
      setPlaceholderVisible(refs, false);
      try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('lp:content-painted')); } catch(e){}
    } catch(e){ console.error(e); }
  }
}

export function initDnd({ refs }) {
  var depth = 0;
  var __dropGuard = false;

  function onDragEnter(e){ e.preventDefault(); depth++; if (depth===1) setDropActive(true); }
  function onDragOver(e){ e.preventDefault(); }
  function onDragLeave(e){ e.preventDefault(); depth--; if (depth<=0){ depth=0; setDropActive(false); } }
  async function onDrop(e){
    e.preventDefault();
    if (__dropGuard) return; __dropGuard = true; setTimeout(function(){ __dropGuard=false; }, 300);
    depth = 0; setDropActive(false);
    var dt = e.dataTransfer;
    var files = [];
    if (dt && dt.files && dt.files.length){
      for (var i=0;i<dt.files.length;i++) files.push(dt.files[i]);
    } else if (dt && dt.items && dt.items.length){
      for (var k=0;k<dt.items.length;k++){ var it = dt.items[k]; if (it.kind==='file'){ var f = it.getAsFile(); if (f) files.push(f); } }
    }
    if (files.length) await processFilesSequential(refs, files);
  }

  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('drop', onDrop);

  document.addEventListener('paste', async function(e){
    var items = (e.clipboardData && e.clipboardData.items) ? Array.prototype.slice.call(e.clipboardData.items) : [];
    var files = [];
    var texts = [];
    for (var i=0;i<items.length;i++){
      var it = items[i];
      if (it.type && it.type.indexOf('image/')===0){ var f = it.getAsFile(); if (f) files.push(f); }
      else if (it.type==='application/json' || it.type==='text/plain'){
        var str = await (it.getAsString ? new Promise(function(r){ it.getAsString(r); }) : Promise.resolve(e.clipboardData.getData('text')));
        if (str) texts.push(str);
      }
    }
    if (files.length) await processFilesSequential(refs, files);
    for (var t=0;t<texts.length;t++){
      try{
        var json = JSON.parse(texts[t]);
        await loadLottieFromData(refs, json);
        setLastLottie(json);
        setPlaceholderVisible(refs, false);
        try { const { afterTwoFrames } = await import('./utils.js'); await afterTwoFrames(); if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('lp:content-painted')); } catch(e){}
      }catch(e){}
    }
  });

  return {
    destroy: function(){
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      document.removeEventListener('paste', this._onPaste);
    }
  };
}