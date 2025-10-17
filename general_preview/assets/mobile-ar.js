/*! mobile-ar.js — compute aspect ratio for background blocks on mobile (general_preview scope) */
(function(){
  const mq = window.matchMedia && window.matchMedia("(max-width: 768px)");
  if (!mq || !mq.matches) return;

  function getBgUrl(el){
    const cs = getComputedStyle(el);
    const bg = cs.backgroundImage || "";
    const m = bg.match(/url\((['"]?)(.*?)\1\)/i);
    return m ? m[2] : null;
  }

  function setRatio(el, w, h){
    if (w > 0 && h > 0) {
      try { el.style.aspectRatio = (w / h).toString(); } catch(e) {}
      el.style.setProperty('--bg-w', w);
      el.style.setProperty('--bg-h', h);
    }
  }

  const candidates = Array.from(document.querySelectorAll('[class*="preview"], .preview, [class*="bg"], .bg'));
  for (const el of candidates){
    const url = getBgUrl(el);
    if (!url) continue;
    const img = new Image();
    img.onload = () => setRatio(el, img.naturalWidth || 1080, img.naturalHeight || 1920);
    img.src = url;
  }
})();
