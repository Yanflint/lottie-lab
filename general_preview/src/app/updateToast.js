// src/app/updateToast.js
export function showUpdateToast(msg = 'Updated') { show(msg); }
export function showSuccessToast(msg = 'Готово') { show(msg); }
export function showErrorToast(msg = 'Ошибка') { show(msg); }

// Появлялась ошибка: "does not provide an export named 'showToastIfFlag'"
// Добавляем совместимый экспорт. Логика: если передан флаг (boolean) или строка сообщения — показываем тост.
export function showToastIfFlag(flagOrMsg) {
  if (!flagOrMsg) return;
  if (typeof flagOrMsg === 'string') return show(flagOrMsg);
  show('Готово');
}

function show(text) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 1500);
}
