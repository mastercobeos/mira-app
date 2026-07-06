/* Frame 5 — ¿Qué rol quieres que tenga yo contigo? Profesora / Aprendiz. */
import { state, save } from '../state.js';
import { miraPortrait, bubble, speak } from '../mira.js';

export function role(app, screen) {
  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'learner', mood: 'happy' })}</div>
      <div class="act__body">
        <div class="screen__eyebrow">🎮 Paso 3 · ¿Cómo jugamos?</div>
        <h2 class="screen__title">¿Quién enseña hoy? 🤔</h2>
        ${bubble('¿Qué rol quieres que tenga contigo? ¡Puedes cambiarlo cuando quieras! 🔄', { left: true })}
        <div class="roles">
          <button class="role-card role-card--teacher" data-role="teacher">
            <div class="role-card__ic">🎓</div>
            <div class="role-card__name">MIRA es la profe</div>
            <div class="role-card__desc">Ella te explica y te hace preguntas divertidas.</div>
          </button>
          <button class="role-card" data-role="learner">
            <div class="role-card__ic">🐣</div>
            <div class="role-card__name">Tú eres la profe</div>
            <div class="role-card__desc">Tú le explicas a MIRA y ella aprende de ti.</div>
          </button>
        </div>
      </div>
    </div>`;

  speak('¿Qué rol quieres que tenga contigo?');

  screen.querySelectorAll('[data-role]').forEach(b =>
    b.addEventListener('click', () => {
      state.role = b.dataset.role; save();
      // Si eliges que TÚ eres la profe, MIRA arranca como aprendiz;
      // si MIRA es la profe, va al PIZARRÓN de gráficos (y de ahí al quest).
      app.go(b.dataset.role === 'teacher' ? 'mindmap' : 'learner');
    }));
}
