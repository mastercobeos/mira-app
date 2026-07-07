/* EL QUEST — los 3 retos de la clase (después del pizarrón de gráficos):
   Reto 1 pizarra mágica · Reto 2 diagrama de nodos · Reto 3 minijuegos.
   Los retos vienen prefetcheados desde el pizarrón (prefetch.js) para
   aparecer al instante. Al terminar → resumen. */
import { state, pushTurn, bumpProgress } from '../state.js';
import { miraPortrait, bubble, setMood, speak, escapeHTML } from '../mira.js';
import { fetchGames, playGames, starsChipHTML, popStar } from '../games.js';
import { fetchBoard, renderBoardGame, fetchDiagram, renderDiagramGame } from '../activities.js';
import { questPre } from '../prefetch.js';
import { sfx } from '../sfx.js';

export function teach(app, screen) {
  state.role = 'teacher';
  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'teacher', mood: 'happy' })}</div>
      <div class="act__body" style="width:100%;">
        <div class="chip chip--role" style="align-self:flex-start;">🎓 Rol: Profesora</div>
        <div class="screen__eyebrow" id="beatTag">Quest sobre ${escapeHTML(state.topic)}</div>
        ${bubble('', { left: true, id: 'say' })}
        <div id="content" style="width:100%;"></div>
        <div id="controls" class="choices"></div>
      </div>
    </div>`;

  const say = () => screen.querySelector('#say');
  const content = () => screen.querySelector('#content');
  const controls = () => screen.querySelector('#controls');
  const tag = (t) => screen.querySelector('#beatTag').textContent = t;

  /* ⚡ Retos ya prefetcheados en el pizarrón; si no (navegación directa),
     los generamos aquí en cadena. */
  const pre = {};
  if (questPre.board) {
    pre.board = questPre.board; pre.diagram = questPre.diagram; pre.games = questPre.games;
  } else {
    pre.board = fetchBoard(state.topic).catch(() => null);
    pre.diagram = pre.board.then(() => fetchDiagram(state.topic)).catch(() => null);
    pre.games = pre.diagram.then(() => fetchGames(state.topic, 3)).catch(() => []);
  }

  // Arranca directo en el primer reto (la intro ya la dio en el pizarrón).
  beatBoard();

  // ---- RETO 1: pizarra mágica (el niño completa los huecos) ----
  async function beatBoard() {
    tag('Reto 1 · Pizarra mágica 🖍️'); setMood(screen, 'thinking');
    say().innerHTML = 'Reto 1: ¡completa mi pizarra mágica con las palabras correctas! 🖍️';
    speak('¡Reto uno! Completa mi pizarra mágica');
    content().innerHTML = thinkingCard();
    controls().innerHTML = '';
    const data = await pre.board;
    if (!data) { beatDiagram(); return; }
    setMood(screen, 'curious');
    const mira = { mood: m => setMood(screen, m) };
    renderBoardGame(content(), data, mira, () => {
      popStar(content().firstElementChild || content());
      pushTurn('mira', 'Pizarra completada sobre ' + state.topic);
      bumpProgress(20); sfx.whoosh();
      say().innerHTML = '¡Pizarra completa! 🌟 Ahora… ¡el diagrama de nodos!';
      speak('¡Pizarra completa! Ahora el diagrama');
      setTimeout(beatDiagram, 1500); // auto-avanza al siguiente reto
    });
  }

  // ---- RETO 2: diagrama de nodos (arrastrar y soltar) ----
  async function beatDiagram() {
    tag('Reto 2 · Nodos 🧩'); setMood(screen, 'idea');
    say().innerHTML = 'Reto 2: ¡arrastra cada nodo a su lugar! 🧩';
    speak('¡Reto dos! Arrastra cada nodo a su lugar');
    content().innerHTML = thinkingCard();
    controls().innerHTML = '';
    const data = await pre.diagram;
    if (!data) { beatGames(); return; }
    setMood(screen, 'curious');
    const mira = { mood: m => setMood(screen, m) };
    renderDiagramGame(content(), data, mira, (perfect) => {
      popStar(content().firstElementChild || content());
      pushTurn('mira', 'Diagrama de nodos armado sobre ' + state.topic);
      bumpProgress(20); sfx.whoosh();
      say().innerHTML = perfect ? '¡Diagrama PERFECTO a la primera! 🤯 Último reto…' : '¡Diagrama armado! 💪 Último reto…';
      speak(perfect ? '¡Perfecto a la primera!' : '¡Diagrama armado!');
      setTimeout(beatGames, 1500);
    });
  }

  // ---- RETO 3: minijuegos (quiz / V-F / ordenar / parejas / completar) ----
  async function beatGames() {
    tag('Reto 3 · Minijuegos 🎮'); setMood(screen, 'idea');
    say().innerHTML = 'Reto final: ¡3 minijuegos! 🎮 ¿Cuántas estrellas sacarás?';
    speak('¡Reto final! Tres minijuegos');
    content().innerHTML = `<div class="card" style="display:inline-flex;gap:10px;align-items:center;color:var(--ink-mute);"><span class="typing"><i></i><i></i><i></i></span> preparando los juegos…</div>`;
    controls().innerHTML = '';
    const games = (await pre.games) || [];
    if (!games.length) { app.go('summary'); return; } // sin juegos: al resumen
    const mira = { mood: m => setMood(screen, m) };
    playGames(content(), games, mira, (hits) => {
      bumpProgress(20);
      setMood(screen, hits === games.length ? 'celebratory' : 'proud');
      const msg = hits === games.length
        ? `¡PERFECTO! ${hits} de ${games.length} a la primera 🤩 ¡Eres increíble!`
        : `¡Muy bien! Ganaste tus estrellas ⭐ ¡Sigamos!`;
      say().innerHTML = escapeHTML(msg); speak(msg);
      content().innerHTML = `<div style="display:flex;align-items:center;gap:12px;">${starsChipHTML()}</div>`;
      control([
        { label: '📋 Ver mi resumen de lo aprendido', cls: 'btn--primary', on: () => app.go('summary') },
        { label: '🏠 Volver al inicio', cls: 'btn--ghost', on: () => app.restart() },
      ]);
    });
  }

  function control(list) {
    controls().innerHTML = '';
    list.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.cls || 'btn--ghost');
      btn.textContent = b.label;
      btn.addEventListener('click', b.on);
      controls().appendChild(btn);
    });
  }
}

/* ---------- helpers ---------- */
function thinkingCard() {
  return `<div class="card" style="display:inline-flex;gap:10px;align-items:center;color:var(--ink-mute);">
    <span class="typing"><i></i><i></i><i></i></span> preparando…</div>`;
}
