/* ============================================================
   MIRA · Landing — puerta de entrada de la app. Sencilla:
   qué es MIRA, en qué te ayuda y un CTA claro para empezar.
   La primera vez lanza el onboarding antes de la bienvenida.
   ============================================================ */

import { miraPortrait } from '../mira.js';
import { loadArchive } from '../state.js';
import { runOnboarding, hasOnboarded } from '../onboarding.js';

const FEATURES = [
  { ic: '🧠', t: 'Aprende de verdad', d: 'No te da la respuesta: te guía con preguntas y retos hasta que lo entiendes tú.' },
  { ic: '📎', t: 'Con tu propio material', d: 'Sube tus apuntes y MIRA explica el tema con lo que llevas en clase.' },
  { ic: '🔄', t: 'Enséñale y compruébalo', d: 'Al final tú le explicas a MIRA. Si se lo enseñas, es que ya lo dominas.' },
];

const STEPS = [
  { n: '1', t: 'Elige un tema', d: 'o sube tus apuntes' },
  { n: '2', t: 'Aprende jugando', d: 'retos, pizarra y ⭐' },
  { n: '3', t: 'Enséñale a MIRA', d: 'y repasa con tarjetas' },
];

export function landing(app, screen) {
  const hasHistory = loadArchive().length > 0;

  screen.innerHTML = `
    <div class="land">
      <div class="land__hero">
        <div class="land__mira">${miraPortrait({ role: 'teacher', mood: 'happy', showMood: false })}</div>
        <div class="land__intro">
          <div class="screen__eyebrow">✨ Compañera de estudio con IA</div>
          <h1 class="land__title">Estudia mejor<br>con <span>MIRA</span></h1>
          <p class="land__lead">Tu tutora inteligente que te explica cualquier tema paso a paso, se adapta a tu ritmo y te ayuda a comprobar que de verdad lo aprendiste.</p>
          <div class="land__cta choices">
            <button class="btn btn--primary btn--lg btn--pulse" id="landStart">Comenzar ahora →</button>
            ${hasHistory ? '<button class="btn btn--ghost" id="landHistory">📚 Mis sesiones</button>' : ''}
          </div>
          <div class="land__tour"><button id="landTour">▶ Ver cómo funciona</button></div>
        </div>
      </div>

      <div class="land__features">
        ${FEATURES.map(f => `
          <div class="land__feat">
            <div class="land__feat-ic">${f.ic}</div>
            <h3>${f.t}</h3>
            <p>${f.d}</p>
          </div>`).join('')}
      </div>

      <div class="land__how">
        <h2 class="land__how-title">Así funciona 👇</h2>
        <div class="land__steps">
          ${STEPS.map(s => `
            <div class="land__step">
              <div class="land__step-n">${s.n}</div>
              <div class="land__step-t">${s.t}</div>
              <div class="land__step-d">${s.d}</div>
            </div>`).join('')}
        </div>
      </div>

      <p class="land__foot">Hecho con 💜 para aprender sin aburrirte.</p>
    </div>`;

  const begin = () => {
    if (hasOnboarded()) app.go('welcome');
    else runOnboarding(() => app.go('welcome'));
  };
  screen.querySelector('#landStart').addEventListener('click', begin);
  screen.querySelector('#landTour').addEventListener('click', () => runOnboarding());
  const hist = screen.querySelector('#landHistory');
  if (hist) hist.addEventListener('click', () => app.go('history'));
}
