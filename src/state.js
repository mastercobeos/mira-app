/* ============================================================
   MIRA · State — sesión (tema, base, rol, historial) + persistencia
   ============================================================ */

const KEY = 'mira.session.v2';

export const state = {
  topic: '',
  file: null,          // { name, text|dataUrl, type }
  base: null,          // 'yes' | 'no'
  role: 'teacher',     // 'teacher' | 'learner'
  history: [],         // { who:'mira'|'kid', text }
  progress: 0,         // 0..100
  learned: [],         // puntos aprendidos (recap)
  stars: 0,            // ⭐ ganadas en los minijuegos
};

export function resetSession() {
  state.topic = ''; state.file = null; state.base = null;
  state.role = 'teacher'; state.history = []; state.progress = 0; state.learned = [];
  state.stars = 0;
  save();
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
