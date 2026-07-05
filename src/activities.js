/* ============================================================
   MIRA · Activities — la clase se JUEGA, no se lee:
   1) Pizarra mágica: las ideas tienen huecos y el niño los
      completa tocando las palabras correctas.
   2) Diagrama de nodos: ARRASTRA nodos a su lugar (clasificar
      en cajas o armar una secuencia con ranuras).
   ============================================================ */

import { KID_STYLE, askJSON } from './engine.js';
import { contextText } from './state.js';
import { escapeHTML } from './mira.js';
import { sfx } from './sfx.js';

/* ================= PIZARRA MÁGICA (huecos) ================= */

export async function fetchBoard(topic) {
  return askJSON(
    `${KID_STYLE}
Crea una "pizarra mágica" para enseñar "${topic}" JUGANDO.
Devuelve SOLO JSON:
{"titulo":"pregunta o título corto","lineas":[
 {"texto":"idea clave con un __ donde va la palabra","palabra":"palabra"},
 {"texto":"otra idea con __","palabra":"otra"},
 {"texto":"tercera idea con __","palabra":"tercera"}],
 "distractores":["palabra trampa","otra trampa"],"dato":"dato curioso corto con emoji"}
Reglas: 3 líneas, cada una con UN hueco __ y su "palabra" (1-2 palabras, corta). Las palabras deben ser DIFERENTES entre sí. 2 distractores creíbles. Sin markdown.
Contexto:\n${contextText(6)}`);
}

export function renderBoardGame(host, data, mira, onDone) {
  const lineas = (data?.lineas || []).filter(l => l && l.texto && l.palabra).slice(0, 4);
  if (!lineas.length) { onDone(false); return; }
  const words = lineas.map(l => String(l.palabra));
  const chips = shuffle([...words, ...(data?.distractores || []).map(String).slice(0, 2)]);

  host.innerHTML = `
    <div class="chalkboard board-game">
      ${data.titulo ? `<h3 class="chalkboard__title">${escapeHTML(data.titulo)}</h3>` : ''}
      ${lineas.map((l, i) => `
        <div class="chalkboard__line board-game__line" style="animation-delay:${.12 * i}s">
          • ${escapeHTML(String(l.texto)).replace(/_{2,}/, `<span class="board-blank" data-word="${escapeHTML(String(l.palabra))}">?</span>`)}
        </div>`).join('')}
      <div class="board-chips">
        ${chips.map(w => `<button class="board-chip" data-w="${escapeHTML(w)}">${escapeHTML(w)}</button>`).join('')}
      </div>
      ${data.dato ? `<div class="chalkboard__example board-game__dato" style="display:none;">${escapeHTML(String(data.dato))}</div>` : ''}
    </div>`;

  const blanks = [...host.querySelectorAll('.board-blank')];
  let filled = 0;

  host.querySelectorAll('.board-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const w = chip.dataset.w;
      const target = blanks.find(b => !b.classList.contains('is-done') && b.dataset.word === w);
      if (target) {
        target.textContent = w; target.classList.add('is-done');
        chip.classList.add('is-used'); chip.disabled = true;
        sfx.ding(); mira.mood('excited');
        filled++;
        if (filled === blanks.length) {
          sfx.sparkle(); mira.mood('celebratory');
          const dato = host.querySelector('.board-game__dato');
          if (dato) dato.style.display = 'inline-block';
          setTimeout(() => onDone(true), 1600);
        }
      } else {
        chip.classList.add('is-bad'); setTimeout(() => chip.classList.remove('is-bad'), 450);
        sfx.buzz(); mira.mood('sad'); setTimeout(() => mira.mood('encouraging'), 1400);
      }
    });
  });
}

/* ============ DIAGRAMA DE NODOS (arrastrar y soltar) ============ */

export async function fetchDiagram(topic) {
  return askJSON(
    `${KID_STYLE}
Crea UNA actividad de diagrama con nodos para "${topic}". Elige la forma que MEJOR enseñe el tema:
A) Clasificar: {"tipo":"clasifica","titulo":"Arrastra cada nodo a su caja","categorias":[{"nombre":"Caja A","items":["a","b","c"]},{"nombre":"Caja B","items":["d","e","f"]}]}
B) Secuencia: {"tipo":"flujo","titulo":"Arma el proceso en orden","pasos":["primer paso","segundo","tercero","cuarto"]}
Devuelve SOLO ese JSON. Textos MUY cortos (máx 4 palabras por item). En "clasifica" usa 2 categorías con 2-3 items cada una. En "flujo" 4 pasos ya en orden correcto. Sin markdown.
Contexto:\n${contextText(6)}`);
}

export function renderDiagramGame(host, data, mira, onDone) {
  if (data?.tipo === 'clasifica' && (data.categorias || []).length >= 2) renderClasifica(host, data, mira, onDone);
  else if (data?.tipo === 'flujo' && (data.pasos || []).length >= 3) renderFlujo(host, data, mira, onDone);
  else onDone(false);
}

/* --- clasificar nodos en cajas --- */
function renderClasifica(host, data, mira, onDone) {
  const cats = data.categorias.slice(0, 2).map(c => ({ nombre: String(c.nombre), items: (c.items || []).map(String).slice(0, 3) }));
  const nodes = shuffle(cats.flatMap((c, ci) => c.items.map(it => ({ it, ci }))));

  host.innerHTML = `
    <div class="diagram">
      <div class="diagram__title">🧩 ${escapeHTML(data.titulo || 'Arrastra cada nodo a su caja')}</div>
      <div class="diagram__cats">
        ${cats.map((c, ci) => `
          <div class="dzone" data-drop="${ci}">
            <div class="dzone__name">${escapeHTML(c.nombre)}</div>
            <div class="dzone__body" data-body="${ci}"></div>
          </div>`).join('')}
      </div>
      <div class="dpool" data-pool>
        ${nodes.map(n => `<button class="dnode" data-cat="${n.ci}">${escapeHTML(n.it)}</button>`).join('')}
      </div>
      <div class="diagram__hint">Arrastra (o toca un nodo y luego su caja) 👆</div>
    </div>`;

  wireDragSort(host, {
    isRight: (node, zone) => node.dataset.cat === zone.dataset.drop,
    zoneBody: zone => host.querySelector(`[data-body="${zone.dataset.drop}"]`),
    total: nodes.length,
  }, mira, onDone);
}

/* --- armar secuencia en ranuras numeradas --- */
function renderFlujo(host, data, mira, onDone) {
  const pasos = data.pasos.map(String).slice(0, 5);
  const nodes = shuffle(pasos.map((p, i) => ({ p, i })));

  host.innerHTML = `
    <div class="diagram">
      <div class="diagram__title">🔗 ${escapeHTML(data.titulo || 'Arma el proceso en orden')}</div>
      <div class="diagram__flow">
        ${pasos.map((_, i) => `
          <div class="dslot-wrap">
            <div class="dzone dzone--slot" data-drop="${i}">
              <span class="dslot__n">${i + 1}</span>
              <div class="dzone__body" data-body="${i}"></div>
            </div>
            ${i < pasos.length - 1 ? '<span class="dflow-arrow">→</span>' : ''}
          </div>`).join('')}
      </div>
      <div class="dpool" data-pool>
        ${nodes.map(n => `<button class="dnode" data-cat="${n.i}">${escapeHTML(n.p)}</button>`).join('')}
      </div>
      <div class="diagram__hint">Arrastra cada nodo a su número (o toca nodo y luego ranura) 👆</div>
    </div>`;

  wireDragSort(host, {
    isRight: (node, zone) => node.dataset.cat === zone.dataset.drop,
    zoneBody: zone => host.querySelector(`[data-body="${zone.dataset.drop}"]`),
    total: nodes.length,
  }, mira, onDone);
}

/* --- motor drag & drop (pointer events; también toca-toca) --- */
function wireDragSort(host, cfg, mira, onDone) {
  let placed = 0, selected = null, perfect = true;

  const place = (node, zone) => {
    if (cfg.isRight(node, zone)) {
      cfg.zoneBody(zone).appendChild(node);
      node.classList.remove('is-sel'); node.classList.add('is-locked');
      node.disabled = true;
      zone.classList.add('flash-ok'); setTimeout(() => zone.classList.remove('flash-ok'), 500);
      sfx.ding(); mira.mood('excited');
      placed++;
      if (placed === cfg.total) {
        sfx.sparkle(); mira.mood('celebratory');
        setTimeout(() => onDone(perfect), 1500);
      }
    } else {
      perfect = false;
      zone.classList.add('flash-bad'); setTimeout(() => zone.classList.remove('flash-bad'), 500);
      node.classList.add('is-bad'); setTimeout(() => node.classList.remove('is-bad'), 450);
      sfx.buzz(); mira.mood('sad'); setTimeout(() => mira.mood('encouraging'), 1400);
    }
  };

  // toca-toca: seleccionar nodo → tocar caja
  host.querySelectorAll('.dnode').forEach(node => {
    node.addEventListener('click', () => {
      if (node.classList.contains('is-locked')) return;
      host.querySelectorAll('.dnode').forEach(n => n.classList.remove('is-sel'));
      selected = node; node.classList.add('is-sel'); sfx.pop();
    });
  });
  host.querySelectorAll('[data-drop]').forEach(zone => {
    zone.addEventListener('click', () => { if (selected && !selected.classList.contains('is-locked')) place(selected, zone); });
  });

  // arrastre real con puntero (mouse y touch)
  host.querySelectorAll('.dnode').forEach(node => {
    node.style.touchAction = 'none';
    node.addEventListener('pointerdown', (e) => {
      if (node.classList.contains('is-locked')) return;
      const sx = e.clientX, sy = e.clientY;
      let ghost = null;
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
          ghost = node.cloneNode(true);
          ghost.className = 'dnode dnode--ghost';
          document.body.appendChild(ghost);
          node.classList.add('is-dragging');
        }
        if (ghost) {
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
          host.querySelectorAll('[data-drop]').forEach(z => z.classList.remove('is-over'));
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          el?.closest('[data-drop]')?.classList.add('is-over');
        }
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        node.classList.remove('is-dragging');
        host.querySelectorAll('[data-drop]').forEach(z => z.classList.remove('is-over'));
        if (ghost) {
          ghost.remove();
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          const zone = el?.closest('[data-drop]');
          if (zone) place(node, zone);
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, { once: true });
    });
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
