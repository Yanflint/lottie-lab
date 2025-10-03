// local dev fallback (CI will overwrite this on deploy)
(function(){
  window.__BUILD__ = window.__BUILD__ || {
    run: String(Date.now()),
    branch: (location.pathname.indexOf('/wip/') !== -1) ? 'wip' : 'main',
    ts: new Date().toISOString()
  };
})();
