/* ============================================================
   MIRA · Onboarding — tour de bienvenida la PRIMERA vez.
   Explica en pocos pasos cómo funciona la app. Se puede
   repetir desde el botón ❔ del topbar.
   ============================================================ */

const SEEN_KEY = 'mira.onboarded.v1';

const SLIDES = [
  { ic: '🎯', t: 'Elige tu tema', d: 'Escribe qué quieres aprender o <b>sube tus apuntes</b> 📎 y MIRA los usa como material.' },
  { ic: '🎓', t: 'MIRA te enseña jugando', d: 'Nada de leer y ya: cada clase son <b>retos interactivos</b> con pizarra, diagramas y estrellas ⭐.' },
  { ic: '🔄', t: 'Ahora enseñas tú', d: 'Al final los roles se cambian: <b>tú le explicas a MIRA</b> y así compruebas que de verdad lo entendiste.' },
  { ic: '📇', t: 'Repasa cuando quieras', d: 'Refuerza con <b>tarjetas de estudio</b> y revisa tus <b>resúmenes y sesiones anteriores</b> al terminar.' },
];

export function hasOnboarded() {
  try { return !!localStorage.getItem(SEEN_KEY); } catch { return false; }
}
function markSeen() { try { localStorage.setItem(SEEN_KEY, '1'); } catch {} }

/* Muestra el tour. onDone se llama al cerrar/terminar. */
export function runOnboarding(onDone) {
  const done = () => { markSeen(); back.remove(); onDone && onDone(); };

  const back = document.createElement('div');
  back.className = 'onb-back';
  back.innerHTML = `
    <div class="onb-card" role="dialog" aria-label="Cómo funciona MIRA">
      <button class="onb-skip" id="onbSkip">Saltar</button>
      <div class="onb-stage" id="onbStage"></div>
      <div class="onb-dots" id="onbDots"></div>
      <div class="onb-nav">
        <button class="btn btn--ghost" id="onbPrev" style="visibility:hidden;">← Atrás</button>
        <button class="btn btn--primary" id="onbNext">Siguiente →</button>
      </div>
    </div>`;
  document.body.appendChild(back);

  let i = 0;
  const stage = back.querySelector('#onbStage');
  const dots = back.querySelector('#onbDots');
  const prev = back.querySelector('#onbPrev');
  const next = back.querySelector('#onbNext');

  function render() {
    const s = SLIDES[i];
    stage.innerHTML = `
      <div class="onb-ic">${s.ic}</div>
      <h2 class="onb-t">${s.t}</h2>
      <p class="onb-d">${s.d}</p>`;
    stage.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease' });
    dots.innerHTML = SLIDES.map((_, k) => `<span class="onb-dot${k === i ? ' is-on' : ''}"></span>`).join('');
    prev.style.visibility = i === 0 ? 'hidden' : 'visible';
    next.textContent = i === SLIDES.length - 1 ? '¡Empezar! 🚀' : 'Siguiente →';
  }

  next.addEventListener('click', () => { if (i < SLIDES.length - 1) { i++; render(); } else done(); });
  prev.addEventListener('click', () => { if (i > 0) { i--; render(); } });
  back.querySelector('#onbSkip').addEventListener('click', done);
  render();
}
