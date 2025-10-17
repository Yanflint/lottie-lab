/*! dnd-upload.js — clean drag & drop uploader (general_preview) */
(function(){
  const root = document.getElementById('uploader');
  const input = document.getElementById('uploader-input');
  const list  = document.getElementById('uploader-files');
  if (!root || !input || !list) return;

  function fmtSize(bytes){
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    const mb = kb / 1024;
    return mb.toFixed(1) + ' MB';
  }

  function renderFiles(files){
    list.innerHTML = '';
    const arr = Array.from(files);
    arr.forEach(f => {
      const li = document.createElement('li');
      li.className = 'dnd__file';
      const thumb = document.createElement('img');
      thumb.className = 'dnd__thumb';
      const meta = document.createElement('div');
      meta.className = 'dnd__meta';
      const name = document.createElement('div');
      name.className = 'dnd__name';
      name.textContent = f.name;
      const size = document.createElement('div');
      size.className = 'dnd__size';
      size.textContent = fmtSize(f.size || 0);

      // Try preview for images
      if (f.type && f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => { thumb.src = e.target.result; };
        reader.readAsDataURL(f);
      } else {
        // placeholder
        thumb.style.background = '#f3f3f3';
      }

      meta.appendChild(name);
      meta.appendChild(size);
      li.appendChild(thumb);
      li.appendChild(meta);
      list.appendChild(li);
    });

    // Emit custom event for integration
    const ev = new CustomEvent('uploader:files', { detail: arr });
    root.dispatchEvent(ev);
  }

  function handleFiles(files){
    if (!files || !files.length) return;
    renderFiles(files);
  }

  // Drag & drop events
  ['dragenter','dragover'].forEach(t => {
    root.addEventListener(t, e => {
      e.preventDefault();
      e.stopPropagation();
      root.classList.add('is-dragover');
    }, false);
  });
  ['dragleave','drop'].forEach(t => {
    root.addEventListener(t, e => {
      e.preventDefault();
      e.stopPropagation();
      if (t === 'drop') handleFiles(e.dataTransfer.files);
      root.classList.remove('is-dragover');
    }, false);
  });

  // Click-to-select
  input.addEventListener('change', e => handleFiles(input.files));

  // Make entire dropzone clickable
  root.addEventListener('click', () => input.click());
})();
