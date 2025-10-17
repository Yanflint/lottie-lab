/*! mobile-compat.js — Stage 3: robust mobile handling for BG & Lottie containers (general_preview) */
(function(){
  const mq = window.matchMedia && window.matchMedia("(max-width: 768px)");
  const isMobile = !!(mq && mq.matches);
  if (!isMobile) return;

  // Utils
  function getBgUrl(el){
    const cs = getComputedStyle(el);
    const bg = cs.backgroundImage || "";
    const m = bg.match(/url\((['"]?)(.*?)\1\)/i);
    return m ? m[2] : null;
  }
  function setVars(el, w, h){
    if (w && h) {
      try { el.style.aspectRatio = (w / h).toString(); } catch(e){}
      el.style.setProperty('--bg-w', w);
      el.style.setProperty('--bg-h', h);
    }
  }
  function ensureMinHeight(el, w, h){
    // If element collapsed (height ~ 0), give it a min-height from ratio
    const rect = el.getBoundingClientRect();
    const width = rect.width || el.clientWidth || 0;
    const ratio = (w && h) ? (h / w) : 1920/1080; // default portrait fallback
    const target = Math.max(1, Math.round(width * ratio));
    // Use style.minHeight so layout around stays predictable
    if ((rect.height || 0) < 2) {
      el.style.minHeight = target + "px";
    }
  }

  // 1) BACKGROUND ELEMENTS
  const bgCandidates = Array.from(document.querySelectorAll('.lp-bg, .preview, [class*="preview"], .bg, [class*="bg"]'));
  for (const el of bgCandidates){
    const url = getBgUrl(el);
    if (!url || /data:image\/svg\+xml/i.test(url)) continue; // skip inline svgs
    el.classList.add('lp-has-bg');
    const img = new Image();
    img.onload = () => {
      setVars(el, img.naturalWidth || 1080, img.naturalHeight || 1920);
      ensureMinHeight(el, img.naturalWidth || 1080, img.naturalHeight || 1920);
    };
    img.src = url;
  }

  // 2) LOTTIE CONTAINERS
  // Heuristics: explicit data attributes OR class/id hints OR child svg/canvas presence
  function looksLikeLottie(el){
    if (el.dataset && (el.dataset.lottie || el.dataset.anim || el.datasetAnimation)) return true;
    const id = (el.id || "").toLowerCase();
    const cl = (el.className || "").toLowerCase();
    if (/lottie|animation|anim/.test(id) || /lottie|animation|anim/.test(cl)) return true;
    // quick child check (after a tick, lottie usually injects)
    return false;
  }

  const lottieCandidates = Array.from(document.querySelectorAll('.lp-lottie, [data-lottie], [data-anim], [id*="lottie"], [class*="lottie"], [id*="anim"], [class*="anim"]'));
  const adjustLottie = (el)=>{
    // Read desired AR from data-ar="9/16" or "16/9" or "1/1"
    let arW = 16, arH = 9;
    const arAttr = el.getAttribute('data-ar');
    if (arAttr && /(\d+)\s*\/\s*(\d+)/.test(arAttr)) {
      const m = arAttr.match(/(\d+)\s*\/\s*(\d+)/);
      arW = parseInt(m[1], 10) || 16;
      arH = parseInt(m[2], 10) || 9;
    } else {
      // Portrait default better for phone preview if container is narrow+long
      arW = 9; arH = 16;
    }
    const rect = el.getBoundingClientRect();
    const w = rect.width || el.clientWidth || 0;
    const target = Math.max(1, Math.round((w * arH) / arW));
    if ((rect.height || 0) < 2) {
      el.style.minHeight = target + "px";
    }
  };

  // initial pass
  for (const el of lottieCandidates){
    if (looksLikeLottie(el)) adjustLottie(el);
  }

  // Observe size changes (rotation / UI chrome changes)
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(entries => {
      for (const ent of entries) {
        const el = ent.target;
        if (looksLikeLottie(el)) adjustLottie(el);
      }
    });
    lottieCandidates.forEach(el => ro.observe(el));
  }

  // Re-run when address bar shows/hides (vh jitter on mobile)
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', () => {
      lottieCandidates.forEach(adjustLottie);
      bgCandidates.forEach(el => {
        const w = parseFloat(getComputedStyle(el).getPropertyValue('--bg-w')) || 1080;
        const h = parseFloat(getComputedStyle(el).getPropertyValue('--bg-h')) || 1920;
        ensureMinHeight(el, w, h);
      });
    });
  }
})();


  // ========== Vertical centering of preview on mobile ==========
  function isVisible(el){
    const rect = el.getBoundingClientRect();
    return !!(rect.width || rect.height);
  }
  function pickPreview(){
    const list = Array.from(document.querySelectorAll('.lp-bg, .lp-lottie, .preview, [class*="preview"], .bg, [class*="bg"]'));
    for (const el of list){
      if (isVisible(el)) return el;
    }
    return null;
  }
  function pickWrapper(el){
    if (!el) return document.body;
    const stops = ['#root','#app','.root','.app','.page','.page__inner','.page-content','.wrapper','.wrap','.container','.content','.main','body'];
    let cur = el.parentElement;
    while (cur && cur !== document.documentElement){
      for (const s of stops){ if (cur.matches(s)) return cur; }
      cur = cur.parentElement;
    }
    return document.body;
  }
  function applyVCenter(){
    const target = pickPreview();
    const wrap = pickWrapper(target);
    if (!wrap) return;

    // Reset classes first
    wrap.classList.remove('lp-vp-center','lp-tall');

    if (!target) return;

    // Measure
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const rh = target.getBoundingClientRect().height;

    // If target fits viewport height, center it; else keep normal flow
    if (vh && rh && rh + 1 < vh) {
      wrap.classList.add('lp-vp-center');
    } else {
      wrap.classList.add('lp-tall');
    }
  }

  // Initial and on resize / orientation / address bar changes
  applyVCenter();
  window.addEventListener('resize', applyVCenter, { passive: true });
  window.addEventListener('orientationchange', applyVCenter, { passive: true });
  if (mq && mq.addEventListener) mq.addEventListener('change', applyVCenter);
  // ========== End vertical centering ==========

