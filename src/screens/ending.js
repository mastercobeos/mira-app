/* ============================================================
   MIRA · Ending — ¿qué quieres hacer ahora? Opciones al terminar
   la sesión: inicio, repasar con tarjetas, ver conversaciones o
   resúmenes anteriores, o aprender otro tema.
   ============================================================ */

import { state, archiveCurrentSession } from '../state.js';
import { miraPortrait, escapeHTML } from '../mira.js';
import { setHistoryTab } from './history.js';

export function ending(app, screen) {
  archiveCurrentSession();   // deja la sesión guardada en el historial

  const OPTIONS = [
    { ic: '📇', t: 'Repasar con tarjetas', d: 'Refuerza el tema con flashcards', cls: 'btn--mint', go: () => app.go('flashcards') },
    { ic: '📋', t: 'Resúmenes previos', d: 'Lo que has visto en cada sesión', cls: 'btn--ghost', go: () => { setHistoryTab('summaries'); app.go('history'); } },
    { ic: '💬', t: 'Conversaciones anteriores', d: 'Revive lo que hablaste con MIRA', cls: 'btn--ghost', go: () => { setHistoryTab('chats'); app.go('history'); } },
    { ic: '🔁', t: 'Aprender otro tema', d: 'Empieza una sesión nueva', cls: 'btn--ghost', go: () => app.restart() },
  ];

  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'teacher', mood: 'proud', showMood: false })}</div>
      <div class="act__body" style="width:100%;">
        <div class="screen__eyebrow">🎉 ¡Sesión completa!</div>
        <h2 class="screen__title">¿Y ahora qué hacemos?</h2>
        <div class="bubble left" style="max-width:none;">¡Gran trabajo con <b>${escapeHTML(state.topic || 'tu tema')}</b>! Elige cómo seguir 👇</div>
        <div class="end-grid">
          ${OPTIONS.map((o, i) => `
            <button class="end-opt ${o.cls}" data-i="${i}">
              <span class="end-opt__ic">${o.ic}</span>
              <span class="end-opt__t">${o.t}</span>
              <span class="end-opt__d">${o.d}</span>
            </button>`).join('')}
        </div>
        <button class="btn btn--primary" id="endHome" style="margin-top:6px;">🏠 Volver al inicio</button>
      </div>
    </div>`;

  screen.querySelectorAll('.end-opt').forEach(b =>
    b.addEventListener('click', () => OPTIONS[+b.dataset.i].go()));
  screen.querySelector('#endHome').addEventListener('click', () => app.restart());
}
