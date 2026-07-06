/* ============================================================
   MIRA · App — máquina de estados que monta cada pantalla.
   Orden de la experiencia (los 20 frames del storyboard):
     welcome(1) → topic(2-3) → base(4) → role(5)
     → teach(6-10) → mindmap (pizarra de ideas)
     → summary(11-13) → learner(14-20)
   ============================================================ */

import { state, load, resetSession, archiveCurrentSession } from './state.js';
import { initMira } from './mira.js';
import { initSettings } from './settings.js';
import { syncMaterials, openMaterials } from './materials.js';
import { runOnboarding } from './onboarding.js';

import { landing } from './screens/landing.js';
import { welcome } from './screens/welcome.js';
import { topic }   from './screens/topic.js';
import { base }    from './screens/base.js';
import { role }    from './screens/role.js';
import { teach }   from './screens/teach.js';
import { mindmap } from './screens/mindmap.js';
import { summary } from './screens/summary.js';
import { learner } from './screens/learner.js';
import { flashcards } from './screens/flashcards.js';
import { ending }  from './screens/ending.js';
import { history } from './screens/history.js';

const SCREENS = { landing, welcome, topic, base, role, teach, mindmap, summary, learner, flashcards, ending, history };

/* Qué "paso" del indicador ilumina cada pantalla (5 dots).
   landing/flashcards/ending/history son "fuera de flujo" → sin paso activo. */
const STEP_OF = { welcome: 0, topic: 1, base: 1, role: 1, mindmap: 2, teach: 3, summary: 3, learner: 4 };
const OFF_FLOW = new Set(['landing', 'flashcards', 'ending', 'history']);
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
    this.setSteps(OFF_FLOW.has(name) ? -1 : (STEP_OF[name] ?? 0));
    this.stage.classList.toggle('stage--wide', name === 'mindmap');  // pizarrón usa más ancho
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
    archiveCurrentSession();   // guarda lo hecho antes de limpiar
    resetSession();
    syncMaterials();           // refresca badge + contexto de estudio (ya vacío)
    this.go('landing');
  },
};

function boot() {
  load();
  app.stage = document.getElementById('stage');
  syncMaterials();   // 📎 restaura contexto de estudio + badge desde la sesión guardada

  // Botón "reiniciar" del topbar
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) restartBtn.addEventListener('click', () => app.restart());

  // Botón 📎 materiales (subir apuntes en cualquier momento)
  const materialsBtn = document.getElementById('materialsBtn');
  if (materialsBtn) materialsBtn.addEventListener('click', openMaterials);

  // Botón ❔ ayuda → repetir el onboarding
  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.addEventListener('click', () => runOnboarding());

  initSettings();   // botón 🧠 + auto-abrir si está en la web sin clave
  app.go('landing');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

export { app };
