/* Frames 14-20 — MIRA APRENDIZ:
   14 angustiada · 15 pide ayuda concreta · 16 tú explicas (escribir/hablar/dibujar)
   · 17 ¿algo más? · 18 MIRA demuestra · 19 ¿correcto? · 20 recap. */
import { state, contextText, pushTurn, bumpProgress, addStar } from '../state.js';
import { KID_STYLE, ask, askJSON, askImage } from '../engine.js';
import { miraPortrait, bubble, setMood, streamBubble, speak, escapeHTML, confetti } from '../mira.js';
import { starsChipHTML } from '../games.js';

export function learner(app, screen) {
  state.role = 'learner';
  let explanation = '';   // lo que el estudiante le explica a MIRA
  let task = '';          // lo que MIRA pide resolver/entender

  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'learner', mood: 'confused' })}</div>
      <div class="act__body" style="width:100%;">
        <div class="chip chip--role" style="align-self:flex-start;">🐣 Rol: Aprendiz</div>
        <div class="screen__eyebrow" id="tag">Ahora enseñas tú</div>
        ${bubble('', { left: true, id: 'say' })}
        <div id="content" style="width:100%;"></div>
        <div id="controls" class="choices"></div>
      </div>
    </div>`;

  const say = () => screen.querySelector('#say');
  const content = () => screen.querySelector('#content');
  const controls = () => screen.querySelector('#controls');
  const tag = t => screen.querySelector('#tag').textContent = t;

  // Frame 14-15 — angustiada + pide ayuda concreta
  (async function ask1415() {
    tag('MIRA necesita ayuda 🥺'); setMood(screen, 'confused');
    say().innerHTML = `<span class="typing"><i></i><i></i><i></i></span>`;
    const data = await askJSON(
      `${KID_STYLE}\nAhora TÚ (MIRA) eres la que no entiende "${state.topic}". Actúa como una niña angustiada que pide ayuda.\nDevuelve SOLO JSON: {"duda":"frase corta diciendo que no entiendes (1 frase)","tarea":"algo concreto y corto que pides que te ayuden a resolver o entender"}\nSin markdown.\nContexto:\n${contextText(8)}`);
    const duda = data?.duda || `¡Ay! No entiendo muy bien "${state.topic}"… 🥺`;
    task = data?.tarea || `Explícame lo básico de ${state.topic}`;
    say().innerHTML = escapeHTML(duda); speak(duda); pushTurn('mira', duda);
    content().innerHTML = `
      <div class="bubble left" style="background:linear-gradient(135deg,#ffe9ef,#fff);max-width:none;">
        ¿Me ayudas con esto? <b style="color:var(--coral)">${escapeHTML(task)}</b>
      </div>`;
    methods16();
  })();

  // Frame 16 — ¿cómo se lo explicas?
  function methods16() {
    tag('Explícale como quieras ✏️'); setMood(screen, 'curious');
    controls().innerHTML = '';
    const box = document.createElement('div');
    box.className = 'methods';
    box.innerHTML = `
      <button class="method" data-m="write"><span class="method__ic">✏️</span> Escribir</button>
      <button class="method" data-m="talk"><span class="method__ic">🎤</span> Hablar</button>
      <button class="method" data-m="draw"><span class="method__ic">🎨</span> Dibujar</button>`;
    const holder = document.createElement('div'); holder.id = 'method-ui'; holder.style.marginTop = '12px';
    controls().appendChild(box); controls().appendChild(holder);
    box.querySelectorAll('.method').forEach(b =>
      b.addEventListener('click', () => openMethod(b.dataset.m, holder)));
    openMethod('write', holder); // por defecto
  }

  function openMethod(m, holder) {
    if (m === 'draw') return drawUI(holder);
    holder.innerHTML = `
      <textarea id="expl" rows="3" placeholder="${m === 'talk' ? 'Toca el micro y háblale…' : 'Escríbele tu explicación…'}"
        style="width:100%;max-width:520px;border:2px solid var(--line-2);border-radius:16px;padding:14px;font-family:var(--font-body);font-size:16px;resize:vertical;"></textarea>
      <div class="choices" style="margin-top:10px;">
        ${m === 'talk' ? '<button class="btn btn--ghost" id="mic">🎤 Hablar</button>' : ''}
        <button class="btn btn--primary" id="sendExpl">Enviar a MIRA 💜</button>
      </div>`;
    const ta = holder.querySelector('#expl');
    ta.value = explanation; ta.focus();
    if (m === 'talk') setupMic(holder.querySelector('#mic'), ta);
    holder.querySelector('#sendExpl').addEventListener('click', () => {
      const v = ta.value.trim(); if (!v) { ta.focus(); return; }
      explanation = v; receiveExplanation(v);
    });
  }

  function drawUI(holder) {
    holder.innerHTML = `
      <div class="card" style="max-width:520px;">
        <canvas id="pad" width="480" height="260" style="width:100%;background:#fff;border:2px dashed var(--line-2);border-radius:12px;touch-action:none;cursor:crosshair;"></canvas>
        <div class="choices" style="margin-top:10px;">
          <button class="btn btn--ghost" id="clearPad">🧽 Borrar</button>
          <button class="btn btn--primary" id="sendPad">Mostrar a MIRA 🎨</button>
        </div>
      </div>`;
    const cv = holder.querySelector('#pad'); const ctx = cv.getContext('2d');
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#2a2350';
    let drawing = false, last = null;
    const pos = e => { const r = cv.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return { x: (p.clientX - r.left) * cv.width / r.width, y: (p.clientY - r.top) * cv.height / r.height }; };
    const start = e => { drawing = true; last = pos(e); e.preventDefault(); };
    const move = e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; e.preventDefault(); };
    const end = () => drawing = false;
    cv.addEventListener('pointerdown', start); cv.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
    holder.querySelector('#clearPad').addEventListener('click', () => ctx.clearRect(0, 0, cv.width, cv.height));
    holder.querySelector('#sendPad').addEventListener('click', async () => {
      const img = cv.toDataURL('image/png');
      explanation = '(un dibujo explicativo)';
      receiveExplanation(explanation, img);
    });
  }

  function setupMic(btn, ta) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { btn.disabled = true; btn.textContent = '🎤 (no disponible)'; return; }
    const rec = new SR(); rec.lang = 'es-ES'; rec.interimResults = true; rec.continuous = false;
    let listening = false;
    rec.onresult = e => { let t = ''; for (const r of e.results) t += r[0].transcript; ta.value = (explanation ? explanation + ' ' : '') + t; };
    rec.onend = () => { listening = false; btn.textContent = '🎤 Hablar'; btn.classList.remove('btn--coral'); };
    btn.addEventListener('click', () => {
      if (listening) { rec.stop(); return; }
      try { rec.start(); listening = true; btn.textContent = '⏹️ Detener'; btn.classList.add('btn--coral'); } catch {}
    });
  }

  // Frame 17 — MIRA agradece y pregunta si hay algo más
  async function receiveExplanation(text, image) {
    tag('MIRA te escucha 👂'); setMood(screen, 'thinking');
    controls().innerHTML = ''; content().innerHTML = '';
    pushTurn('kid', text);
    let reply;
    if (image) {
      say().innerHTML = `<span class="typing"><i></i><i></i><i></i></span>`;
      reply = await askImage(`${KID_STYLE}\nEres MIRA aprendiz. El estudiante te explicó "${task}" con un dibujo. Reacciona con 1-2 frases agradeciendo y di si te quedó claro.`, image);
      say().innerHTML = escapeHTML(reply || '¡Gracias! 💜');
    } else {
      reply = await streamBubble(say(),
        `${KID_STYLE}\nEres MIRA aprendiz. El estudiante te explicó "${task}" así: "${text}". Agradece en 1-2 frases y muestra que lo estás entendiendo. No resuelvas todavía.`);
    }
    speak(reply); pushTurn('mira', reply || '');
    tag('¿Algo más? 🤔');
    control([
      { label: '➕ Sí, explicar más', cls: 'btn--ghost', on: () => methods16() },
      { label: '✅ No, ya está', cls: 'btn--primary', on: demonstrate18 },
    ]);
  }

  // Frame 18 — MIRA demuestra lo que entendió (paso a paso)
  async function demonstrate18() {
    tag('MIRA lo intenta ✍️'); setMood(screen, 'thinking');
    say().innerHTML = 'Déjame ver si lo entendí… ✍️';
    content().innerHTML = `<div class="card" style="display:inline-flex;gap:10px;align-items:center;color:var(--ink-mute);"><span class="typing"><i></i><i></i><i></i></span> pensando…</div>`;
    controls().innerHTML = '';
    const data = await askJSON(
      `${KID_STYLE}\nEres MIRA aprendiz. El estudiante te ayudó con "${task}". Con lo que aprendiste, DEMUESTRA lo que entendiste paso a paso.\nDevuelve SOLO JSON: {"intro":"1 frase","pasos":["paso 1","paso 2","paso 3"],"final":"resultado o conclusión corta"}\n2 a 4 pasos, muy cortos. Sin markdown.\nExplicación del estudiante: "${explanation}"\nContexto:\n${contextText(8)}`);
    const pasos = (data?.pasos || []).slice(0, 5);
    content().innerHTML = `
      <div class="solution">
        ${pasos.map((p, i) => `<div class="solution__step is-tappable" data-step="${i}" style="animation-delay:${.2 * i}s" title="Tócalo si está mal">${escapeHTML(p)}</div>`).join('')}
        ${data?.final ? `<div class="solution__step final" style="animation-delay:${.2 * pasos.length}s">${escapeHTML(data.final)}</div>` : ''}
      </div>`;
    const intro = (data?.intro || '¿Está correcto lo que hice?') + ' Si un paso está mal, ¡tócalo! 👆';
    say().innerHTML = escapeHTML(intro); speak(intro); setMood(screen, 'curious'); bumpProgress(10);
    // Frame 19 — ¿está correcto? (interactivo: tocar el paso equivocado)
    tag('¿Está correcto? 🤔');
    content().querySelectorAll('.is-tappable').forEach(el =>
      el.addEventListener('click', () => {
        el.classList.add('is-marked');
        setMood(screen, 'surprised');
        say().innerHTML = `¡Ups! 😳 ¿Ese paso está mal? Explícame cómo corregirlo, porfa 🙏`;
        speak('¿Ese paso está mal? Explícame cómo corregirlo');
        setTimeout(() => setMood(screen, 'sad'), 1500);
        methods16();
      }));
    control([
      { label: '✅ Sí, está perfecto', cls: 'btn--mint', on: recap20 },
    ]);
  }

  // Frame 20 — recap: ¡Yay! Hoy aprendí…
  async function recap20() {
    tag('¡Lo logramos! 🎉'); setMood(screen, 'celebratory'); confetti(110); bumpProgress(100);
    addStar(); // estrella por enseñarle a MIRA
    say().innerHTML = '¡Yay! Ahora sí lo entendí mejor 🎉';
    speak('¡Yay! Ahora sí lo entendí mejor');
    const data = await askJSON(
      `${KID_STYLE}\nEres MIRA. Cierra la sesión sobre "${state.topic}".\nDevuelve SOLO JSON: {"aprendi":["cosa 1","cosa 2"]}\n1 a 3 puntos muy cortos de lo que aprendiste con el estudiante. Sin markdown.\nContexto:\n${contextText(10)}`);
    const puntos = (data?.aprendi || state.learned || []).slice(0, 3);
    content().innerHTML = `
      <div class="learned">
        <h3>Hoy aprendí… 💜</h3>
        <ul>${(puntos.length ? puntos : ['¡Gracias a ti!']).map(p => `<li>${escapeHTML(p)}</li>`).join('')}</ul>
        <div style="margin-top:12px;">${starsChipHTML()}</div>
      </div>`;
    control([
      { label: '🔁 Otra ronda', cls: 'btn--primary', on: () => app.restart() },
      { label: '🏠 Terminar', cls: 'btn--ghost', on: () => app.restart() },
    ]);
  }

  function control(list) {
    controls().innerHTML = '';
    list.forEach(b => { const btn = document.createElement('button'); btn.className = 'btn ' + (b.cls || 'btn--ghost'); btn.textContent = b.label; btn.addEventListener('click', b.on); controls().appendChild(btn); });
  }
}
