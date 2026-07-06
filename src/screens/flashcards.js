/* ============================================================
   MIRA · Flashcards — tarjetas de estudio para reforzar.
   MIRA genera pregunta/respuesta del tema (usando también el
   material subido) y el estudiante las repasa: voltear, marcar
   "ya me la sé" o "repasar", y ver su puntaje al final.
   ============================================================ */

import { state, contextText } from '../state.js';
import { KID_STYLE, askJSON } from '../engine.js';
import { miraPortrait, setMood, speak, escapeHTML, confetti } from '../mira.js';
import { sfx } from '../sfx.js';

export function flashcards(app, screen) {
  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'teacher', mood: 'excited', showMood: false })}</div>
      <div class="act__body" style="width:100%;">
        <div class="screen__eyebrow">📇 Tarjetas de estudio</div>
        <h2 class="screen__title">Repasemos "${escapeHTML(state.topic || 'tu tema')}" 💪</h2>
        <div id="fcHost" style="width:100%;"></div>
      </div>
    </div>`;
  const host = screen.querySelector('#fcHost');
  host.innerHTML = `<div class="card fc-loading"><span class="typing"><i></i><i></i><i></i></span> preparando tus tarjetas…</div>`;

  (async function build() {
    const data = await askJSON(
      `${KID_STYLE}\nCrea tarjetas de estudio (flashcards) sobre "${state.topic}".\nDevuelve SOLO JSON: {"tarjetas":[{"p":"pregunta corta","r":"respuesta corta y clara"}]}\nEntre 5 y 8 tarjetas. Preguntas de repaso reales del tema (definiciones, ejemplos, pasos). Cada respuesta máx 2 frases. Sin markdown.\nContexto de la clase:\n${contextText(10)}`);
    let cards = (data?.tarjetas || []).filter(c => c && c.p && c.r).slice(0, 8);
    if (!cards.length) {
      host.innerHTML = `<div class="card">No pude armar las tarjetas ahora mismo 😅</div>
        <div class="choices" style="margin-top:12px;"><button class="btn btn--primary" id="fcBack">← Volver</button></div>`;
      host.querySelector('#fcBack').addEventListener('click', () => app.go('ending'));
      return;
    }
    run(cards);
  })();

  function run(cards) {
    let i = 0, known = 0;
    const review = [];

    function draw() {
      const c = cards[i];
      setMood(screen, 'curious');
      host.innerHTML = `
        <div class="fc-progress">Tarjeta ${i + 1} de ${cards.length} · ⭐ ${known}</div>
        <div class="fc" id="fc" tabindex="0" aria-label="Tarjeta, toca para voltear">
          <div class="fc__inner">
            <div class="fc__face fc__front">
              <span class="fc__tag">Pregunta</span>
              <p>${escapeHTML(c.p)}</p>
              <span class="fc__hint">toca para ver la respuesta 👆</span>
            </div>
            <div class="fc__face fc__back">
              <span class="fc__tag">Respuesta</span>
              <p>${escapeHTML(c.r)}</p>
            </div>
          </div>
        </div>
        <div class="choices fc-actions" id="fcActions" style="margin-top:14px;visibility:hidden;">
          <button class="btn btn--ghost" id="fcReview">🔁 Repasar luego</button>
          <button class="btn btn--mint" id="fcKnow">✅ Ya me la sé</button>
        </div>`;
      const fc = host.querySelector('#fc');
      const actions = host.querySelector('#fcActions');
      let flipped = false;
      const flip = () => {
        flipped = !flipped;
        fc.classList.toggle('is-flipped', flipped);
        if (flipped) { sfx.pop(); actions.style.visibility = 'visible'; }
      };
      fc.addEventListener('click', flip);
      fc.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
      host.querySelector('#fcKnow').addEventListener('click', () => { known++; sfx.ding(); nextCard(); });
      host.querySelector('#fcReview').addEventListener('click', () => { review.push(c); sfx.whoosh(); nextCard(); });
    }

    function nextCard() {
      i++;
      if (i < cards.length) return draw();
      // si dejó tarjetas para repasar, otra vuelta con esas
      if (review.length) {
        setMood(screen, 'encouraging');
        speak('¡Vamos con las que te faltan!');
        cards = review.slice(); review.length = 0; i = 0; return draw();
      }
      finish();
    }

    function finish() {
      const total = cards.length;
      setMood(screen, 'celebratory'); confetti(90);
      speak('¡Muy bien! Terminaste tus tarjetas.');
      host.innerHTML = `
        <div class="learned">
          <h3>¡Repaso completo! 🎉</h3>
          <p style="margin:6px 0 0;font-size:16px;">Dominas <b>${known}</b> tarjetas. ¡Sigue así! 💪</p>
        </div>
        <div class="choices" style="margin-top:16px;">
          <button class="btn btn--primary" id="fcAgain">🔁 Repasar otra vez</button>
          <button class="btn btn--ghost" id="fcDone">← Volver</button>
        </div>`;
      host.querySelector('#fcAgain').addEventListener('click', () => app.go('flashcards'));
      host.querySelector('#fcDone').addEventListener('click', () => app.go('ending'));
    }

    draw();
  }
}
