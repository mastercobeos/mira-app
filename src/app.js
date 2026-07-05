/* ============================================================
   MIRA · App — máquina de estados que monta cada pantalla.
   Orden de la experiencia (los 20 frames del storyboard):
     welcome(1) → topic(2-3) → base(4) → role(5)
     → teach(6-10) → summary(11-13) → learner(14-20)
   ============================================================ */

import { state, load, resetSession } from './state.js';
import { initMira } from './mira.js';
import { initSettings } from './settings.js';

import { welcome } from './screens/welcome.js';
import { topic }   from './screens/topic.js';
import { base }    from './screens/base.js';
import { role }    from './screens/role.js';
import { teach }   from './screens/teach.js';
import { summary } from './screens/summary.js';
import { learner } from './screens/learner.js';

const SCREENS = { welcome, topic, base, role, teach, summary, learner };

/* Qué "paso" del indicador ilumina cada pantalla (5 dots). */
const STEP_OF = { welcome: 0, topic: 1, base: 1, role: 1, teach: 2, summary: 3, learner: 4 };
const STEP_COUNT = 5;

/* utilidad: crea un elemento desde HTML */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const app = {
  stage: null,
  current: null,

  go(name) {
    this.current = name;
    this.setSteps(STEP_OF[name] ?? 0);
    this.stage.innerHTML = '';
    const screen = document.createElement('div');
    screen.className = 'screen';
    this.stage.appendChild(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    (SCREENS[name] || welcome)(app, screen);
    initMira(screen);   // arranca el vaivén de expresiones (cada ~2.6s)
    document.querySelectorAll('[data-stars]').forEach(el => el.textContent = state.stars); // HUD ⭐
  },

  setSteps(idx) {
    const wrap = document.getElementById('steps');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let i = 0; i < STEP_COUNT; i++) {
      const d = document.createElement('div');
      d.className = 'steps__dot' + (i === idx ? ' is-on' : i < idx ? ' is-done' : '');
      wrap.appendChild(d);
    }
  },

  restart() {
    resetSession();
    this.go('welcome');
  },
};

function boot() {
  load();
  app.stage = document.getElementById('stage');

  // Botón "reiniciar" del topbar
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) restartBtn.addEventListener('click', () => app.restart());

  initSettings();   // botón 🧠 + auto-abrir si está en la web sin clave
  app.go('welcome');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

export { app };
