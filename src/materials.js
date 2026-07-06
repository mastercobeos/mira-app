/* ============================================================
   MIRA · Materiales — 📎 subir apuntes de estudio EN CUALQUIER
   momento. Vive en un panel accesible desde el topbar. Los
   archivos de texto se inyectan al motor (setStudyContext) para
   que MIRA los use como referencia durante toda la sesión.
   ============================================================ */

import { state, addMaterial, removeMaterial, materialsText } from './state.js';
import { setStudyContext } from './engine.js';

const TEXT_TYPES = /^(text\/|application\/(json|csv))/;
const TEXT_EXT = /\.(txt|md|markdown|csv|json|rtf)$/i;

/* Refresca el contexto de estudio del motor + el badge del topbar. */
export function syncMaterials() {
  setStudyContext(materialsText());
  const badge = document.getElementById('matCount');
  if (badge) {
    const n = state.materials.length;
    badge.textContent = n ? String(n) : '';
    badge.style.display = n ? 'grid' : 'none';
  }
}

/* Lee un File y lo agrega como material (texto / imagen / otro). */
function readFile(file, done) {
  const isImg = file.type.startsWith('image/');
  const isText = TEXT_TYPES.test(file.type) || TEXT_EXT.test(file.name);
  const r = new FileReader();
  r.onload = ev => {
    if (isImg) addMaterial({ name: file.name, kind: 'image', data: ev.target.result, type: file.type });
    else if (isText) addMaterial({ name: file.name, kind: 'text', text: String(ev.target.result || '').trim(), type: file.type });
    else addMaterial({ name: file.name, kind: 'other', type: file.type }); // pdf/docx: se lista, no se inyecta texto
    syncMaterials();
    done && done();
  };
  if (isImg) r.readAsDataURL(file);
  else if (isText) r.readAsText(file);
  else { // sin lectura útil en el navegador → solo registrar
    addMaterial({ name: file.name, kind: 'other', type: file.type });
    syncMaterials(); done && done();
  }
}

/* API pública para agregar archivos desde cualquier pantalla (ej: topic). */
export function addFiles(fileList, done) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  let left = files.length;
  files.forEach(f => readFile(f, () => { if (--left === 0) done && done(); }));
}

const ICON = { text: '📄', image: '🖼️', other: '📎' };

/* Abre el panel modal de materiales. */
export function openMaterials() {
  close(); // por si ya había uno
  const back = document.createElement('div');
  back.className = 'mat-back';
  back.innerHTML = `
    <div class="mat-panel" role="dialog" aria-label="Material de estudio">
      <div class="mat-head">
        <h3>📎 Material de estudio</h3>
        <button class="mat-x" id="matClose" aria-label="Cerrar">✕</button>
      </div>
      <p class="mat-hint">Sube tus apuntes cuando quieras. MIRA los tendrá presentes para explicarte con tu propio material.</p>
      <label class="mat-drop" id="matDrop">
        <input type="file" id="matInput" hidden multiple accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.docx,.pptx">
        <span>➕ Arrastra archivos o <strong>búscalos</strong><br><small>Apuntes en TXT/MD funcionan mejor · también imágenes y PDF</small></span>
      </label>
      <div class="mat-list" id="matList"></div>
    </div>`;
  document.body.appendChild(back);

  const list = back.querySelector('#matList');
  const input = back.querySelector('#matInput');
  const drop = back.querySelector('#matDrop');

  function render() {
    if (!state.materials.length) {
      list.innerHTML = `<div class="mat-empty">Aún no hay material. ¡Sube tus apuntes! 📚</div>`;
      return;
    }
    list.innerHTML = state.materials.map((m, i) => `
      <div class="mat-item">
        <span class="mat-ic">${ICON[m.kind] || '📎'}</span>
        <span class="mat-name" title="${m.name}">${m.name}</span>
        ${m.kind === 'other' ? '<span class="mat-tag">solo referencia</span>' : ''}
        <button class="mat-del" data-i="${i}" aria-label="Quitar">🗑️</button>
      </div>`).join('');
    list.querySelectorAll('.mat-del').forEach(b =>
      b.addEventListener('click', () => { removeMaterial(+b.dataset.i); syncMaterials(); render(); }));
  }

  input.addEventListener('change', e => addFiles(e.target.files, render));
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hover'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hover'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files, render));

  back.querySelector('#matClose').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  render();
}

function close() {
  const b = document.querySelector('.mat-back');
  if (b) b.remove();
}
