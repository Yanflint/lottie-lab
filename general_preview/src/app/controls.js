// src/app/controls.js
import { restart } from './lottie.js';
import { state, setLoop } from './state.js';
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
    refs.loopChk.checked = !!(state.items.find(x=>x.id===state.selectedId)?.loopOn ?? state.loopOn);

    window.addEventListener('lp:selected-changed', () => {
      try {
        const it = state.items.find(x=>x.id===state.selectedId);
        refs.loopChk.checked = !!(it?.loopOn ?? state.loopOn);
      } catch {}
    });

    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      state.loopOn = on;      // запомним в общем состоянии
      setLoop(on);            // переключим текущую анимацию "на лету"
    });
  }
}
