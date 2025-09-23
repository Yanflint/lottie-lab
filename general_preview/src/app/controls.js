// src/app/controls.js
import { restart, setLoop } from './lottie.js';
import { state } from './state.js';

export function initControls({ refs }) {
  // [MULTI] sync checkbox with selected item if multi-mode active
  try {
    const m = window.__multi;
    if (m && typeof m.onExternalSelectionChange === 'function') {
      m.onExternalSelectionChange((sel) => {
        try { if (refs?.loopChk) refs.loopChk.checked = !!(sel ? sel.loop : state.loopOn); } catch {}
      });
    }
  } catch {}

  // Кнопка повторного проигрывания
  if (refs?.restartBtn) {
    refs.restartBtn.addEventListener('click', () => {
      restart();
    });
  }

  // Чекбокс "Зацикленно"
  if (refs?.loopChk) {
    // Инициализация состоянием (если где-то выставляли ранее)
    try { const m = window.__multi; refs.loopChk.checked = m && m.isActive && m.isActive() ? !!m.getSelectedLoop?.() : !!state.loopOn; } catch { refs.loopChk.checked = !!state.loopOn; }

    refs.loopChk.addEventListener('change', (e) => {
      // [MULTI] if active — apply to selected only
      try {
        const m = window.__multi;
        if (m && m.isActive && m.isActive()) {
          m.setLoopForSelected(!!e.target.checked);
          return; // do not propagate to single-lottie
        }
      } catch {}

      const on = !!e.target.checked;
      state.loopOn = on;      // запомним в общем состоянии
      setLoop(on);            // переключим текущую анимацию "на лету"
    });
  }
}
