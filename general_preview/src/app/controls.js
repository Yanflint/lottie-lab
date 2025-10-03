// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { restartAll, setLoopAll } from './layers.js';
import { state } from './state.js';

export function initControls({ refs }) {
  // Кнопка повторного проигрывания
  if (refs?.restartBtn) {
    refs.restartBtn.addEventListener('click', () => {
      try { restart(); } catch {}
      try { restartAll(); } catch {}
    });
  }

  // Чекбокс "Зацикленно"
  if (refs?.loopChk) {
    // Инициализация состоянием (если где-то выставляли ранее)
    refs.loopChk.checked = !!state.loopOn;

    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      state.loopOn = on;      // запомним в общем состоянии
      setLoop(on);
      try { setLoopAll(on); } catch {}            // переключим текущую анимацию "на лету"
    });
  }
}
