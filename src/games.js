/* ============================================================
   MIRA · Games — minijuegos interactivos generados por el motor.
   Tipos: quiz · vf (verdadero/falso) · ordenar · pares · hueco.
   MIRA reacciona a cada jugada (celebra, se sorprende, se pone
   triste y anima) y el niño gana estrellas ⭐.
   ============================================================ */

import { KID_STYLE, askJSON } from './engine.js';
import { state, addStar, contextText } from './state.js';
import { confetti, speak, escapeHTML } from './mira.js';
import { sfx } from './sfx.js';

/* ---- Generación: pide N minijuegos al motor ---- */
export async function fetchGames(topic, n = 3) {
  const data = await askJSON(
    `${KID_STYLE}
Crea ${n} MINIJUEGOS cortos y divertidos sobre "${topic}" para reforzar lo que MIRA acaba de enseñar.
Devuelve SOLO JSON con esta forma exacta:
{"juegos":[
 {"tipo":"quiz","pregunta":"...","opciones":["A","B","C"],"correcta":0,"porque":"explicación de 1 frase"},
 {"tipo":"vf","frase":"afirmación corta","respuesta":true,"porque":"1 frase"},
 {"tipo":"ordenar","titulo":"Ordena los pasos","items":["primero","segundo","tercero"],"porque":"1 frase"},
 {"tipo":"pares","titulo":"Une cada cosa con su pareja","pares":[["concepto","significado"],["a","1"],["b","2"]]},
 {"tipo":"hueco","frase":"Texto con __ para completar","opciones":["bien","mal","regular"],"correcta":0,"porque":"1 frase"}
]}
Reglas: usa ${n} tipos DIFERENTES entre sí. Textos muy cortos (máx 8 palabras por opción). En "ordenar" da los items YA en el orden correcto (yo los revuelvo). En "pares" máximo 3 parejas. Sin markdown.
Contexto de la clase:
${contextText(10)}`);
  const juegos = (data?.juegos || []).filter(g => g && g.tipo);
  return juegos.slice(0, n);
}

/* ---- Reacciones de MIRA según la jugada ---- */
const CHEERS = ['¡Súper! 🎉', '¡Eso es! ⭐', '¡Wow, qué crack! 🤩', '¡Exacto! 💜'];
const OOPS = ['¡Uy, casi! 🙈', 'Mmm, esa no era… 😢', '¡No pasa nada, intenta otra vez! 💪'];

function cheer(mira) {
  const msg = CHEERS[Math.floor(Math.random() * CHEERS.length)];
  mira.mood(Math.random() < 0.4 ? 'surprised' : 'celebratory');
  sfx.ding();
  speak(msg);
  confetti(45);
  return msg;
}
function oops(mira) {
  const msg = OOPS[Math.floor(Math.random() * OOPS.length)];
  mira.mood('sad');
  sfx.buzz();
  speak(msg);
  setTimeout(() => mira.mood('encouraging'), 1600);
  return msg;
}

/* ---- Estrella animada + contador ---- */
export function popStar(host) {
  sfx.sparkle();
  addStar();
  const r = host.getBoundingClientRect();
  const s = document.createElement('div');
  s.className = 'star-pop'; s.textContent = '⭐';
  s.style.left = (r.left + r.width / 2) + 'px';
  s.style.top = (r.top + 40) + 'px';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 1100);
  document.querySelectorAll('[data-stars]').forEach(el => el.textContent = state.stars);
}

export function starsChipHTML() {
  return `<span class="stars-chip">⭐ <span data-stars>${state.stars}</span> estrellas</span>`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ============================================================
   playGames — corre los juegos en secuencia dentro de `host`.
   mira = { mood(m), say(texto) } para que MIRA reaccione.
   onDone(aciertosPrimerIntento) al terminar todos.
   ============================================================ */
export function playGames(host, games, mira, onDone) {
  let idx = 0, hits = 0;

  const next = () => {
    idx++;
    if (idx >= games.length) { onDone(hits); return; }
    render();
  };

  const render = () => {
    const g = games[idx];
    host.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'game';
    card.innerHTML = `
      <div class="game__head">
        <span class="game__round">Juego ${idx + 1} de ${games.length}</span>
        <span class="game__type">${typeLabel(g.tipo)}</span>
        ${starsChipHTML()}
      </div>
      <div class="game__body"></div>
      <div class="game__fb"></div>`;
    host.appendChild(card);
    const body = card.querySelector('.game__body');
    const fb = card.querySelector('.game__fb');

    const done = (firstTry) => {
      if (firstTry) hits++;
      popStar(card);
      const btn = document.createElement('button');
      btn.className = 'btn btn--primary'; btn.style.marginTop = '14px';
      btn.textContent = idx + 1 < games.length ? '¡Siguiente juego! →' : '¡Terminamos! 🏁';
      btn.addEventListener('click', next);
      card.appendChild(btn);
      btn.focus();
    };

    try {
      if (g.tipo === 'quiz' || g.tipo === 'hueco') renderChoice(g, body, fb, mira, done);
      else if (g.tipo === 'vf') renderVF(g, body, fb, mira, done);
      else if (g.tipo === 'ordenar') renderOrder(g, body, fb, mira, done);
      else if (g.tipo === 'pares') renderPairs(g, body, fb, mira, done);
      else next(); // tipo desconocido: saltar
    } catch { next(); }
  };

  render();
}

function typeLabel(t) {
  return { quiz: '🧠 Quiz', vf: '⚡ ¿Verdadero o falso?', ordenar: '🔢 Ordena los pasos', pares: '🧩 Une las parejas', hueco: '✏️ Completa' }[t] || '🎮';
}

/* ---- quiz / hueco: elegir la opción correcta ---- */
function renderChoice(g, body, fb, mira, done) {
  const pregunta = g.tipo === 'hueco'
    ? String(g.frase || '').replace(/_{1,}/, '<span class="gap">__</span>')
    : escapeHTML(g.pregunta || '');
  body.innerHTML = `
    <div class="game__q">${pregunta}</div>
    <div class="game__opts"></div>`;
  const opts = body.querySelector('.game__opts');
  const correcta = Number(g.correcta) || 0;
  let firstTry = true, solved = false;

  (g.opciones || []).forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'gopt';
    b.innerHTML = `<span class="gopt__key">${String.fromCharCode(65 + i)}</span> ${escapeHTML(String(o))}`;
    b.addEventListener('click', () => {
      if (solved) return;
      if (i === correcta) {
        solved = true;
        b.classList.add('is-right');
        opts.querySelectorAll('.gopt').forEach(x => { if (x !== b) x.classList.add('is-off'); });
        if (g.tipo === 'hueco') { const gap = body.querySelector('.gap'); if (gap) gap.textContent = String(o); }
        fb.className = 'game__fb ok'; fb.textContent = cheer(mira) + (g.porque ? ' ' + g.porque : '');
        done(firstTry);
      } else {
        firstTry = false;
        b.classList.add('is-wrong'); setTimeout(() => b.classList.remove('is-wrong'), 500);
        b.classList.add('is-off');
        fb.className = 'game__fb bad'; fb.textContent = oops(mira);
      }
    });
    opts.appendChild(b);
  });
}

/* ---- verdadero / falso ---- */
function renderVF(g, body, fb, mira, done) {
  body.innerHTML = `
    <div class="game__q">${escapeHTML(g.frase || '')}</div>
    <div class="game__opts game__opts--row"></div>`;
  const opts = body.querySelector('.game__opts');
  const answer = g.respuesta === true || g.respuesta === 'true';
  let firstTry = true, solved = false;
  [['✅ Verdadero', true], ['❌ Falso', false]].forEach(([label, val]) => {
    const b = document.createElement('button');
    b.className = 'gopt'; b.style.flex = '1'; b.style.justifyContent = 'center';
    b.textContent = label;
    b.addEventListener('click', () => {
      if (solved) return;
      if (val === answer) {
        solved = true; b.classList.add('is-right');
        opts.querySelectorAll('.gopt').forEach(x => { if (x !== b) x.classList.add('is-off'); });
        fb.className = 'game__fb ok'; fb.textContent = cheer(mira) + (g.porque ? ' ' + g.porque : '');
        done(firstTry);
      } else {
        firstTry = false;
        b.classList.add('is-wrong'); setTimeout(() => b.classList.remove('is-wrong'), 500);
        fb.className = 'game__fb bad'; fb.textContent = oops(mira);
      }
    });
    opts.appendChild(b);
  });
}

/* ---- ordenar pasos: tocar en orden ---- */
function renderOrder(g, body, fb, mira, done) {
  const items = (g.items || []).map(String);
  body.innerHTML = `
    <div class="game__q">${escapeHTML(g.titulo || 'Toca los pasos en orden')}</div>
    <div class="gorder__answer" data-zone></div>
    <div class="gorder__pool" data-pool></div>`;
  const zone = body.querySelector('[data-zone]');
  const pool = body.querySelector('[data-pool]');
  let picked = [], firstTry = true;

  const reset = () => {
    picked = [];
    zone.innerHTML = ''; pool.innerHTML = '';
    shuffle(items).forEach(it => {
      const c = document.createElement('button');
      c.className = 'gchip'; c.textContent = it;
      c.addEventListener('click', () => {
        picked.push(it);
        const lk = document.createElement('span');
        lk.className = 'gchip is-locked';
        lk.innerHTML = `<span class="gchip__n">${picked.length}</span> ${escapeHTML(it)}`;
        zone.appendChild(lk); c.remove();
        if (picked.length === items.length) check();
      });
      pool.appendChild(c);
    });
  };

  const check = () => {
    const ok = picked.every((p, i) => p === items[i]);
    if (ok) {
      fb.className = 'game__fb ok'; fb.textContent = cheer(mira) + (g.porque ? ' ' + g.porque : '');
      done(firstTry);
    } else {
      firstTry = false;
      fb.className = 'game__fb bad'; fb.textContent = oops(mira) + ' El orden no quedó… ¡otra vez!';
      setTimeout(reset, 900);
    }
  };
  reset();
}

/* ---- unir parejas: tocar una y su pareja ---- */
function renderPairs(g, body, fb, mira, done) {
  const pares = (g.pares || []).slice(0, 3).map(p => [String(p[0]), String(p[1])]);
  const key = new Map(pares.map(([a, b]) => [a + '│' + b, true]));
  body.innerHTML = `
    <div class="game__q">${escapeHTML(g.titulo || 'Une cada cosa con su pareja')}</div>
    <div class="gpairs" data-grid></div>`;
  const grid = body.querySelector('[data-grid]');
  const left = shuffle(pares.map(p => p[0]));
  const right = shuffle(pares.map(p => p[1]));
  let sel = null, doneCount = 0, firstTry = true;

  const mk = (txt, side) => {
    const b = document.createElement('button');
    b.className = 'gpair'; b.textContent = txt; b.dataset.side = side;
    b.addEventListener('click', () => {
      if (b.classList.contains('is-done')) return;
      if (!sel) { sel = b; b.classList.add('is-sel'); return; }
      if (sel === b) { b.classList.remove('is-sel'); sel = null; return; }
      if (sel.dataset.side === side) { sel.classList.remove('is-sel'); sel = b; b.classList.add('is-sel'); return; }
      const a = side === 'l' ? b.textContent : sel.textContent;
      const c = side === 'l' ? sel.textContent : b.textContent;
      if (key.has(a + '│' + c)) {
        sel.classList.remove('is-sel');
        sel.classList.add('is-done'); b.classList.add('is-done');
        sel = null; doneCount++;
        if (doneCount === pares.length) {
          fb.className = 'game__fb ok'; fb.textContent = cheer(mira);
          done(firstTry);
        }
      } else {
        firstTry = false;
        [sel, b].forEach(x => { x.classList.add('is-bad'); setTimeout(() => x.classList.remove('is-bad'), 500); });
        sel.classList.remove('is-sel'); sel = null;
        fb.className = 'game__fb bad'; fb.textContent = oops(mira);
      }
    });
    return b;
  };
  for (let i = 0; i < pares.length; i++) {
    grid.appendChild(mk(left[i], 'l'));
    grid.appendChild(mk(right[i], 'r'));
  }
}
