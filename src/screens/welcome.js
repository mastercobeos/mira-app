/* Frame 1 — ¡Hola! Soy MIRA. Se presenta con audio + texto. */
import { miraPortrait, speak } from '../mira.js';

const GREETING = '¡Hola! Soy MIRA 💜 ¡Estoy muy feliz de acompañarte hoy!';

const PILLARS = [
  { ic: '💬', t: 'Explica de mil formas', d: 'Ejemplos, analogías, dibujos y más.' },
  { ic: '😊', t: 'Se adapta a ti', d: 'A tu ritmo, tu nivel y tus dudas.' },
  { ic: '🎮', t: 'Juegos para aprender', d: 'Quiz, retos y estrellas ⭐ en cada clase.' },
  { ic: '🔄', t: 'Cambio de roles', d: 'Aprendes con ella y luego la ayudas.' },
];

export function welcome(app, screen) {
  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'learner', mood: 'excited', showMood: false })}</div>
      <div class="act__body">
        <div class="screen__eyebrow">✨ Tu compañera para aprender jugando</div>
        <h1 class="screen__title">Aprender no es aburrido.<br>¡Es una aventura! 🚀</h1>
        <div class="bubble left bubble--audio" style="max-width:none;">${GREETING}</div>
        <button class="btn btn--primary btn--lg btn--pulse" id="startBtn">▶ ¡A JUGAR!</button>
        <div class="pillars">
          ${PILLARS.map(p => `
            <div class="pillar"><div class="ic">${p.ic}</div><div class="t">${p.t}</div><div class="d">${p.d}</div></div>
          `).join('')}
        </div>
      </div>
    </div>`;

  // Presentación por voz (frame 1: audio + texto)
  setTimeout(() => speak(GREETING), 350);

  screen.querySelector('#startBtn').addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    app.go('topic');
  });
}
