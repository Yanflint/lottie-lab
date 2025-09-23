// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { state as appState } from './state.js';

export function initControls({ refs }) {
  // Кнопка повторного проигрывания
  if (refs?.restartBtn) {
    refs.restartBtn.addEventListener('click', () => {
      restart();
    });
  }

  // Чекбокс "Зацикленно" — синхронизируется с выбранной лотти
  if (refs?.loopChk) {
    const syncLoopFromSelection = () => {
      const it = appState.items.find(x => x.id === appState.selectedId);
      refs.loopChk.checked = !!(it?.loopOn ?? appState.loopOn);
    };
    // начальная синхронизация
    syncLoopFromSelection();

    // переключение пользователем
    refs.loopChk.addEventListener('change', (e) => {
      const on = !!e.target.checked;
      appState.loopOn = on;      // запомним дефолт для новых лотти
      setLoop(on);               // применим к выбранной лотти
    });

    // обновлять чекбокс при смене выделения
    window.addEventListener('lp:selected-changed', syncLoopFromSelection);
  }
}
