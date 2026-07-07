/* ============================================================
   MIRA · State — sesión (tema, base, rol, historial) + persistencia
   ============================================================ */

const KEY = 'mira.session.v2';
const ARCHIVE_KEY = 'mira.archive.v1';   // sesiones pasadas (resúmenes + conversaciones)

export const state = {
  id: '',              // id único de la sesión en curso
  topic: '',
  file: null,          // (legacy) { name, text|dataUrl, type }
  materials: [],       // 📎 material de estudio: [{ name, kind:'text'|'image', text?, data?, type }]
  base: null,          // 'yes' | 'no'
  role: 'teacher',     // 'teacher' | 'learner'
  history: [],         // { who:'mira'|'kid', text }
  progress: 0,         // 0..100
  learned: [],         // puntos aprendidos (recap)
  stars: 0,            // ⭐ ganadas en los minijuegos
};

/* id sencillo para la sesión (no usamos librerías). */
function newId() {
  return 'S' + new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '') +
    Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

export function resetSession() {
  state.id = ''; state.topic = ''; state.file = null; state.materials = []; state.base = null;
  state.role = 'teacher'; state.history = []; state.progress = 0; state.learned = [];
  state.stars = 0;
  save();
}

/* ---------------- 📎 MATERIAL DE ESTUDIO ---------------- */

export function addMaterial(m) {
  if (!state.id) state.id = newId();
  state.materials.push(m); save();
  return state.materials.length;
}
export function removeMaterial(i) {
  state.materials.splice(i, 1); save();
}
/* Texto concatenado de los materiales legibles (texto, PDF y descripción
   de imágenes), para dar contexto al motor. */
export function materialsText(limit = 6000) {
  const txt = state.materials
    .filter(m => m.text)          // texto, pdf o imagen ya interpretada
    .map(m => `— ${m.name} —\n${m.text}`)
    .join('\n\n');
  return txt.length > limit ? txt.slice(0, limit) + '…' : txt;
}

/* ---------------- 🗂️ ARCHIVO DE SESIONES ---------------- */

export function loadArchive() {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); } catch { return []; }
}
function saveArchive(list) {
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list.slice(-40))); } catch {}
}
/* Guarda (o actualiza por id) la sesión en curso en el historial. */
export function archiveCurrentSession() {
  if (!state.topic) return;
  if (!state.id) state.id = newId();
  const list = loadArchive();
  const entry = {
    id: state.id,
    at: new Date().toISOString(),
    topic: state.topic,
    learned: (state.learned || []).slice(0, 6),
    stars: state.stars || 0,
    history: (state.history || []).slice(-40),
    materials: (state.materials || []).map(m => m.name),
  };
  const i = list.findIndex(s => s.id === entry.id);
  if (i >= 0) list[i] = entry; else list.push(entry);
  saveArchive(list);
  return entry;
}

export function addStar() {
  state.stars += 1; save();
  return state.stars;
}

export function pushTurn(who, text) {
  state.history.push({ who, text });
  if (state.history.length > 40) state.history.shift();
  save();
}

/* Últimos N turnos como texto para dar contexto al motor. */
export function contextText(n = 6) {
  return state.history.slice(-n)
    .map(t => (t.who === 'mira' ? 'MIRA' : 'ESTUDIANTE') + ': ' + t.text)
    .join('\n');
}

export function bumpProgress(delta) {
  state.progress = Math.max(0, Math.min(100, state.progress + delta));
  save();
  return state.progress;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch {}
}
