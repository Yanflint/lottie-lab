
// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { state } from './state.js';

export function initControls({ refs }) {
  if (refs?.restartBtn) {
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    refs.restartBtn.addEventListener('click', () => {
      restart();
    });
=======
    refs.restartBtn.addEventListener('click', () => { restart(); });
>>>>>>> Stashed changes
  }
  if (refs?.loopChk) {
<<<<<<< Updated upstream
    // Инициализация состоянием (если где-то выставляли ранее)
    refs.loopChk.checked = !!state.loopOn;

    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      state.loopOn = on;      // запомним в общем состоянии
      setLoop(on);            // переключим текущую анимацию "на лету"
=======
    refs.loopChk.checked = !!state.loopOn;
    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      state.loopOn = on;
      setLoop(on);
>>>>>>> Stashed changes
=======
    refs.restartBtn.addEventListener('click', () => { restart(); });
  }
  if (refs?.loopChk) {
    refs.loopChk.checked = !!state.loopOn;
    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      state.loopOn = on;
      setLoop(on);
>>>>>>> Stashed changes
    });
  }
}
