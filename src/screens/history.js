/* ============================================================
   MIRA · History — historial de estudio. Dos vistas:
   · Resúmenes: lo aprendido y las ⭐ de cada sesión.
   · Conversaciones: la charla completa con MIRA.
   Lee del archivo local (state.loadArchive).
   ============================================================ */

import { loadArchive } from '../state.js';
import { miraPortrait, escapeHTML } from '../mira.js';

let _tab = 'summaries';                       // 'summaries' | 'chats'
export function setHistoryTab(t) { _tab = t; }

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export function history(app, screen) {
  const sessions = loadArchive().slice().reverse();  // más reciente primero

  screen.innerHTML = `
    <div class="hist">
      <div class="hist__head">
        <div class="act__mira hist__mira">${miraPortrait({ role: 'learner', mood: 'happy', showMood: false })}</div>
        <div>
          <div class="screen__eyebrow">📚 Tu historial</div>
          <h2 class="screen__title" style="margin:6px 0 0;">Todo lo que has estudiado</h2>
        </div>
      </div>

      <div class="hist__tabs">
        <button class="hist__tab" data-tab="summaries">📋 Resúmenes</button>
        <button class="hist__tab" data-tab="chats">💬 Conversaciones</button>
      </div>

      <div id="histBody"></div>

      <div class="choices" style="margin-top:20px;">
        <button class="btn btn--primary" id="histBack">🏠 Volver al inicio</button>
      </div>
    </div>`;

  const body = screen.querySelector('#histBody');
  const tabs = screen.querySelectorAll('.hist__tab');

  function paint() {
    tabs.forEach(t => t.classList.toggle('is-on', t.dataset.tab === _tab));
    if (!sessions.length) {
      body.innerHTML = `<div class="card hist__empty">Aún no tienes sesiones guardadas. ¡Completa una clase con MIRA y aparecerá aquí! 💜</div>`;
      return;
    }
    body.innerHTML = _tab === 'summaries' ? summariesView() : chatsView();
    if (_tab === 'chats') wireChats();
  }

  function summariesView() {
    return `<div class="hist__list">${sessions.map(s => `
      <div class="hist__card">
        <div class="hist__card-top">
          <span class="hist__topic">${escapeHTML(s.topic)}</span>
          <span class="hist__meta">${fmtDate(s.at)} · ⭐ ${s.stars || 0}</span>
        </div>
        ${(s.learned && s.learned.length)
          ? `<ul class="hist__points">${s.learned.map(p => `<li>${escapeHTML(p)}</li>`).join('')}</ul>`
          : `<p class="hist__none">Sin resumen guardado.</p>`}
      </div>`).join('')}</div>`;
  }

  function chatsView() {
    return `<div class="hist__list">${sessions.map((s, i) => `
      <div class="hist__card">
        <button class="hist__card-top hist__toggle" data-i="${i}" aria-expanded="false">
          <span class="hist__topic">${escapeHTML(s.topic)}</span>
          <span class="hist__meta">${fmtDate(s.at)} <span class="hist__caret">▾</span></span>
        </button>
        <div class="hist__chat" id="chat-${i}" hidden>
          ${(s.history && s.history.length)
            ? s.history.map(t => `
              <div class="hist__msg hist__msg--${t.who === 'mira' ? 'mira' : 'kid'}">
                <b>${t.who === 'mira' ? 'MIRA' : 'Tú'}:</b> ${escapeHTML(t.text)}
              </div>`).join('')
            : '<div class="hist__none">Sin conversación guardada.</div>'}
        </div>
      </div>`).join('')}</div>`;
  }

  function wireChats() {
    body.querySelectorAll('.hist__toggle').forEach(btn =>
      btn.addEventListener('click', () => {
        const panel = body.querySelector('#chat-' + btn.dataset.i);
        const open = !panel.hidden;
        panel.hidden = open;
        btn.setAttribute('aria-expanded', String(!open));
        btn.classList.toggle('is-open', !open);
      }));
  }

  tabs.forEach(t => t.addEventListener('click', () => { _tab = t.dataset.tab; paint(); }));
  screen.querySelector('#histBack').addEventListener('click', () => app.restart());
  paint();
}
