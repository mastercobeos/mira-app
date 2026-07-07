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

  // Frame 12 — Resumen de hoy (cuaderno COMPLETO: idea + explicación + dato)
  async function summary12() {
    tag('Resumen de hoy 📋'); setMood(screen, 'proud');
    say().innerHTML = '¡Muy bien! Esto es todo lo que aprendiste hoy 📋';
    content().innerHTML = `<div class="card" style="max-width:460px;display:inline-flex;gap:10px;align-items:center;color:var(--ink-mute);"><span class="typing"><i></i><i></i><i></i></span> armando tu resumen…</div>`;
    controls().innerHTML = '';
    const data = await askJSON(
      `${KID_STYLE}\nHaz el "Resumen de hoy" COMPLETO de la clase sobre "${state.topic}".\nDevuelve SOLO JSON: {"puntos":[{"t":"idea clave (máx 6 palabras)","d":"explicación clara de esa idea en 1-2 frases"}],"dato":"un dato curioso o tip útil del tema (1 frase)"}\n5 a 6 puntos que cubran TODO lo visto en la clase (conceptos, cómo funciona, ejemplos). Sin markdown.\nContexto:\n${contextText(14)}`);
    const puntos = (data?.puntos || []).filter(p => p && (p.t || p.d)).slice(0, 7);
    state.learned = puntos.map(p => String(p.t || p.d));
    content().innerHTML = `
      <div class="notebook notebook--full">
        <h3>Resumen de hoy · ${escapeHTML(state.topic)}</h3>
        <ul style="margin:0;padding:0;">
          ${(puntos.length ? puntos : [{ t: 'Lo esencial del tema', d: '' }]).map(p => `
            <li><span class="tick">✓</span>
              <span class="notebook__pt">
                <b>${escapeHTML(String(p.t || ''))}</b>
                ${p.d ? `<small>${escapeHTML(String(p.d))}</small>` : ''}
              </span>
            </li>`).join('')}
        </ul>
        ${data?.dato ? `<div class="notebook__tip">💡 ${escapeHTML(String(data.dato))}</div>` : ''}
      </div>`;
    speak('Este es tu resumen de hoy'); bumpProgress(10);
    // El cambio de rol es OPCIONAL: el estudiante decide
    addBtn('🐣 Ahora enséñale tú a MIRA', 'btn--primary', transition13);
    addBtn('🏁 Terminar por hoy', 'btn--ghost', () => app.go('ending'));
    addBtn('🏠 Inicio', 'btn--ghost', () => app.restart());
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
