// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { applyLoopToSelected } from './multi.js';
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
      try { applyLoopToSelected({ refs }, on); } catch {}
      setLoop(on);            // глобально обновим дефолт (для будущих)
    });
  }
}
