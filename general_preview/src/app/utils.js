
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

// Показ/скрытие плашки «Перетащите файл»
// Поддерживаем и refs.phEl (старое), и refs.placeholder, и поиск по #ph
export function setPlaceholderVisible(refs, on) {
  const el = refs?.phEl || refs?.placeholder || document.getElementById('ph');
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

// Индикатор DnD: включаем класс на body и, по возможности, показываем overlay
export function setDropActive(overlayEl, on) {
  try { document.body.classList.toggle('dragging', !!on); } catch {}
  const el = overlayEl || document.getElementById('dropOverlay');
  if (!el) return;
  el.style.display = on ? 'flex' : 'none';
}

export function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function afterTwoFrames() {
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}
