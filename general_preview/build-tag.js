// general_preview/build-tag.js
(function () {
  function ensureNode() {
    var el = document.querySelector('[data-build], .build-tag, #build, #buildId, [data-build-id]');
    if (el) return el;
    el = document.createElement('small');
    el.className = 'build-tag';
    el.style.cssText = 'position:fixed;right:10px;top:10px;opacity:.75;color:#aaa;z-index:999999;font:12px/1 system-ui;';
    document.body.appendChild(el);
    return el;
  }
  function apply() {
    var b = window.__BUILD__ || null;
    if (!b) return;
    var el = ensureNode();
    // только цифры, монотонно растущий RUN_NUMBER от GitHub
    el.textContent = String(b.run || '').replace(/\D+/g, '');
    el.title = (b.branch ? (b.branch + ' @ ') : '') + (b.sha || '') + (b.ts ? (' — ' + b.ts) : '');
    el.style.userSelect = 'none';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();