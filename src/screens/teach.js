/* Frames 6-10 — MIRA PROFESORA:
   6 acepta rol + avisa cambio · 7 contextualiza · 8 pizarrón ·
   9 apoyo visual · 10 checkpoint (¿todo claro?). Luego → resumen. */
import { state, pushTurn, contextText, bumpProgress } from '../state.js';
import { KID_STYLE } from '../engine.js';
import { miraPortrait, bubble, setMood, streamBubble, speak, escapeHTML } from '../mira.js';
import { fetchGames, playGames, starsChipHTML, popStar } from '../games.js';
import { fetchBoard, renderBoardGame, fetchDiagram, renderDiagramGame } from '../activities.js';
import { sfx } from '../sfx.js';

export function teach(app, screen) {
  state.role = 'teacher';
  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'teacher', mood: 'happy' })}</div>
      <div class="act__body" style="width:100%;">
        <div class="chip chip--role" style="align-self:flex-start;">🎓 Rol: Profesora</div>
        <div class="screen__eyebrow" id="beatTag">Clase sobre ${escapeHTML(state.topic)}</div>
        ${bubble('', { left: true, id: 'say' })}
        <div id="content" style="width:100%;"></div>
        <div id="controls" class="choices"></div>
      </div>
    </div>`;

  const say = () => screen.querySelector('#say');
  const content = () => screen.querySelector('#content');
  const controls = () => screen.querySelector('#controls');
  const tag = (t) => screen.querySelector('#beatTag').textContent = t;

  // ---- Beat 6: acepta rol + avisa cambio ----
  (async function beatAccept() {
    tag('¡Empecemos! 🎓');
    setMood(screen, 'excited');
    const txt = await streamBubble(say(),
      `${KID_STYLE}\nEres la PROFESORA de "${state.topic}". En 2 frases: acepta el rol con alegría y AVISA que al final de la sesión cambiarán de roles (tú le enseñarás a ella). No expliques el tema todavía.`);
    speak(txt); pushTurn('mira', txt || '');
    control([{ label: 'Empecemos ✨', cls: 'btn--primary', on: beatContext }]);
  })();

  // ---- Beat 7: contexto rapidísimo → directo al primer reto ----
  async function beatContext() {
    tag('Reto 1 de 3 🖍️'); setMood(screen, 'happy'); content().innerHTML = ''; controls().innerHTML = '';
    const base = state.base === 'yes' ? 'El estudiante ya tiene algo de base.' : 'El estudiante empieza desde cero.';
    const txt = await streamBubble(say(),
      `${KID_STYLE}\nEn UNA sola frase emocionante di qué van a descubrir sobre "${state.topic}". ${base} Termina con "¡Vamos!"`);
    speak(txt); pushTurn('mira', txt || ''); bumpProgress(10);
    setTimeout(beatBoard, 1200); // sin botón: la clase fluye sola al primer reto
  }

  // ---- RETO 1: pizarra mágica (el niño completa los huecos) ----
  async function beatBoard() {
    tag('Reto 1 · Pizarra mágica 🖍️'); setMood(screen, 'thinking');
    say().innerHTML = 'Reto 1: ¡completa mi pizarra mágica con las palabras correctas! 🖍️';
    speak('¡Reto uno! Completa mi pizarra mágica');
    content().innerHTML = thinkingCard();
    controls().innerHTML = '';
    const data = await fetchBoard(state.topic);
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
    const data = await fetchDiagram(state.topic);
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
    const games = await fetchGames(state.topic, 3);
    if (!games.length) { beatCheck(); return; } // sin juegos: seguir el flujo
    const mira = { mood: m => setMood(screen, m) };
    playGames(content(), games, mira, (hits) => {
      bumpProgress(20);
      setMood(screen, hits === games.length ? 'celebratory' : 'proud');
      const msg = hits === games.length
        ? `¡PERFECTO! ${hits} de ${games.length} a la primera 🤩 ¡Eres increíble!`
        : `¡Muy bien! Ganaste tus estrellas ⭐ ¡Sigamos!`;
      say().innerHTML = escapeHTML(msg); speak(msg);
      content().innerHTML = `<div style="display:flex;align-items:center;gap:12px;">${starsChipHTML()}</div>`;
      control([{ label: 'Seguir ✅', cls: 'btn--primary', on: beatCheck }]);
    });
  }

  // ---- Beat 10: checkpoint ----
  function beatCheck() {
    tag('¿Todo claro? 🙂'); setMood(screen, 'happy'); content().innerHTML = '';
    say().innerHTML = '¿Hasta aquí todo claro? 🙂';
    speak('¿Hasta aquí todo claro?');
    control([
      { label: '✅ Sí, todo claro', cls: 'btn--mint', on: () => { bumpProgress(15); app.go('summary'); } },
      { label: '🤔 Tengo dudas', cls: 'btn--ghost', on: () => explainAgain(beatCheck) },
    ]);
  }

  // ---- Explicar de otra forma (disponible toda la sesión) ----
  async function explainAgain(back) {
    setMood(screen, 'surprised');                       // "¡oh! ¿no quedó claro?"
    setTimeout(() => setMood(screen, 'thinking'), 1400); // …y se pone a pensar otra forma
    controls().innerHTML = '';
    const txt = await streamBubble(say(),
      `${KID_STYLE}\nEl estudiante no entendió bien "${state.topic}". Explícalo de OTRA forma distinta (otra analogía o ejemplo más simple), en 2 frases.\nContexto:\n${contextText()}`);
    speak(txt); pushTurn('mira', txt || '');
    control([{ label: 'Ahora sí, seguir ✅', cls: 'btn--primary', on: back }]);
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
