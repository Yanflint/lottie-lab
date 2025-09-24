
// src/app/main.js
import { initMulti } from './multi.js';
import { initDnD } from './dnd.js';
import { layoutLottie, setBackgroundFromSrc } from './lottie.js';
import { initLottiePan } from './pan.js';

function collectRefs() {
  return {
    wrapper:      document.getElementById('wrapper'),
    preview:      document.getElementById('preview'),
    placeholder:  document.getElementById('ph'),
    dropOverlay:  document.getElementById('dropOverlay'),
    bgImg:        document.getElementById('bgImg'),
    lotStage:     document.getElementById('lotStage'),
    lottieMount:  document.getElementById('lottie'),
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const refs = collectRefs();

  try { initMulti(); } catch {}
  try { await initDnD(refs); } catch {}

  // Перелайаут при ресайзе
  const relayout = () => {
    try {
      // Лайаут для базового слоя; остальные делает multi.relayoutAll()
      layoutLottie(refs);
      if (window.__multiLottie && window.__multiLottie.layers) {
        // Проксируем их relayout
        import('./multi.js').then(m => m.relayoutAll && m.relayoutAll());
      }
    } catch {}
  };
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });

  // Пан по базовому слою
  try { initLottiePan({ refs }); } catch {}

  // Если нужно — автозагрузка примера (опционально)
  // const demoBg = 'icons/icon-512.png'; try { await setBackgroundFromSrc(refs, demoBg, {fileName:'icon-512.png'}); } catch {}
});
