/* Pizarrón de gráficos — PRIMERA parada de la clase (antes del quest).
   3 zonas: MIRA pegada a la IZQUIERDA · pizarrón GRANDE centrado ·
   chat a la DERECHA (la voz de MIRA vive en el chat, la muñeca NO
   lleva globos). El alumno VE la info en gráficos (mental/conceptual/
   flujo), toca ideas (MIRA explica y expande), agrega las suyas, marca
   lo que ya sabe, dibuja con crayón para que MIRA lo VEA, y en el chat
   le pide a MIRA que genere nuevos diagramas sobre CUALQUIER tema.
   Al terminar → "Pasar a quest" (los 3 retos en teach.js). */
import { state, pushTurn, bumpProgress } from '../state.js';
import { KID_STYLE, askImage, askJSON } from '../engine.js';
import { addFiles } from '../materials.js';
import { miraPortrait, setMood, speak, streamBubble, escapeHTML, confetti, typingHTML } from '../mira.js';
import { KINDS, makeBoardModel, fetchNodeDetail, fetchIdeaVerdict } from '../mindmap.js';
import { renderBoard } from '../board.js';
import { fetchBoard, fetchDiagram } from '../activities.js';
import { fetchGames, popStar } from '../games.js';
import { questPre } from '../prefetch.js';
import { sfx } from '../sfx.js';

export function mindmap(app, screen) {
  state.role = 'teacher';
  const models = {};       // modelo cacheado por tipo (posiciones, ideas y crayón incluidos)
  let kind = 'mental';
  let board = null;
  let boardTopic = state.topic;  // tema del pizarrón (el chat puede cambiarlo)
  let ideaStar = false;    // ⭐ solo por la primera idea propia que encaja
  let mapStar = false;     // ⭐ solo una vez por saberse todo un mapa
  let fetchSeq = 0;

  screen.innerHTML = `
    <div class="board3">
      <!-- IZQUIERDA · MIRA (sin globos: su voz va al chat) -->
      <div class="board3__mira">
        ${miraPortrait({ role: 'teacher', mood: 'idea', showMood: false })}
        <div class="chip chip--role">🎓 Rol: Profesora</div>
      </div>

      <!-- CENTRO · pizarrón grande -->
      <div class="board3__center">
        <div class="board3__topbar">
          <div class="mmap-tabs" id="tabs"></div>
          <span class="board3__topic" id="boardTopic"></span>
        </div>
        <div id="boardHost" class="board3__host"></div>
        <div class="mmap-actions" id="mapActions"></div>
        <div id="controls" class="choices board3__controls"></div>
      </div>

      <!-- DERECHA · chat con MIRA -->
      <div class="board3__chat">
        <div class="chat__head">💬 Habla con MIRA · pídele diagramas</div>
        <div class="chat__log" id="chatLog"></div>
        <div class="chat__field">
          <input type="file" id="chatFile" hidden multiple accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.docx,.pptx">
          <button class="chat__attach" id="chatAttach" title="Adjuntar apuntes">📎</button>
          <input id="chatInput" type="text" maxlength="120" placeholder="Escríbeme o adjunta tus apuntes…" autocomplete="off">
          <button class="chat__send" id="chatSend" title="Enviar">➜</button>
        </div>
      </div>
    </div>`;

  const controls = () => screen.querySelector('#controls');
  const boardHost = () => screen.querySelector('#boardHost');
  const topicLabel = () => screen.querySelector('#boardTopic');
  const scrollChat = () => { const l = screen.querySelector('#chatLog'); l.scrollTop = l.scrollHeight; };

  // ⚡ PREFETCH del quest mientras el alumno explora (sobre el tema de la clase)
  questPre.board = fetchBoard(state.topic).catch(() => null);
  questPre.diagram = questPre.board.then(() => fetchDiagram(state.topic)).catch(() => null);
  questPre.games = questPre.diagram.then(() => fetchGames(state.topic, 3)).catch(() => []);

  // Botones de abajo (centro)
  control([
    { label: '🔁 Hazme otro', cls: 'btn--ghost', on: () => showKind(kind, true) },
    { label: 'Pasar a quest →', cls: 'btn--primary', on: () => app.go('teach') },
  ]);

  initChat();

  // ---- Intro de MIRA (acepta rol + avisa cambio) EN EL CHAT, y dibuja ----
  (async function intro() {
    setMood(screen, 'excited');
    const base = state.base === 'yes' ? 'El estudiante ya tiene algo de base.' : 'El estudiante empieza desde cero.';
    const el = miraTyping();
    const txt = await streamBubble(el,
      `${KID_STYLE}\nEres la PROFESORA de "${state.topic}". En 2-3 frases: (1) acepta el rol con alegría, (2) avisa que al final cambiarán de roles (el estudiante te enseñará a ti), (3) di que dibujaste el tema en tu pizarra para verlo juntos y que puede pedirte más diagramas por aquí. ${base}`,
      { onChunk: scrollChat });
    pushTurn('mira', txt || ''); bumpProgress(8);
    showKind('mental');
  })();

  /* ---- pestañas: mental / conceptual / flujo ---- */
  function renderTabs() {
    const tabs = screen.querySelector('#tabs');
    tabs.innerHTML = Object.entries(KINDS).map(([id, v]) =>
      `<button class="mtab${id === kind ? ' is-on' : ''}" data-k="${id}">${v.emoji} ${v.label}</button>`).join('');
    tabs.querySelectorAll('.mtab').forEach(b =>
      b.addEventListener('click', () => { if (b.dataset.k !== kind) showKind(b.dataset.k); }));
  }

  async function showKind(k, force = false) {
    if (board && models[kind]) models[kind].ink = board.inkURL(); // conserva el crayón al cambiar
    kind = k; renderTabs();
    topicLabel().textContent = boardTopic && boardTopic !== state.topic ? `· ${boardTopic}` : '';
    if (force) models[k] = null;
    if (!models[k]) {
      const my = ++fetchSeq;
      setMood(screen, 'thinking');
      board = null;
      boardHost().innerHTML = thinkingCard(`dibujando tu ${KINDS[k].label.toLowerCase()}…`);
      renderActions(null);
      const model = await makeBoardModel(k, boardTopic);
      if (my !== fetchSeq || kind !== k) return;   // cambió de pestaña mientras tanto
      if (!model) {
        boardHost().innerHTML = '';
        miraSay(`Mi pizarra se atoró con ese ${KINDS[k].label.toLowerCase()} 😅 ¡Inténtalo de nuevo o prueba otra pestaña!`);
        setMood(screen, 'encouraging');
        return;
      }
      models[k] = model;
      pushTurn('mira', `Dibujé un ${KINDS[k].label} de ${boardTopic} en la pizarra`);
      bumpProgress(4);
    }
    mountBoard();
  }

  function mountBoard() {
    const m = models[kind];
    board = renderBoard(boardHost(), m, { onSelect: renderActions, onSee: lookBoard, ink: m.ink || null });
    renderActions(null);
    setMood(screen, 'excited');
  }

  /* ---- barra de acciones sobre el nodo seleccionado ---- */
  function renderActions(n) {
    const bar = screen.querySelector('#mapActions');
    if (!bar) return;
    if (!n) {
      bar.innerHTML = `<span class="mmap-actions__tip">Toca una idea de la pizarra para jugar con ella 👆</span>`;
      return;
    }
    bar.innerHTML = `
      <span class="mmap-actions__node">${n.emoji ? escapeHTML(n.emoji) + ' ' : ''}${escapeHTML(n.text)}</span>
      <button class="btn btn--ghost" id="aExplain">🔍 Explícame</button>
      <button class="btn btn--ghost" id="aAdd">✏️ Mi idea</button>
      ${n.type !== 'center' && !n.learned ? '<button class="btn btn--mint" id="aKnow">✅ ¡Ya me lo sé!</button>' : ''}`;
    bar.querySelector('#aExplain').addEventListener('click', () => explain(n));
    bar.querySelector('#aAdd').addEventListener('click', () => ideaUI(n));
    bar.querySelector('#aKnow')?.addEventListener('click', () => know(n));
  }

  /* ---- 🔍 MIRA explica el nodo (en el chat) y lo expande con sub-ideas ---- */
  async function explain(n) {
    setMood(screen, 'thinking');
    const el = miraTyping();
    const d = await fetchNodeDetail(boardTopic, n.text);
    const txt = String(d?.explica || 'Esa es una de las ideas clave de hoy 💜').trim();
    miraFill(el, txt); speak(txt);
    pushTurn('kid', 'Explícame: ' + n.text); pushTurn('mira', txt);
    const nuevas = (d?.nuevas || []).map(String).filter(Boolean).slice(0, 2);
    if (nuevas.length && board) { board.addChildren(n.id, nuevas); sfx.pop(); }
    setMood(screen, 'idea');
    bumpProgress(3);
  }

  /* ---- ✏️ el niño agrega su propia idea a la pizarra ---- */
  function ideaUI(n) {
    const bar = screen.querySelector('#mapActions');
    bar.innerHTML = `
      <div class="field field--map">
        <input id="ideaInput" maxlength="46" placeholder="Escribe tu idea para «${escapeHTML(n.text)}»…">
        <button class="field__send" id="ideaSend">➜</button>
      </div>`;
    const input = bar.querySelector('#ideaInput');
    input.focus();
    const send = () => { const v = input.value.trim(); if (v) sendIdea(n, v); };
    bar.querySelector('#ideaSend').addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  }

  async function sendIdea(n, idea) {
    const target = (n.type === 'leaf' && board.getNode(n.parent)) || n;
    board.addChildren(target.id, [idea], { mine: true });
    sfx.pop(); board.deselect();
    pushTurn('kid', 'Mi idea para la pizarra: ' + idea);
    setMood(screen, 'thinking');
    const el = miraTyping();
    const v = await fetchIdeaVerdict(boardTopic, target.text, idea);
    const ok = v?.encaja === true || v?.encaja === 'true';
    const txt = String(v?.comentario || (ok ? '¡Tu idea encaja perfecto! 🤩' : '¡Me encanta que pienses! Aunque esa idea no va tanto aquí 💜')).trim();
    miraFill(el, txt); speak(txt); pushTurn('mira', txt);
    if (ok) {
      setMood(screen, 'celebratory');
      if (!ideaStar) { ideaStar = true; popStar(boardHost().firstElementChild || boardHost()); }
      else sfx.ding();
    } else {
      setMood(screen, 'encouraging');
    }
    bumpProgress(4);
  }

  /* ---- ✅ marca el nodo como aprendido ---- */
  function know(n) {
    board.markLearned(n.id);
    sfx.ding(); setMood(screen, 'proud');
    renderActions(n);
    const s = board.stats();
    if (s.learned >= s.total && !mapStar) {
      mapStar = true;
      confetti(90); setMood(screen, 'celebratory');
      popStar(boardHost().firstElementChild || boardHost());
      miraSay('¡¿Te sabes TODO?! 🤯 ¡Eres increíble!'); speak('¡Te sabes todo!');
      bumpProgress(8);
    }
  }

  /* ---- 👀 MIRA ve lo que el niño escribió/dibujó (visión) → responde en el chat ---- */
  async function lookBoard() {
    if (!board?.hasInk()) {
      setMood(screen, 'curious');
      miraSay('Primero toca ✏️ Dibujar y escribe o dibuja algo en la pizarra… ¡y luego me lo enseñas con 👀!');
      return;
    }
    setMood(screen, 'curious');
    const el = miraTyping();
    pushTurn('kid', '(le enseñé a MIRA lo que dibujé en la pizarra)');
    const reply = await askImage(
      `${KID_STYLE}
Eres MIRA mirando la PIZARRA COMPARTIDA de la clase de "${boardTopic}". La imagen muestra un ${KINDS[kind].label} que dibujaste tú, y ENCIMA están los trazos morados que el ESTUDIANTE escribió o dibujó a mano con su crayón.
Reacciona en 2-3 frases: di qué ves en lo que escribió/dibujó el estudiante, coméntalo respecto al tema (corrige con cariño si hace falta) y termina animándolo.`,
      board.snapshot());
    const txt = String(reply || '¡Me encanta lo que hiciste en la pizarra! 💜').trim();
    miraFill(el, txt); speak(txt); pushTurn('mira', txt);
    setMood(screen, 'surprised');
    setTimeout(() => setMood(screen, 'happy'), 1800);
    bumpProgress(5);
  }

  /* ======================= CHAT (voz de MIRA) ======================= */
  function initChat() {
    const input = screen.querySelector('#chatInput');
    const send = () => { const v = input.value.trim(); if (v) { input.value = ''; chatSend(v); } };
    screen.querySelector('#chatSend').addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    // 📎 adjuntar apuntes directo desde el chat
    const fileInput = screen.querySelector('#chatFile');
    screen.querySelector('#chatAttach').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => { attachFiles(e.target.files); fileInput.value = ''; });
    miraSay('¡Pídeme lo que quieras! Ej: «hazme un diagrama de flujo del ciclo del agua», o adjunta tus apuntes con 📎 💜');
  }

  /* El estudiante adjunta apuntes/fotos/PDF desde el chat → MIRA los LEE
     (texto/pdf/visión) y confirma en el chat según cómo le fue. */
  function attachFiles(list) {
    const files = Array.from(list || []);
    if (!files.length) return;
    const names = files.map(f => f.name);
    names.forEach(n => addChatMsg('kid', '📎 ' + n));
    pushTurn('kid', 'Adjunté material: ' + names.join(', '));
    const holder = miraTyping();   // "leyendo…" mientras procesa (visión/pdf pueden tardar)
    setMood(screen, 'thinking');
    addFiles(files, (results) => {
      const ok = results.filter(r => r && r.status === 'ready');
      const bad = results.filter(r => r && (r.status === 'error' || r.status === 'unsupported'));
      let msg;
      if (ok.length && !bad.length) {
        msg = ok.length > 1
          ? `¡Listo! Ya leí tus ${ok.length} archivos 📚 ¿Quieres que te arme un diagrama con eso?`
          : `¡Listo! Ya leí «${ok[0].name}» 📚 ¿Quieres que te arme un diagrama con eso?`;
      } else if (ok.length && bad.length) {
        msg = `Leí ${ok.length} archivo(s) ✅, pero no pude con ${bad.map(b => '«' + b.name + '»').join(', ')} (súbelo como PDF, imagen o texto).`;
      } else {
        msg = `No pude leer ${bad.map(b => '«' + b.name + '»').join(', ')} 😅 Súbelo como PDF, imagen o texto.`;
      }
      miraFill(holder, msg); pushTurn('mira', msg);
      setMood(screen, ok.length ? 'happy' : 'encouraging');
      if (ok.length) sfx.pop();
    });
  }

  /* Agrega un mensaje al log; devuelve el elemento (para actualizar el "typing"). */
  function addChatMsg(who, text, typing = false) {
    const log = screen.querySelector('#chatLog');
    const el = document.createElement('div');
    el.className = 'chat__msg chat__msg--' + (who === 'mira' ? 'mira' : 'kid');
    el.innerHTML = typing ? typingHTML() : escapeHTML(text);
    log.appendChild(el);
    scrollChat();
    return el;
  }
  function setChatMsg(el, text) { el.innerHTML = escapeHTML(text); scrollChat(); }

  // atajos de narración de MIRA en el chat (declaradas → hoisted, se usan arriba)
  function miraTyping() { return addChatMsg('mira', '', true); }
  function miraFill(el, text) { setChatMsg(el, text); }
  function miraSay(text) { return addChatMsg('mira', text); }

  async function chatSend(text) {
    addChatMsg('kid', text);
    pushTurn('kid', text);
    const holder = miraTyping();
    setMood(screen, 'thinking');
    const data = await askJSON(
      `${KID_STYLE}
Eres MIRA en tu pizarra interactiva (clase de "${state.topic}"). El estudiante te escribe en el chat: "${text}".
Contéstale como su tutora en 1-2 frases. Si te pide VER, DIBUJAR o GENERAR un diagrama/mapa/esquema de algún tema (el de la clase u otro), márcalo para dibujarlo en la pizarra.
Devuelve SOLO JSON: {"reply":"tu respuesta corta","diagram":{"make":true,"topic":"tema del diagrama","kind":"mental|conceptual|flujo"}}
Si NO pide un diagrama, usa "diagram":{"make":false}. Sin markdown.`);
    const reply = String(data?.reply || '¡Claro! 💜').trim();
    miraFill(holder, reply); pushTurn('mira', reply);
    const dg = data?.diagram;
    if (dg && (dg.make === true || dg.make === 'true')) {
      const k = KINDS[dg.kind] ? dg.kind : 'mental';
      boardTopic = String(dg.topic || boardTopic).trim();
      Object.keys(models).forEach(key => delete models[key]);  // pizarra nueva
      kind = k;
      setMood(screen, 'idea');
      await showKind(k, true);
      miraSay(`Listo, ahí tienes tu ${KINDS[k].label.toLowerCase()} de «${boardTopic}» 👆`);
      sfx.sparkle();
    } else {
      setMood(screen, 'happy');
    }
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

  function thinkingCard(txt = 'pensando…') {
    return `<div class="card" style="display:inline-flex;gap:10px;align-items:center;color:var(--ink-mute);"><span class="typing"><i></i><i></i><i></i></span> ${txt}</div>`;
  }
}
