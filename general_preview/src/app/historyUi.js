
// src/app/historyUi.js
import { getHistory, removeItem, clearHistory, getItem } from './history.js';
import { loadLottieFromData } from './lottie.js';

function buildRefs(){
  const refs = {
    wrapper: document.querySelector('.wrapper') || document.body,
    preview: document.getElementById('preview') || document.body,
    lottieMount: document.getElementById('lottie') || document.body,
    bgImg: document.getElementById('bgImg') || null,
    lotStage: document.getElementById('lotStage') || document.getElementById('lottie') || null,
  };
  return refs;
}

function renderList(root){
  const list = root.querySelector('.history-list');
  list.innerHTML = '';
  const arr = getHistory();
  if (!arr.length){
    list.innerHTML = '<div class="history-empty">История пуста</div>';
    return;
  }
  arr.forEach((it, idx) => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div class="meta">
        <div class="name" title="${(it.name||'').replace(/"/g,'&quot;')}">${it.name || 'Lottie'}</div>
        <div class="date">${new Date(it.createdAt||Date.now()).toLocaleString()}</div>
      </div>
      <div class="actions">
        <button class="btn hist-load" data-id="${it.id}">Показать</button>
        <button class="btn hist-del" data-id="${it.id}">Удалить</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function ensurePanel(){
  let panel = document.getElementById('historyPanel');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'historyPanel';
  panel.className = 'history-panel hidden';
  panel.innerHTML = `
    <div class="history-head">
      <div class="ttl">История Lottie</div>
      <div class="spacer"></div>
      <button id="historyClear" class="btn danger">Очистить</button>
      <button id="historyClose" class="btn">Закрыть</button>
    </div>
    <div class="history-list"></div>
  `;
  document.body.appendChild(panel);
  return panel;
}

function ensureToggle(){
  let t = document.getElementById('historyToggle');
  if (t) return t;
  t = document.createElement('button');
  t.id = 'historyToggle';
  t.className = 'history-toggle';
  t.textContent = 'История';
  document.body.appendChild(t);
  return t;
}

function ensureStyles(){
  if (document.getElementById('historyStyles')) return;
  const css = document.createElement('style');
  css.id = 'historyStyles';
  css.textContent = `
  .history-toggle{
    position: fixed; right: 16px; bottom: 16px; z-index: 1001;
    padding: 8px 12px; border-radius: 10px; border:1px solid #3a3a3a; background:#14171f; color:#fff; cursor:pointer;
    box-shadow:0 2px 8px rgba(0,0,0,.25);
  }
  .history-panel{ position: fixed; right: 16px; bottom: 64px; width: 320px; max-height: 60vh; overflow:auto;
    background:#0b0f1a; color:#fff; border:1px solid #2a2f3a; border-radius: 14px; z-index: 1001; box-shadow:0 8px 32px rgba(0,0,0,.4); }
  .history-panel.hidden{ display:none; }
  .history-head{ display:flex; align-items:center; gap:8px; padding:10px 12px; position:sticky; top:0; background:#0b0f1a; border-bottom:1px solid #2a2f3a; }
  .history-head .ttl{ font-weight:700; }
  .history-head .spacer{ flex:1; }
  .history-list{ padding:8px 10px; display:flex; flex-direction:column; gap:8px; }
  .history-item{ display:flex; align-items:center; gap:8px; padding:8px; border:1px solid #222939; border-radius:10px; }
  .history-item .meta{ flex:1; min-width:0; }
  .history-item .name{ font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .history-item .date{ opacity:.7; font-size:11px; }
  .history-item .actions{ display:flex; gap:6px; }
  .btn{ background:#14171f; color:#fff; border:1px solid #2a2f3a; border-radius:8px; padding:6px 10px; cursor:pointer; }
  .btn:hover{ background:#1a2030; }
  .btn.danger{ border-color:#5f2430; }
  `;
  document.head.appendChild(css);
}

export function initHistoryUI(){
  ensureStyles();
  const panel = ensurePanel();
  const toggle = ensureToggle();
  const refs = buildRefs();

  function open(){ renderList(panel); panel.classList.remove('hidden'); }
  function close(){ panel.classList.add('hidden'); }

  toggle.addEventListener('click', () => { panel.classList.contains('hidden') ? open() : close(); });
  panel.querySelector('#historyClose').addEventListener('click', close);
  panel.querySelector('#historyClear').addEventListener('click', () => { clearHistory(); renderList(panel); });

  panel.addEventListener('click', async (e) => {
    const loadBtn = e.target.closest('.hist-load');
    const delBtn = e.target.closest('.hist-del');
    if (loadBtn){
      const id = loadBtn.getAttribute('data-id');
      const it = getItem(id);
      if (it){
        try { await loadLottieFromData(refs, it.data); } catch (e) { console.error('load from history failed', e); }
      }
    } else if (delBtn){
      const id = delBtn.getAttribute('data-id');
      removeItem(id);
      renderList(panel);
    }
  });

  // Initial render
  renderList(panel);
}

// auto-init when module is loaded (after DOM ready)
document.addEventListener('DOMContentLoaded', () => {
  try { initHistoryUI(); } catch(e) { console.warn('history UI init failed', e); }
});
