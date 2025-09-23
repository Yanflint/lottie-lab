// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { state as appState, setLoop } from './appState.js';

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
    refs.loopChk.checked = !!appState.loopOn;

    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      appState.loopOn = on;      // запомним в общем состоянии
      setLoop(on);            // переключим текущую анимацию "на лету"
    });
  }
}