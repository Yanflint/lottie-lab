
// src/app/utils.js
export function setPlaceholderVisible(refs, on) {
  const el = refs?.placeholder || document.getElementById('ph');
  if (!el) return;
  if (on) el.classList.remove('hidden'); else el.classList.add('hidden');
}
export function setDropActive(refs, on) {
  const el = refs?.dropOverlay || document.getElementById('dropOverlay');
  if (!el) return;
  el.classList.toggle('active', !!on);
}
export function afterTwoFrames() {
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
}
