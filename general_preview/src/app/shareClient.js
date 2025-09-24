// src/app/shareClient.js
import { showSuccessToast, showErrorToast } from './updateToast.js';
import { withLoading } from './utils.js';
import { state } from './state.js';

export const API_BASE = 'https://functions.yandexcloud.net/d4eafmlpa576cpu1o92p';
const PATHS = ['']; // POST прямо на базовый URL

function readCurrentBg() {
  const img = document.getElementById('bgImg');
  if (!img) return null;
  const src = img.getAttribute('src') || '';
  if (!src) return null;
  const name = state?.lastBgMeta?.fileName || '';
  return { value: src, name };
}

function getLayersSnapshot() {
  const m = window.__multiLottie;
  if (!m || !Array.isArray(m.layers)) return [];
  const out = [];
  for (const L of m.layers) {
    if (!L) continue;
    let data = L.data;
    if (!data && L.mount && L.mount.__lp_anim && L.mount.__lp_anim.animationData) {
      try { data = JSON.parse(JSON.stringify(L.mount.__lp_anim.animationData)); }
      catch { data = L.mount.__lp_anim.animationData; }
    }
    if (!data) continue;
    const off = L.offset || { x:0, y:0 };
    try {
      data.meta = Object.assign({}, data.meta || {});
      data.meta._lpOffset = { x:+off.x||0, y:+off.y||0 };
      data.meta._lpPos    = { x:+off.x||0, y:+off.y||0 };
    } catch {}
    out.push(data);
  }
  return out;
}

async function collectPayloadOrThrow() {
  const bg   = readCurrentBg();
  const lots = getLayersSnapshot();

  if (!bg && !lots.length) { const e = new Error('Загрузите графику'); e.code='NO_ASSETS'; throw e; }
  if (!bg)                 { const e = new Error('Загрузите фон');     e.code='NO_BG';     throw e; }
  if (!lots.length)        { const e = new Error('Загрузите анимацию'); e.code='NO_LOTTIE'; throw e; }

  const lot = lots[0];
  try { lot.meta = Object.assign({}, lot.meta || {}, { _lpLots: lots }); } catch {}
  const opts = { loop: !!state.loopOn };
  return { lot, lots, bg, opts };
}

async function postPayload(payload) {
  let lastErr = null;
  for (const p of PATHS) {
    const url = API_BASE + p;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const txt = await resp.text();
      let data = null; try { data = txt ? JSON.parse(txt) : null; } catch {}
      if (!resp.ok) throw new Error(`share failed: ${resp.status}`);
      if (data && typeof data.url === 'string') return data.url;
      if (data && data.id) {
        const origin = (window.__PUBLIC_ORIGIN__) || location.origin;
        return origin.replace(/\/$/, '') + '/?id=' + encodeURIComponent(data.id);
      }
      throw new Error('share: пустой ответ API');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('share: все попытки не удались');
}

export function initShare() {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await withLoading(btn, async () => {
      try {
        const payload = await collectPayloadOrThrow();
        const url = await postPayload(payload);
        showSuccessToast('Ссылка скопирована в буфер');
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
      } catch (e) {
        showErrorToast(e?.message || 'Не удалось создать ссылку');
        throw e;
      }
    });
  });
}
