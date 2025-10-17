/*! mobile-compat.js — CLEAN MINIMAL */
(function(){
  const mq = window.matchMedia && window.matchMedia("(max-width: 768px)");
  const isMobile = !!(mq && mq.matches);
  if (!isMobile) return;

  // Helpers
  const qs  = (sel, ctx=document)=>ctx.querySelector(sel);
  const qsa = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));

  function getBgUrl(el){
    const cs = getComputedStyle(el);
    const bg = cs.backgroundImage || "";
    const m = bg.match(/url\((['"]?)(.*?)\1\)/i);
    return m ? m[2] : null;
  }

  // 1) Background previews: mark real background elements and set ratio vars
  function initBackgrounds(){
    const candidates = qsa('.lp-bg, .bg, [class*="bg"], .preview, [class*="preview"]');
    for (const el of candidates){
      const url = getBgUrl(el);
      if (!url) continue;
      el.classList.add('lp-has-bg');
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 1080;
        const h = img.naturalHeight || 1920;
        el.style.setProperty('--bg-w', w);
        el.style.setProperty('--bg-h', h);
      };
      img.src = url;
    }
  }

  // 2) Lottie containers: ensure they are visible (min height via AR when collapsed)
  function initLottie(){
    const list = qsa('.lp-lottie, [data-lottie], [data-anim], [id*="lottie"], [class*="lottie"], [id*="anim"], [class*="anim"]');
    for (const el of list){
      // Optional: data-ar="9/16"
      const arAttr = el.getAttribute('data-ar');
      let arW=9, arH=16;
      if (arAttr && /(\d+)\s*\/\s*(\d+)/.test(arAttr)) {
        const m = arAttr.match(/(\d+)\s*\/\s*(\d+)/);
        arW = parseInt(m[1],10)||9; arH = parseInt(m[2],10)||16;
      }
      const width = el.getBoundingClientRect().width || el.clientWidth || 0;
      const minH  = Math.max(1, Math.round(width * (arH/arW)));
      if ((el.getBoundingClientRect().height||0) < 2) el.style.minHeight = minH + "px";
    }
  }

  // 3) Vertical centering: choose the proper wrapper and toggle flex-centering
  function pickPreview(){
    return qs('.lp-bg, .lp-lottie') || qs('.preview, [class*="preview"], .bg, [class*="bg"]');
  }
  function pickWrapper(el){
    if (!el) return document.body;
    return el.closest('[data-preview-wrapper], .preview-wrapper, .canvas, .viewport, .page-content, .content, .container, .main, .page, .page__inner, .wrapper, .wrap, #root, #app, body') || document.body;
  }
  function applyVCenter(){
    const target = pickPreview();
    const wrap = pickWrapper(target);
    if (!wrap) return;

    wrap.classList.remove('lp-vc-flex','lp-vc-tall');

    if (!target) return;

    const vh = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height
              : (window.innerHeight || document.documentElement.clientHeight || 0);
    const rh = target.getBoundingClientRect().height;

    if (vh && rh && rh < vh) {
      wrap.classList.add('lp-vc-flex');
    } else {
      wrap.classList.add('lp-vc-tall');
    }
  }

  function boot(){
    initBackgrounds();
    initLottie();
    applyVCenter();
  }

  boot();
  window.addEventListener('resize', applyVCenter, { passive: true });
  window.addEventListener('orientationchange', applyVCenter, { passive: true });
  if (window.visualViewport) visualViewport.addEventListener('resize', applyVCenter);
  if (mq && mq.addEventListener) mq.addEventListener('change', applyVCenter);
})();
