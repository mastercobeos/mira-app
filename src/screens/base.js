/* Frame 4 — ¿Tienes alguna base o sabes cómo hacerlo? */
import { state, save } from '../state.js';
import { miraPortrait, bubble, setMood, speak } from '../mira.js';

export function base(app, screen) {
  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'learner', mood: 'curious' })}</div>
      <div class="act__body">
        <div class="screen__eyebrow">🐣 Paso 2 · ¡Empecemos!</div>
        <h2 class="screen__title">Antes de jugar… 🎈</h2>
        ${bubble(`Sobre <b>${escapeHTML(state.topic)}</b>… ¿ya sabes algo o empezamos desde cero? 🐣`, { left: true })}
        <div class="choices">
          <button class="btn btn--primary" data-base="yes">😎 Sí, tengo una base</button>
          <button class="btn btn--ghost" data-base="no">🐣 No, necesito ayuda</button>
        </div>
      </div>
    </div>`;

  speak('¿Ya sabes algo de este tema o empezamos desde cero?');

  screen.querySelectorAll('[data-base]').forEach(b =>
    b.addEventListener('click', () => {
      state.base = b.dataset.base; save();
      setMood(screen, 'celebratory');
      setTimeout(() => app.go('role'), 450);
    }));
}

function escapeHTML(s) { return String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
