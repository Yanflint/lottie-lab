
// src/app/multiCore.js
// Управление несколькими Lottie: выбор, рамка 2px внутрь, заливка 10%, перетаскивание и стрелки.
export const MultiCore = (() => {
  const state = {
    active: false,
    stage: null,
    items: new Map(), // id -> { el, anim, x, y, w, h, name, loop }
    selectedId: null,
    nextId: 1,
  };

  function ensureStage(refs) {
    if (state.stage && document.body.contains(state.stage)) return state.stage;
    const host = refs.preview || refs.wrapper || document.body;
    // Создаём контейнер поверх фонового изображения
    const stage = document.createElement('div');
    stage.id = 'lpStage';
    stage.style.position = 'absolute';
    stage.style.left = '50%';
    stage.style.top = '50%';
    stage.style.transform = 'translate(-50%, -50%)';
    stage.style.width = (refs?.bgImg?.naturalWidth || 512) + 'px';
    stage.style.height = (refs?.bgImg?.naturalHeight || 512) + 'px';
    stage.style.pointerEvents = 'auto';
    stage.style.userSelect = 'none';
    stage.style.outline = 'none';
    stage.setAttribute('tabindex', '0'); // чтобы ловить стрелки
    // Вклеиваем поверх содержимого preview
    (refs.preview || refs.wrapper || document.body).appendChild(stage);
    state.stage = stage;

    // Стили выделения (10% голубой + внутренняя рамка 2px)
    if (!document.getElementById('lpMultiStyles')) {
      const st = document.createElement('style');
      st.id = 'lpMultiStyles';
      st.textContent = `
        #lpStage { position: absolute; overflow: visible; }
        .lp-lottie { position: absolute; top: 0; left: 0; cursor: grab; }
        .lp-lottie.dragging { cursor: grabbing; }
        .lp-sel { position: absolute; inset: 0; background: rgba(46,168,255,0.10); box-shadow: inset 0 0 0 2px rgba(46,168,255,1); pointer-events: none; border-radius: 2px; }
      `;
      document.head.appendChild(st);
    }

    // Клавиатура: перемещение выделенного
    stage.addEventListener('keydown', (e) => {
      if (!state.selectedId || !state.items.has(state.selectedId)) return;
      const it = state.items.get(state.selectedId);
      const step = e.shiftKey ? 10 : 1;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft')  setPos(it, it.x - step, it.y);
      if (e.key === 'ArrowRight') setPos(it, it.x + step, it.y);
      if (e.key === 'ArrowUp')    setPos(it, it.x, it.y - step);
      if (e.key === 'ArrowDown')  setPos(it, it.x, it.y + step);
    });

    return stage;
  }

  function select(id) {
    // Снять предыдущее
    if (state.selectedId && state.items.has(state.selectedId)) {
      const prev = state.items.get(state.selectedId);
      const ov = prev.el.querySelector('.lp-sel');
      if (ov) ov.remove();
    }
    state.selectedId = id;
    // Поставить новое
    if (id && state.items.has(id)) {
      const it = state.items.get(id);
      const ov = document.createElement('div');
      ov.className = 'lp-sel';
      it.el.appendChild(ov);
      // привести чекбокс "Цикл" в актуальное состояние
      try {
        const chk = document.getElementById('loopChk');
        if (chk) chk.checked = !!it.loop;
      } catch {}
      // на верх
      it.el.style.zIndex = String(1000 + id);
      state.stage?.focus?.();
    }
  }

  function setPos(it, x, y) {
    it.x = x; it.y = y;
    it.el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function addFromJSON(refs, name, data) {
    const stage = ensureStage(refs);
    state.active = true;
    const lot = (typeof data === 'string') ? JSON.parse(data) : data;
    const w = +lot.w || 512, h = +lot.h || 512;

    const id = state.nextId++;
    const el = document.createElement('div');
    el.className = 'lp-lottie';
    el.dataset.id = String(id);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    stage.appendChild(el);

    const anim = window.lottie?.loadAnimation ? window.lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: lot
    }) : null;

    const it = { id, el, anim, x: 0, y: 0, w, h, name, loop: false };
    state.items.set(id, it);

    // перетаскивание мышью
    el.addEventListener('mousedown', (e) => {
      select(id);
      const sx = e.clientX, sy = e.clientY;
      const ox = it.x, oy = it.y;
      let drag = true;
      el.classList.add('dragging');
      const onMove = (ev) => {
        if (!drag) return;
        setPos(it, ox + (ev.clientX - sx), oy + (ev.clientY - sy));
      };
      const onUp = () => {
        drag = false;
        el.classList.remove('dragging');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
    el.addEventListener('click', () => select(id));

    // начальный сдвиг чтобы не слиплись
    setPos(it, (id-1)*12, (id-1)*12);
    select(id);
    return it;
  }

  // Публичный API (используется из controls/dnd)
  function setLoop(on) {
    if (!state.selectedId || !state.items.has(state.selectedId)) return;
    const it = state.items.get(state.selectedId);
    it.loop = !!on;
    try { if (it.anim) it.anim.loop = it.loop; } catch {}
  }
  function restart() {
    if (!state.selectedId || !state.items.has(state.selectedId)) return;
    const it = state.items.get(state.selectedId);
    try { it.anim.stop(); it.anim.goToAndPlay(0, true); }
    catch { try { it.anim.play?.(); } catch {} }
  }
  async function addFromFile(refs, file) {
    const text = await file.text();
    return addFromJSON(refs, file.name, text);
  }
  function isActive() { return !!state.active; }

  return { ensureStage, addFromJSON, addFromFile, setLoop, restart, isActive, _state: state };
})();

// Глобальный доступ (для существующих модулей)
try { window.__lp_multi = MultiCore; } catch {}
