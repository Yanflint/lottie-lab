// src/app/fix-viewer-mobile.js
(function(){
  try {
    var p = String(location.pathname || '');
    if (!(p.length >= 3 && p[0] === '/' && p[1] === 's' && p[2] === '/')) return;
    window.addEventListener('pageshow', function(ev){
      try {
        if (ev && ev.persisted) {
          var e = document.createEvent('Event');
          e.initEvent('resize', true, true);
          window.dispatchEvent(e);
        }
      } catch(e){}
    }, { passive: true });
  } catch(e) {}
})();
