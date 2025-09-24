
// src/app/main.js
import { initMulti } from './multi.js';
import { initDnD } from './dnd.js';
import { layoutLottie } from './lottie.js';
import { initControls } from './controls.js';
import { initShare } from './shareClient.js';
import { initLoadFromLink } from './loadFromLink.js';

function collectRefs() {
  return {
    wrapper:      document.getElementById('wrapper'),
    preview:      document.getElementById('preview'),
    placeholder:  document.getElementById('ph'),
    dropOverlay:  document.getElementById('dropOverlay'),
    bgImg:        document.getElementById('bgImg'),
    lotStage:     document.getElementById('lotStage'),
    lottieMount:  document.getElementById('lottie'),
    restartBtn:   document.getElementById('restartBtn'),
    loopChk:      document.getElementById('loopChk'),
    shareBtn:     document.getElementById('shareBtn'),
  };
}

document.addEventListener('DOMContentLoaded', async () => {

  const refs = collectRefs();

  try { initMulti(); } catch {}
  try { await initDnD(refs); } catch {}
  try { initControls({ refs }); } catch {}

  try { await initLoadFromLink({ refs }); } catch {}

  // Share: с готовыми тостами ошибок, если ничего не загружено
  try { initShare({}); } catch {}

  const relayout = () => {
    try {
      layoutLottie(refs);
      // Также перелайаутить все слои в multi:
      import('./multi.js').then(m => m.relayoutAll && m.relayoutAll());
    } catch {}
  };
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout, { passive: true });
});
