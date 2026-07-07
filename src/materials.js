/* ============================================================
   MIRA · Materiales — 📎 subir apuntes de estudio EN CUALQUIER
   momento (navbar o chat). MIRA los LEE de verdad:
   · texto (txt/md/csv/json) → se lee directo
   · PDF                     → se extrae el texto con pdf.js (CDN, bajo demanda)
   · imágenes                → MIRA las "ve" (visión) y guarda su transcripción
   Todo lo leído se inyecta al motor (setStudyContext) → MIRA lo usa en
   todos los prompts durante la sesión.
   ============================================================ */

import { state, addMaterial, removeMaterial, materialsText, save } from './state.js';
import { setStudyContext, askImage } from './engine.js';

const TEXT_TYPES = /^(text\/|application\/(json|csv))/;
const TEXT_EXT = /\.(txt|md|markdown|csv|json|rtf)$/i;

const DESCRIBE_PROMPT =
  `El estudiante subió esta IMAGEN como material de estudio. Transcribe y describe TODO su contenido útil para estudiar: texto, títulos, fórmulas, números, datos y qué muestra la foto/dibujo/diagrama. Sé fiel y completo. No saludes ni opines, solo el contenido.`;

let _panelRender = null;   // re-render del panel abierto (si lo hay)

/* Refresca contexto de estudio + badge + panel abierto. */
export function syncMaterials() {
  setStudyContext(materialsText());
  const badge = document.getElementById('matCount');
  if (badge) {
    const n = state.materials.length;
    badge.textContent = n ? String(n) : '';
    badge.style.display = n ? 'grid' : 'none';
  }
  if (_panelRender) _panelRender();
}

/* ---- lectura de archivos ---- */
const readAsText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(String(e.target.result || '')); r.onerror = rej; r.readAsText(f); });
const readAsDataURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(f); });

/* pdf.js bajo demanda (solo se descarga si subes un PDF) */
let _pdfjs = null;
async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  const lib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.worker.min.mjs';
  _pdfjs = lib; return lib;
}
async function extractPdfText(file) {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const out = [];
  const pages = Math.min(doc.numPages, 30);
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out.push(tc.items.map(it => it.str).join(' '));
  }
  let text = out.join('\n').replace(/[ \t]+/g, ' ').trim();
  if (text.length > 6000) text = text.slice(0, 6000) + '…';
  return text;
}

/* Ingesta UN archivo: lo muestra "leyendo…" y al terminar guarda su texto. */
async function ingest(file) {
  const isImg = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isText = TEXT_TYPES.test(file.type) || TEXT_EXT.test(file.name);

  if (!isImg && !isPdf && !isText) {
    const m = { name: file.name, kind: 'other', type: file.type, status: 'unsupported', text: '' };
    addMaterial(m); syncMaterials(); return m;
  }

  const kind = isImg ? 'image' : isPdf ? 'pdf' : 'text';
  const m = { name: file.name, kind, type: file.type, status: 'processing', text: '' };
  addMaterial(m); syncMaterials();

  try {
    if (isText) {
      m.text = (await readAsText(file)).trim();
    } else if (isPdf) {
      const t = await extractPdfText(file);
      m.text = t ? `Contenido del PDF «${file.name}»:\n${t}` : '';
    } else { // imagen → visión
      m.data = await readAsDataURL(file);
      const desc = await askImage(DESCRIBE_PROMPT, m.data);
      m.text = desc ? `Contenido de la imagen «${file.name}»:\n${desc.trim()}` : '';
    }
    m.status = m.text ? 'ready' : 'error';
  } catch (e) {
    m.status = 'error';
  }
  save(); syncMaterials();
  return m;
}

/* API pública: agrega archivos (navbar o chat). done(results) al terminar TODO. */
export function addFiles(fileList, done) {
  const files = Array.from(fileList || []);
  if (!files.length) { done && done([]); return; }
  Promise.all(files.map(ingest)).then(results => { syncMaterials(); done && done(results); });
}

const ICON = { text: '📄', image: '🖼️', pdf: '📕', other: '📎' };
const STATUS = {
  processing: '<span class="mat-st mat-st--wait">⏳ leyendo…</span>',
  ready: '<span class="mat-st mat-st--ok">✅ listo</span>',
  error: '<span class="mat-st mat-st--bad">⚠️ no se pudo leer</span>',
  unsupported: '<span class="mat-st mat-st--bad">⚠️ no legible · usa PDF/imagen/texto</span>',
};

/* Abre el panel modal de materiales. */
export function openMaterials() {
  close();
  const back = document.createElement('div');
  back.className = 'mat-back';
  back.innerHTML = `
    <div class="mat-panel" role="dialog" aria-label="Material de estudio">
      <div class="mat-head">
        <h3>📎 Material de estudio</h3>
        <button class="mat-x" id="matClose" aria-label="Cerrar">✕</button>
      </div>
      <p class="mat-hint">Sube tus apuntes, <b>fotos</b> o <b>PDFs</b> cuando quieras. MIRA los lee y los usa para explicarte con tu propio material.</p>
      <label class="mat-drop" id="matDrop">
        <input type="file" id="matInput" hidden multiple accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp">
        <span>➕ Arrastra archivos o <strong>búscalos</strong><br><small>Texto, PDF e imágenes (foto de tu libreta, un problema, un diagrama…)</small></span>
      </label>
      <div class="mat-list" id="matList"></div>
    </div>`;
  document.body.appendChild(back);

  const list = back.querySelector('#matList');
  const input = back.querySelector('#matInput');
  const drop = back.querySelector('#matDrop');

  _panelRender = () => {
    if (!state.materials.length) { list.innerHTML = `<div class="mat-empty">Aún no hay material. ¡Sube tus apuntes! 📚</div>`; return; }
    list.innerHTML = state.materials.map((m, i) => `
      <div class="mat-item">
        <span class="mat-ic">${ICON[m.kind] || '📎'}</span>
        <span class="mat-body">
          <span class="mat-name" title="${m.name}">${m.name}</span>
          ${STATUS[m.status] || ''}
        </span>
        <button class="mat-del" data-i="${i}" aria-label="Quitar">🗑️</button>
      </div>`).join('');
    list.querySelectorAll('.mat-del').forEach(b =>
      b.addEventListener('click', () => { removeMaterial(+b.dataset.i); syncMaterials(); }));
  };

  input.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hover'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hover'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));

  back.querySelector('#matClose').addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  _panelRender();
}

function close() {
  _panelRender = null;
  const b = document.querySelector('.mat-back');
  if (b) b.remove();
}
