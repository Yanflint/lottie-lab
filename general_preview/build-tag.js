// general_preview/build-tag.js
// Renders a small build tag from window.__BUILD__ (provided by build.js).
// Usage in index.html (before closing </body>):
//   <script src="build.js" defer></script>
//   <script src="build-tag.js" defer></script>

(function () {
  function pickHost(origin) {
    try {
      return origin || (window.__PUBLIC_ORIGIN__) || window.location.origin;
    } catch { return window.location.origin; }
  }

  function format(b) {
    if (!b) return '';
    const run   = b.run || '';
    const short = b.short || (b.sha ? String(b.sha).slice(0,7) : '');
    return '#' + run + (short ? '-' + short : '');
  }

  function ensureNode() {
    // Try common targets first
    var el = document.querySelector('[data-build], .build-tag, #build, #buildId, [data-build-id]');
    if (el) return el;
    // Fallback: create a small element in the top-right corner
    el = document.createElement('small');
    el.className = 'build-tag';
    el.style.cssText = 'position:fixed;right:10px;top:10px;opacity:.75;color:#aaa;z-index:999999;font:12px/1 system-ui;';
    document.body.appendChild(el);
    return el;
  }

  function apply() {
    var b = window.__BUILD__ || null;
    var el = ensureNode();
    if (!b || !el) return;
    el.textContent = format(b);
    el.title = (b.branch ? (b.branch + ' @ ') : '') + (b.sha || '') + (b.ts ? (' — ' + b.ts) : '');
    el.style.userSelect = 'none';
    el.style.cursor = 'pointer';
    var repo = b.repo || '';
    var sha  = b.sha || '';
    if (repo && sha) {
      el.onclick = function(){ window.open('https://github.com/' + repo + '/commit/' + sha, '_blank'); };
    }
  }

  // If build.js loads after, wait a tick
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(apply, 0); });
  } else {
    setTimeout(apply, 0);
  }
})();