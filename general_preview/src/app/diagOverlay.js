// src/app/diagOverlay.js
// Minimal in-app diagnostics overlay for PWA/standalone. Opens via ?diag=1 or triple-tap top-left.
// No external deps; safe to ship in production.
import { API_BASE as SHARE_API_BASE } from './shareClient.js';

(function(){
  try{
    const params = new URL(location.href).searchParams;
    let enabled = (params.get('diag')||'').toLowerCase() === '1' ||
                  (localStorage.getItem('lp_diag')||'').toLowerCase() === '1';

    // Triple-tap in top-left corner to toggle overlay
    let tapCount = 0, lastTap = 0;
    function onTapToggle(e){
      const now = Date.now();
      const x = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX||0);
      const y = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY||0);
      // top-left 120x120 px
      if (x <= 120 && y <= 120){
        if (now - lastTap < 500) tapCount++; else tapCount = 1;
        lastTap = now;
        if (tapCount >= 3){ enabled = !enabled; localStorage.setItem('lp_diag', enabled ? '1':'0'); render(); }
      }
    }
    window.addEventListener('pointerdown', onTapToggle, { passive: true });
    window.addEventListener('touchstart', onTapToggle, { passive: true });

    // Build overlay
    const el = document.createElement('div');
    el.id = 'lp-diag';
    el.style.cssText = 'position:fixed;inset:auto 8px 8px auto;z-index:2147483647;'
      +'max-width:86vw;background:#0f172a;color:#e5e7eb;border:1px solid rgba(255,255,255,0.12);'
      +'border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.45);overflow:hidden;font:12px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;'
      +'display:none';
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#111827">
        <b>PWA Diag</b>
        <div>
          <button id="lpd-close" style="background:#1f2937;color:#e5e7eb;border:0;border-radius:8px;padding:6px 10px;margin-right:6px;cursor:pointer">×</button>
          <button id="lpd-tick"  style="background:#1f2937;color:#e5e7eb;border:0;border-radius:8px;padding:6px 10px;cursor:pointer">tick</button>
        </div>
      </div>
      <div style="padding:8px 10px;display:grid;gap:6px">
        <div><span style="color:#9ca3af">mode:</span> <span id="lpd-mode">—</span></div>
        <div><span style="color:#9ca3af">path:</span> <span id="lpd-path">—</span></div>
        <div><span style="color:#9ca3af">viewer:</span> <span id="lpd-viewer">—</span></div>
        <div><span style="color:#9ca3af">isLast:</span> <span id="lpd-islast">—</span></div>
        <div><span style="color:#9ca3af">api:</span> <span id="lpd-api">—</span></div>
        <div><span style="color:#9ca3af">rev:</span> <span id="lpd-rev">—</span></div>
        <div><span style="color:#9ca3af">payload:</span> <span id="lpd-payload">—</span></div>
      </div>
    `;
    document.documentElement.appendChild(el);

    const $ = (id)=>el.querySelector('#'+id);
    $('#lpd-close').addEventListener('click', ()=>{ enabled=false; localStorage.setItem('lp_diag','0'); render(); });
    $('#lpd-tick').addEventListener('click', async()=>{ await revProbe(); await payloadProbe(); });

    const isStandalone =
      (window.matchMedia &&
        (window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches)) ||
      (navigator.standalone === true);

    const viewer = /(?:^|\/)s\/[^/]/.test(location.pathname);
    const API_BASE = (typeof SHARE_API_BASE==='string' && SHARE_API_BASE) ? SHARE_API_BASE : '/api/share';

    function isViewingLast(){
      try{
        const m = location.pathname.match(/(?:^|\/)s\/([^\/?#]+)/);
        if (m){ const id = decodeURIComponent(m[1]||''); if (id==='last' || id==='__last__') return true; }
        const q = new URL(location.href).searchParams;
        const follow = (q.get('follow')||'').toLowerCase();
        if (follow==='1' || follow==='true' || follow==='yes') return true;
        const ss = (sessionStorage.getItem('lp_follow_last')||'').toLowerCase();
        if (ss==='1' || ss==='true' || ss==='yes' || ss==='on') return true;
      }catch(e){}
      return false;
    }

    async function revProbe(){
      try{
        const u = API_BASE.replace(/\/+$/, '') + '?id=last&rev=1&_=' + Date.now();
        const r = await fetch(u, { cache: 'no-store' });
        if(!r.ok) throw new Error('HTTP '+r.status);
        const j = await r.json();
        $('#lpd-rev').textContent = 'ok rev=' + JSON.stringify(j.rev);
        return j.rev || null;
      }catch(e){
        $('#lpd-rev').textContent = 'error ' + String(e);
        return null;
      }
    }
    async function payloadProbe(){
      try{
        const u = API_BASE.replace(/\/+$/, '') + '?id=last&_=' + Date.now();
        const r = await fetch(u, { cache: 'no-store' });
        if(!r.ok) throw new Error('HTTP '+r.status);
        const et = (r.headers.get('ETag')||'').replace(/"/g,'');
        const ct = r.headers.get('Content-Type')||'';
        await r.clone().json().catch(()=>null);
        $('#lpd-payload').textContent = 'ok etag=' + et + ' ct=' + ct;
        return et;
      }catch(e){
        $('#lpd-payload').textContent = 'error ' + String(e);
        return null;
      }
    }

    function render(){
      el.style.display = enabled ? 'block' : 'none';
      if (!enabled) return;
      $('#lpd-mode').textContent = isStandalone ? 'standalone' : 'browser';
      $('#lpd-path').textContent = location.pathname;
      $('#lpd-viewer').textContent = viewer ? 'yes' : 'no';
      $('#lpd-islast').textContent = isViewingLast() ? 'yes' : 'no';
      $('#lpd-api').textContent = (typeof SHARE_API_BASE==='string' && SHARE_API_BASE) ? SHARE_API_BASE : '/api/share';
      // run probes once
      revProbe(); payloadProbe();
    }

    render();
  }catch(e){ console.warn('diagOverlay init failed', e); }
})();