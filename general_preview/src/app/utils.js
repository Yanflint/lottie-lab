
import { showSuccessToast, showErrorToast } from './updateToast.js';

export async function withLoading(btn, fn) {
  if (!btn) return fn();
  const prevHTML = btn.innerHTML;
  btn.classList.add('loading');
  btn.setAttribute('aria-busy', 'true');
  btn.style.filter = '';
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
  const el = refs?.phEl || refs?.placeholder || document.getElementById('ph');
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

export function setDropActive(on) {
  try { document.body.classList.toggle('dragging', !!on); } catch {}
  const el = document.getElementById('dropOverlay');
  if (!el) return;
  el.style.display = on ? 'flex' : 'none';
}

export function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function afterTwoFrames() {
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}
