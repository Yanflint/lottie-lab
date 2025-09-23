// src/app/controls.js
import { restart } from './lottie.js';
import { state as appState, setLoop } from './state.js';

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
    refs.loopChk.checked = !!(appState.items.find(x=>x.id===appState.selectedId)?.loopOn ?? appState.loopOn);

    window.addEventListener('lp:selected-changed', () => {
      try {
        const it = appState.items.find(x=>x.id===appState.selectedId);
        refs.loopChk.checked = !!(it?.loopOn ?? appState.loopOn);
      } catch {}
    });

    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      appState.loopOn = on;      // запомним в общем состоянии
      setLoop(on);            // переключим текущую анимацию "на лету"
    });
  }
}