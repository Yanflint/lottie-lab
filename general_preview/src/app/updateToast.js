// src/app/updateToast.js
export function showSuccessToast(msg='Готово'){ show(msg); }
export function showErrorToast(msg='Ошибка'){ show(msg); }
function show(text){
  const t = document.getElementById('toast'); if(!t) return;
  t.textContent = text; t.style.opacity = '1';
  setTimeout(()=>{ t.style.opacity='0'; }, 1500);
}
