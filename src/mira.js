/* ============================================================
   MIRA · Avatar & diálogo — retrato de medio cuerpo, moods,
   burbuja con streaming, typing, confeti y voz (TTS).
   ============================================================ */

import { stream } from './engine.js';

const MOOD_LABEL = {
  happy: 'Feliz', curious: 'Curiosidad', thinking: 'Pensando',
  excited: 'Con muchas ganas', proud: 'Orgullo', celebratory: '¡Celebrando!',
  confused: 'Necesita ayuda', encouraging: 'Animándote',
  sad: 'Un poco triste', surprised: '¡Sorprendida!', idea: '¡Tengo una idea!',
};

/* Sprites de expresión disponibles por rol (archivos en avatars/). */
const HAS = {
  teacher: new Set(['happy', 'thinking', 'excited', 'proud']),
  learner: new Set(['happy', 'curious', 'thinking', 'excited', 'proud', 'encouraging', 'celebratory', 'confused', 'sad', 'surprised', 'idea']),
};
/* Rotación de expresiones para el "idle" (cambia cada 2-3s; solo caras neutras/alegres). */
const CYCLE = {
  teacher: ['happy', 'excited', 'proud', 'thinking'],
  learner: ['happy', 'curious', 'excited', 'proud', 'encouraging', 'thinking'],
};
const FALLBACK = {
  confused: 'thinking', encouraging: 'excited', celebratory: 'proud', curious: 'thinking',
  sad: 'thinking', surprised: 'excited', idea: 'excited',   // fallbacks para la profe (no tiene esos sprites)
};

function spriteFile(role, mood) {
  let m = mood;
  if (!HAS[role].has(m)) m = FALLBACK[m] || 'happy';
  if (!HAS[role].has(m)) m = 'happy';
  return `avatars/${role}-${m}.png`;
}

/* HTML del retrato de MIRA (medio cuerpo, 2 capas para cross-fade). */
export function miraPortrait({ role = 'teacher', mood = 'happy', showMood = true } = {}) {
  return `
    <div class="mira" data-role="${role}">
      <div class="mira__portrait" data-mood="${mood}">
        <img class="mira__art is-on" src="${spriteFile(role, mood)}" alt="MIRA" draggable="false">
        <img class="mira__art" alt="" draggable="false">
      </div>
      <div class="mira__floor"></div>
      ${showMood ? `
      <div class="mira__mood">
        <div class="mira__mood-label">MIRA se siente</div>
        <div class="mira__mood-value" data-mood-value>${MOOD_LABEL[mood] || 'Feliz'}</div>
      </div>` : ''}
    </div>`;
}

/* ---- Ciclo de expresiones (una MIRA visible a la vez) ---- */
let _cycleTimer = null;
let _cycleScope = null;
let _cycleIdx = 0;
const CYCLE_MS = 2600;

/* Llamar tras montar cada pantalla: arranca el vaivén de expresiones. */
export function initMira(scope) {
  const mira = scope && scope.querySelector('.mira');
  if (_cycleTimer) { clearInterval(_cycleTimer); _cycleTimer = null; }
  if (!mira) return;
  _cycleScope = scope; _cycleIdx = 0;
  _cycleTimer = setInterval(() => {
    const sc = _cycleScope;
    const m = sc && sc.querySelector('.mira');
    if (!m || !document.body.contains(m)) { clearInterval(_cycleTimer); _cycleTimer = null; return; }
    const role = m.dataset.role || 'learner';
    const list = CYCLE[role] || CYCLE.learner;
    _cycleIdx = (_cycleIdx + 1) % list.length;
    applyExpression(sc, role, list[_cycleIdx], { label: true });
  }, CYCLE_MS);
}

/* Cross-fade entre las 2 capas de imagen del retrato. */
function applyExpression(scope, role, mood, { label = true } = {}) {
  const p = scope.querySelector('.mira__portrait');
  if (!p) return;
  const on = p.querySelector('.mira__art.is-on');
  const off = p.querySelector('.mira__art:not(.is-on)');
  if (!on || !off) return;
  const src = spriteFile(role, mood);
  if (on.getAttribute('src') === src) { // mismo sprite: solo rebote
    p.classList.remove('react'); void p.offsetWidth; p.classList.add('react');
  } else {
    off.src = src;
    const swap = () => { off.classList.add('is-on'); on.classList.remove('is-on'); p.classList.remove('react'); void p.offsetWidth; p.classList.add('react'); };
    if (off.complete && off.naturalWidth) swap();
    else off.onload = swap;
  }
  p.dataset.mood = mood;
  if (label) {
    const val = scope.querySelector('[data-mood-value]');
    if (val) val.textContent = MOOD_LABEL[mood] || 'Feliz';
  }
}

/* Cambia rol y/o mood de un retrato ya montado. */
export function setMira(scope, { role, mood } = {}) {
  const mira = scope.querySelector('.mira');
  if (!mira) return;
  if (role) mira.dataset.role = role;
  if (mood) setMood(scope, mood);
}

/* Fija una expresión concreta (momento del guión) y reinicia el reloj del ciclo. */
export function setMood(scope, mood) {
  const mira = scope.querySelector('.mira');
  if (!mira) return;
  const role = mira.dataset.role || 'learner';
  applyExpression(scope, role, mood, { label: true });
  // reinicia el temporizador para que el próximo cambio automático sea en ~2.6s
  if (_cycleTimer && _cycleScope === scope) {
    clearInterval(_cycleTimer);
    const list = CYCLE[role] || CYCLE.learner;
    const found = list.indexOf(mood);
    _cycleIdx = found >= 0 ? found : _cycleIdx;
    initMira(scope);
  }
}

/* HTML de una burbuja de diálogo (vacía o con texto). */
export function bubble(text = '', { audio = false, left = false, id = '' } = {}) {
  return `<div class="bubble ${left ? 'left' : ''} ${audio ? 'bubble--audio' : ''}" ${id ? `id="${id}"` : ''}>${text}</div>`;
}

export function typingHTML() {
  return `<span class="typing"><i></i><i></i><i></i></span>`;
}

/* Transmite la respuesta del motor dentro de una burbuja, con cursor.
   Devuelve el texto final. */
export async function streamBubble(bubbleEl, prompt, { onChunk } = {}) {
  bubbleEl.innerHTML = typingHTML();
  let started = false;
  const text = await stream(prompt, (acc) => {
    if (!started && acc.trim()) { started = true; }
    if (started) { bubbleEl.innerHTML = escapeHTML(acc) + `<span class="caret"></span>`; onChunk && onChunk(acc); }
  }).catch((e) => (e && e.message === 'SETUP' ? 'SETUP' : null));
  if (text === 'SETUP') {
    bubbleEl.innerHTML = 'Necesito mi cerebro 🧠 Toca el botón 🧠 de arriba y pega tu clave de Gemini (¡es gratis!).';
    return null;
  }
  if (text == null) {
    bubbleEl.innerHTML = '¡Ups! No pude conectar con mi cerebro 😅 ¿Probamos de nuevo?';
    return null;
  }
  bubbleEl.innerHTML = escapeHTML(text);
  return text;
}

export function escapeHTML(s) {
  return String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/* Confeti alegre. */
export function confetti(n = 90) {
  const colors = ['#7C5BFF', '#5FE0C7', '#FF8FA3', '#F6C36B', '#5AC8FA', '#C58BFF'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    p.style.animationDelay = (Math.random() * .3) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}

/* Voz (Web Speech API) — opcional, se activa/desactiva. */
let voiceOn = true;
export function setVoice(on) { voiceOn = on; if (!on) window.speechSynthesis?.cancel(); }
export function speak(text) {
  if (!voiceOn || !('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''));
    u.lang = 'es-ES'; u.rate = 1; u.pitch = 1.15;
    const v = window.speechSynthesis.getVoices().find(v => /es/i.test(v.lang));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {}
}
