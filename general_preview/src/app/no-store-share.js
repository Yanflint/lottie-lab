// src/app/no-store-share.js (patched)
// 1) GET /api/share -> cache: 'no-store'
// 2) *любой* запрос на /api/share (GET/POST) переписываем на твою Cloud Function
(function(){
  const _fetch = window.fetch;
  const API = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p'.replace(/\/+$/, '');
  if (typeof _fetch !== 'function') return;
  window.fetch = function(input, init) {
    let url = (typeof input === 'string') ? input : (input && input.url) || '';
    try {
      if (/^\/api\/share(\?|$)/.test(url)) {
        const method = (init && (init.method || init.method === '')) ? String(init.method || '').toUpperCase() : 'GET';
        if (method === 'GET') init = Object.assign({ cache: 'no-store' }, init || {});
        // rewrite to Cloud Function
        const qs = url.split('?')[1] || '';
        url = API + '/share' + (qs ? ('?' + qs) : '');
        if (typeof input === 'object' && input) input.url = url; else input = url;
      }
    } catch {}
    return _fetch.call(this, input, init);
  };
})();
