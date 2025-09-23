// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { state } from './state.js';

export function initControls({ refs }) {
  // Кнопка повторного проигрывания
  if (refs?.restartBtn) {
    refs.restartBtn.addEventListener('click', () => {
      restart();
    });
  }

  // Чекбокс "Зацикленно"
  if (refs?.loopChk) {
    // Инициализация состоянием (если где-то выставляли ранее)
    refs.loopChk.checked = !!state.loopOn;

    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      state.loopOn = on;      // запомним в общем состоянии
      setLoop(on);            // переключим текущую анимацию "на лету"
    });
  }
}

// Sync loop checkbox when selection changes
try {
  window.addEventListener('lp:selected-changed', (e) => {
    try {
      const refs = window.__lpRefs || null;
      const chk = document.getElementById('loopChk');
      if (!chk || !refs) return;
      // Pull selected item loop
      try{
        import('./state.js').then(({ getSelectedItem }) => {
        const it = getSelectedItem && getSelectedItem();
        if (it && typeof it.loop === 'boolean') chk.checked = !!it.loop;
      }catch{}
    } catch {}
  });
} catch {}
