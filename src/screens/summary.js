/* Frames 11-13 — cierre de clase (11), Resumen de hoy (12), transición de rol (13). */
import { state, contextText, pushTurn, bumpProgress } from '../state.js';
import { KID_STYLE, askJSON } from '../engine.js';
import { miraPortrait, bubble, setMood, streamBubble, speak, escapeHTML, confetti } from '../mira.js';

export function summary(app, screen) {
  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'teacher', mood: 'proud' })}</div>
      <div class="act__body" style="width:100%;">
        <div class="chip chip--role" style="align-self:flex-start;">🎓 Rol: Profesora</div>
        <div class="screen__eyebrow" id="tag">Cerrando la clase</div>
        ${bubble('', { left: true, id: 'say' })}
        <div id="content" style="width:100%;"></div>
        <div id="controls" class="choices"></div>
      </div>
    </div>`;

  const say = () => screen.querySelector('#say');
  const content = () => screen.querySelector('#content');
  const controls = () => screen.querySelector('#controls');
  const tag = t => screen.querySelector('#tag').textContent = t;

  // Frame 11 — cierre
  (async function close11() {
    setMood(screen, 'happy');
    const txt = await streamBubble(say(),
      `${KID_STYLE}\nCierra la clase de "${state.topic}" en 2 frases: di que vieron mucho hoy y que harán un resumen final.`);
    speak(txt); pushTurn('mira', txt || '');
    controls().innerHTML = '';
    addBtn('Ver el resumen 📋', 'btn--primary', summary12);
  })();

  // Frame 12 — Resumen de hoy (cuaderno)
  async function summary12() {
    tag('Resumen de hoy 📋'); setMood(screen, 'proud');
    say().innerHTML = '¡Muy bien! Esto es lo que vimos hoy 📋';
    content().innerHTML = `<div class="card" style="max-width:460px;display:inline-flex;gap:10px;align-items:center;color:var(--ink-mute);"><span class="typing"><i></i><i></i><i></i></span> armando el resumen…</div>`;
    controls().innerHTML = '';
    const data = await askJSON(
      `${KID_STYLE}\nHaz un "Resumen de hoy" de lo que se vio sobre "${state.topic}".\nDevuelve SOLO JSON: {"puntos":["punto 1","punto 2","punto 3","punto 4"]}\n3 a 4 puntos, cada uno corto (máx 6 palabras). Sin markdown.\nContexto:\n${contextText(10)}`);
    const puntos = (data?.puntos || []).slice(0, 5);
    state.learned = puntos;
    content().innerHTML = `
      <div class="notebook">
        <h3>Resumen de hoy</h3>
        <ul style="margin:0;padding:0;">
          ${(puntos.length ? puntos : ['Lo esencial del tema']).map(p =>
            `<li><span class="tick">✓</span> ${escapeHTML(p)}</li>`).join('')}
        </ul>
      </div>`;
    speak('Este es el resumen de hoy'); bumpProgress(10);
    addBtn('¡Ahora te toca a ti! 🔄', 'btn--primary', transition13);
  }

  // Frame 13 — transición de rol (MIRA se queda a la izquierda)
  function transition13() {
    tag('¡Excelente trabajo! 🎉'); setMood(screen, 'celebratory'); confetti(70);
    say().innerHTML = 'Ahora cambiaré mi rol… ¡me toca aprender de ti! 🎓→🐣';
    content().innerHTML = `<div class="transition"><span>🎓</span><span class="arrow">→</span><span>🐣</span></div>`;
    controls().innerHTML = '';
    speak('¡Excelente trabajo! Ahora cambiaré mi rol.');
    addBtn('Ayudar a MIRA 💜', 'btn--primary btn--lg', () => app.go('learner'));
  }

  function addBtn(label, cls, on) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls; b.textContent = label; b.addEventListener('click', on);
    controls().appendChild(b);
  }
}
