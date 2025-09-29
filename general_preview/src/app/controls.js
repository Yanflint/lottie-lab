// src/app/controls.js
import { restartAll, setSelectedLoop, getSelectedLoop } from './layers.js';
import { state } from './state.js';

export function initControls({ refs }) {
  // Кнопка повторного проигрывания
  if (refs?.restartBtn) {
    refs.restartBtn.addEventListener('click', () => { restartAll(); });
  }

  // Чекбокс "Зацикленно"
  if (refs?.loopChk) {
    // Инициализация состоянием (если где-то выставляли ранее)
    refs.loopChk.checked = !!getSelectedLoop();

    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      setSelectedLoop(on);    // применим к выделенному слою
    });
  }
}
