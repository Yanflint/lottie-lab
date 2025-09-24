
// src/app/utils.js
import { showSuccessToast, showErrorToast } from './updateToast.js';

export async function withLoading(btn, fn) {
  if (!btn) return fn();
  const prevHTML = btn.innerHTML;
  btn.classList.add('loading');
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = `<span class="loading-content">Создание</span><span class="spinner" aria-hidden="true"></span>`;
  try {
    return await fn();
  } finally {
    btn.classList.remove('loading');
    btn.removeAttribute('aria-busy');
    btn.innerHTML = prevHTML;
  }
}

export function setPlaceholderVisible(refs, on) {
  const el = refs?.placeholder || document.getElementById('ph');
  if (!el) return;
  el.classList.toggle('hidden', !on);
}
export function setDropActive(refs, on) {
  const el = refs?.dropOverlay || document.getElementById('dropOverlay');
  if (!el) return;
  el.classList.toggle('active', !!on);
}

export function afterTwoFrames() {
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}
