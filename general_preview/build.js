// general_preview/build.js — runtime build metadata
(function(){
  try{
    var href = location.href;
    var sp = new URL(href).searchParams;
    // Prefer explicit ?build=12345
    var run = sp.get('build');
    // Or try to sniff digits from common cache-buster like ?v=12345
    if (!run) {
      var v = sp.get('v') || '';
      var m = String(v).match(/\d{4,}/);
      if (m) run = m[0];
    }
    // Fallback to timestamp (so badge is never empty)
    if (!run) run = String(Date.now());

    var branch = (location.pathname.indexOf('/wip/') !== -1) ? 'wip' : 'main';
    var sha = (sp.get('sha') || '').slice(0, 7);
    var ts = new Date().toISOString();

    // Expose in a single place
    window.__BUILD__ = { run: run, branch: branch, sha: sha, ts: ts };
  }catch(e){
    // As a last resort
    window.__BUILD__ = { run: String(Date.now()), branch: 'wip', ts: new Date().toISOString() };
  }
})();
