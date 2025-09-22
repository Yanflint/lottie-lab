const stage = document.getElementById('stage');
const filesInput = document.getElementById('lotFiles');
const loopChk = document.getElementById('loopChk');
const restartBtn = document.getElementById('restartBtn');

/** Model */
const items = new Map(); // id -> { el, anim, x, y, w, h, name, loop }
let selectedId = null;
let nextId = 1;

// Helpers
function selectItem(id) {
  if (selectedId && items.has(selectedId)) {
    const prev = items.get(selectedId);
    prev.el.classList.remove('selected');
    const ov = prev.el.querySelector('.selection-overlay');
    if (ov) ov.remove();
  }
  selectedId = id;
  if (id && items.has(id)) {
    const it = items.get(id);
    it.el.classList.add('selected');
    const ov = document.createElement('div');
    ov.className = 'selection-overlay';
    it.el.appendChild(ov);
    // reflect loop state to checkbox
    loopChk.checked = !!it.loop;
    // focus stage so arrows work
    stage.focus();
    // bring to front
    it.el.style.zIndex = String(1000 + id);
  }
}

function setItemPos(it, x, y) {
  it.x = x; it.y = y;
  it.el.style.transform = `translate({x}px, {y}px)`;
}

function addItemFromJSON(name, data) {
  try {
    const lot = (typeof data === 'string') ? JSON.parse(data) : data;
    const w = +lot.w || 512, h = +lot.h || 512;
    const id = nextId++;
    const el = document.createElement('div');
    el.className = 'lottie-item';
    el.dataset.id = String(id);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    stage.appendChild(el);
    const anim = window.lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: lot
    });
    const it = { id, el, anim, x: 0, y: 0, w, h, name, loop: false };
    items.set(id, it);

    // interactions
    el.addEventListener('mousedown', (e) => {
      selectItem(id);
      const startX = e.clientX, startY = e.clientY;
      const ox = it.x, oy = it.y;
      let dragging = true;
      el.classList.add('dragging');
      const onMove = (ev) => {
        if (!dragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        setItemPos(it, ox + dx, oy + dy);
      };
      const onUp = () => {
        dragging = false;
        el.classList.remove('dragging');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    el.addEventListener('click', () => selectItem(id));

    // initial slight offset to avoid perfect overlap
    setItemPos(it, (id-1)*12, (id-1)*12);
    selectItem(id);
  } catch (e) {
    console.error('Failed to add Lottie:', e);
  }
}

filesInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  for (const file of files) {
    const text = await file.text();
    addItemFromJSON(file.name, text);
  }
  filesInput.value = '';
});

// Loop checkbox controls ONLY selected item
loopChk.addEventListener('change', () => {
  if (!selectedId || !items.has(selectedId)) return;
  const it = items.get(selectedId);
  it.loop = !!loopChk.checked;
  if (it.anim) it.anim.loop = it.loop;
});

// Restart only selected
restartBtn.addEventListener('click', () => {
  if (!selectedId || !items.has(selectedId)) return;
  const it = items.get(selectedId);
  try { it.anim.stop(); it.anim.goToAndPlay(0,true); } catch { it.anim?.play?.(); }
});

// Keyboard move
stage.addEventListener('keydown', (e) => {
  if (!selectedId || !items.has(selectedId)) return;
  const it = items.get(selectedId);
  const step = e.shiftKey ? 10 : 1;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowLeft')  setItemPos(it, it.x - step, it.y);
  if (e.key === 'ArrowRight') setItemPos(it, it.x + step, it.y);
  if (e.key === 'ArrowUp')    setItemPos(it, it.x, it.y - step);
  if (e.key === 'ArrowDown')  setItemPos(it, it.x, it.y + step);
});

// Drag & drop support
stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer?.files || [])
    .filter(f => /\.json$|\.lottie$/i.test(f.name));
  for (const f of files) {
    const text = await f.text();
    addItemFromJSON(f.name, text);
  }
});
