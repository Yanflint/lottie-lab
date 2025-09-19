// src/app/fix-viewer-mobile.js
(function(){
  try {
    var isViewer = /^\/s\//.test(location.pathname);
    if (!isViewer) return;
    window.addEventListener('pageshow', function(ev){
      try {
        if (ev && ev.persisted) {
          var e = document.createEvent('Event');
          e.initEvent('resize', true, true);
          window.dispatchEvent(e);
        }
      } catch(e){}
    });
  } catch(e){}
})();
