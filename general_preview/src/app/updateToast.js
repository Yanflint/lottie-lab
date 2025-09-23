
// src/app/updateToast.js — минимальный тост
export function showSuccessToast(msg) { renderToast(msg || 'Готово'); }
export function showErrorToast(msg)   { renderToast(msg || 'Ошибка'); }
export function showToastIfFlag() {}

function renderToast(text) {
  try {
    const wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '50%';
    wrap.style.bottom = '20px';
    wrap.style.transform = 'translateX(-50%)';
    wrap.style.zIndex = '999999';
    wrap.style.pointerEvents = 'none';
    const bubble = document.createElement('div');
    bubble.style.background = 'rgba(24,24,24,0.95)';
    bubble.style.color = '#fff';
    bubble.style.padding = '10px 14px';
    bubble.style.borderRadius = '16px';
    bubble.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
    bubble.style.fontSize = '14px';
    bubble.style.fontWeight = '500';
    bubble.style.pointerEvents = 'auto';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    document.body.appendChild(wrap);
    setTimeout(() => { try { wrap.remove(); } catch {} }, 1400);
  } catch {}
}
