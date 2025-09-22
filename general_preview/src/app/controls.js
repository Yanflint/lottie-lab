
// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { state } from './state.js';
import { setLoopForSelected as multiSetLoop, restartSelected as multiRestart } from './multi.js';

export function initControls({ refs }) {
  // Кнопка повторного проигрывания
  if (refs?.restartBtn) {
    refs.restartBtn.addEventListener('click', () => {
      // если выбран инстанс в мультирежиме — рестартуем его, иначе fallback
      try { multiRestart(); } catch {}
      try { restart(); } catch {}
    });
  }

  // Чекбокс "Зацикленно"
  if (refs?.loopChk) {
    // Инициализация состоянием (если где-то выставляли ранее)
    refs.loopChk.checked = !!state.loopOn;
    refs.loopChk.style.marginLeft = '0';
    refs.loopChk.style.marginRight = '0';

    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      state.loopOn = on;      // запомним в общем состоянии
      // Сначала переключим выбранную лотти (если есть), потом — одиночную
      try { multiSetLoop(on); } catch {}
      setLoop(on);            // переключим текущую анимацию "на лету"
    });
  }
}
