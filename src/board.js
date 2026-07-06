/* ============================================================
   MIRA · Board — motor DOM/SVG de la pizarra compartida:
   pinta un modelo de nodos ya posicionado (mental/conceptual/
   flujo), deja arrastrar y seleccionar nodos, dibujar encima
   con crayón, y saca una "foto" de la pizarra (canvas) para
   que MIRA la vea con visión.
   ============================================================ */

import { W, H, PADX, PADY } from './mindmap.js';
import { escapeHTML } from './mira.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const INK_COLOR = '#5b3fd6';

/* renderBoard(host, model, { onSelect, onSee, ink })
   → { addChildren, markLearned, getNode, stats, deselect,
       hasInk, inkURL, clearInk, snapshot }                    */
export function renderBoard(host, model, { onSelect, onSee, ink: inkURL } = {}) {
  const nodes = new Map();
  let seq = 0, selected = null, k = 1;

  host.innerHTML = `
    <div class="mmap">
      <div class="mmap__head">
        <div class="mmap__title">${escapeHTML(model.title)}</div>
        <div class="mmap__tools">
          <button class="tool" data-tool="draw" title="Dibuja o escribe sobre la pizarra">✏️ Dibujar</button>
          <button class="tool" data-tool="clear" title="Borrar tu dibujo">🧽</button>
          <button class="tool tool--see" data-tool="see" title="MIRA mira tu dibujo">👀 ¡Mira esto!</button>
        </div>
      </div>
      <div class="mmap__vp">
        <div class="mmap__stage" style="width:${W}px;height:${H}px;">
          <svg class="mmap__edges" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>
        </div>
      </div>
      <div class="mmap__hint" data-hint>Arrastra las ideas para acomodarlas, o toca una para jugar con ella 👆</div>
    </div>`;

  const vp = host.querySelector('.mmap__vp');
  const stage = host.querySelector('.mmap__stage');
  const svg = host.querySelector('.mmap__edges');
  const hint = host.querySelector('[data-hint]');

  /* — escala el espacio virtual al ancho real — */
  function fit() {
    if (!document.body.contains(vp)) { window.removeEventListener('resize', fit); return; }
    k = vp.clientWidth / W || 1;
    stage.style.transform = `scale(${k})`;
    vp.style.height = Math.round(H * k) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  const clampX = x => Math.max(PADX, Math.min(W - PADX, x));
  const clampY = y => Math.max(PADY, Math.min(H - PADY, y));
  const place = n => { n.el.style.left = n.x + 'px'; n.el.style.top = n.y + 'px'; };

  /* — aristas curvas (+ etiqueta de enlace y flecha de flujo) — */
  function drawEdge(n) {
    const p = nodes.get(n.parent);
    if (!p) return;
    const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2;
    const dx = n.x - p.x, dy = n.y - p.y;
    const L = Math.hypot(dx, dy) || 1;
    const off = model.kind === 'flujo' ? 0 : Math.min(26, L * 0.18);
    const cx2 = mx - dy / L * off, cy2 = my + dx / L * off;
    n.edge.setAttribute('d', `M ${p.x} ${p.y} Q ${cx2} ${cy2} ${n.x} ${n.y}`);
    const pmx = 0.25 * p.x + 0.5 * cx2 + 0.25 * n.x;   // punto medio real de la curva
    const pmy = 0.25 * p.y + 0.5 * cy2 + 0.25 * n.y;
    if (n.labelEl) { n.labelEl.style.left = pmx + 'px'; n.labelEl.style.top = pmy + 'px'; }
    if (n.arrowEl) {
      const ang = Math.atan2(dy, dx), s = 11;
      n.arrowEl.setAttribute('points', [0, 2.55, -2.55]
        .map(a => (pmx + Math.cos(ang + a) * s) + ',' + (pmy + Math.sin(ang + a) * s)).join(' '));
    }
  }
  function addEdge(n) {
    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('class', 'mmap__edge'
      + (n.type === 'branch' || n.type === 'step' ? ' mmap__edge--branch' : '')
      + (n.mine ? ' mmap__edge--mine' : ''));
    path.setAttribute('stroke', n.pal ? n.pal.bot : '#cbd9ee');
    svg.appendChild(path);
    n.edge = path;
    if (n.type === 'step') {
      const tri = document.createElementNS(SVGNS, 'polygon');
      tri.setAttribute('class', 'mmap__arrow');
      tri.setAttribute('fill', n.pal ? n.pal.sh : '#3ba1dd');
      svg.appendChild(tri);
      n.arrowEl = tri;
    }
    if (n.edgeLabel) {
      const lb = document.createElement('span');
      lb.className = 'mlabel';
      lb.textContent = n.edgeLabel;
      stage.appendChild(lb);
      n.labelEl = lb;
    }
    drawEdge(n);
  }
  function updateEdges(n) {
    if (n.parent) drawEdge(n);
    for (const c of nodes.values()) if (c.parent === n.id) drawEdge(c);
  }

  /* — selección — */
  function select(n) {
    if (selected) selected.el.classList.remove('is-sel');
    selected = n; n.el.classList.add('is-sel');
    onSelect && onSelect(n);
  }
  function deselect() {
    if (selected) selected.el.classList.remove('is-sel');
    selected = null;
    onSelect && onSelect(null);
  }
  vp.addEventListener('pointerdown', e => {
    if (!stage.classList.contains('is-draw') && !e.target.closest('.mnode')) deselect();
  });

  /* — drag con puntero; un toque sin arrastre = seleccionar — */
  function wireNode(n) {
    n.el.addEventListener('pointerdown', (e) => {
      if (e.button || stage.classList.contains('is-draw')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = n.x, oy = n.y;
      let moved = false;
      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 7) {
          moved = true; n.el.classList.add('is-dragging');
        }
        if (!moved) return;
        n.x = clampX(ox + (ev.clientX - sx) / k);
        n.y = clampY(oy + (ev.clientY - sy) / k);
        place(n); updateEdges(n);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        n.el.classList.remove('is-dragging');
        if (!moved) select(n);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, { once: true });
    });
  }

  function spawn(n) {
    nodes.set(n.id, n);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'mnode mnode--' + n.type + (n.mine ? ' mnode--mine' : '') + (n.learned ? ' is-learned' : '');
    if (n.pal && !n.mine && n.type !== 'center') {
      el.style.setProperty('--n-top', n.pal.top);
      el.style.setProperty('--n-bot', n.pal.bot);
      el.style.setProperty('--n-ink', n.pal.ink);
      el.style.setProperty('--n-sh', n.pal.sh);
    }
    el.innerHTML = (n.step ? `<span class="mnode__n">${n.step}</span>` : '')
      + (n.emoji ? `<span class="mnode__emoji">${escapeHTML(n.emoji)}</span> ` : '')
      + escapeHTML(n.text);
    n.el = el; place(n);
    stage.appendChild(el);
    if (n.parent) addEdge(n);
    wireNode(n);
    return n;
  }
  model.nodes.forEach(spawn);

  /* — crayón: canvas de tinta ENCIMA de los nodos — */
  const ink = document.createElement('canvas');
  ink.width = W; ink.height = H; ink.className = 'mmap__ink';
  stage.appendChild(ink);
  const ictx = ink.getContext('2d');
  ictx.lineWidth = 4.5; ictx.lineCap = 'round'; ictx.lineJoin = 'round'; ictx.strokeStyle = INK_COLOR;
  let inkUsed = false;
  if (inkURL) {
    const im = new Image();
    im.onload = () => { ictx.drawImage(im, 0, 0); inkUsed = true; };
    im.src = inkURL;
  }
  const ipos = e => {
    const r = ink.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  };
  ink.addEventListener('pointerdown', e => {
    e.preventDefault(); ink.setPointerCapture(e.pointerId);
    let last = ipos(e); inkUsed = true;
    const move = ev => {
      const p = ipos(ev);
      ictx.beginPath(); ictx.moveTo(last.x, last.y); ictx.lineTo(p.x, p.y); ictx.stroke();
      last = p;
    };
    const up = () => { ink.removeEventListener('pointermove', move); };
    ink.addEventListener('pointermove', move);
    ink.addEventListener('pointerup', up, { once: true });
  });

  /* — herramientas — */
  const drawBtn = host.querySelector('[data-tool="draw"]');
  drawBtn.addEventListener('click', () => {
    const on = stage.classList.toggle('is-draw');
    drawBtn.classList.toggle('is-on', on);
    if (on) deselect();
    hint.textContent = on
      ? 'Escribe o dibuja con tu crayón ✏️ y luego toca 👀 ¡Mira esto! para enseñárselo a MIRA'
      : 'Arrastra las ideas para acomodarlas, o toca una para jugar con ella 👆';
  });
  host.querySelector('[data-tool="clear"]').addEventListener('click', () => {
    ictx.clearRect(0, 0, W, H); inkUsed = false;
  });
  host.querySelector('[data-tool="see"]').addEventListener('click', () => onSee && onSee());

  /* — foto de la pizarra (mapa + crayón) para la visión de MIRA — */
  function snapshot() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#F4F9FF'; x.fillRect(0, 0, W, H);
    // aristas + flechas + enlaces
    for (const n of nodes.values()) {
      const p = n.parent && nodes.get(n.parent);
      if (!p) continue;
      const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2;
      const dx = n.x - p.x, dy = n.y - p.y, L = Math.hypot(dx, dy) || 1;
      const off = model.kind === 'flujo' ? 0 : Math.min(26, L * 0.18);
      const cx2 = mx - dy / L * off, cy2 = my + dx / L * off;
      x.globalAlpha = 0.6;
      x.strokeStyle = n.pal ? n.pal.bot : '#cbd9ee';
      x.lineWidth = n.type === 'leaf' ? 3 : 5;
      x.beginPath(); x.moveTo(p.x, p.y); x.quadraticCurveTo(cx2, cy2, n.x, n.y); x.stroke();
      x.globalAlpha = 1;
      const pmx = 0.25 * p.x + 0.5 * cx2 + 0.25 * n.x, pmy = 0.25 * p.y + 0.5 * cy2 + 0.25 * n.y;
      if (n.type === 'step') {
        const ang = Math.atan2(dy, dx), s = 11;
        x.fillStyle = n.pal ? n.pal.sh : '#3ba1dd';
        x.beginPath();
        x.moveTo(pmx + Math.cos(ang) * s, pmy + Math.sin(ang) * s);
        x.lineTo(pmx + Math.cos(ang + 2.55) * s, pmy + Math.sin(ang + 2.55) * s);
        x.lineTo(pmx + Math.cos(ang - 2.55) * s, pmy + Math.sin(ang - 2.55) * s);
        x.closePath(); x.fill();
      }
      if (n.edgeLabel) {
        x.font = '700 11px Nunito, sans-serif';
        const w2 = x.measureText(n.edgeLabel).width / 2 + 8;
        x.fillStyle = '#fff';
        roundRect(x, pmx - w2, pmy - 10, w2 * 2, 20, 9); x.fill();
        x.fillStyle = '#46608F'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(n.edgeLabel, pmx, pmy + 1);
      }
    }
    // nodos
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const n of nodes.values()) {
      x.font = (n.type === 'center' ? '700 16px' : n.type === 'leaf' ? '600 12px' : '700 14px') + ' Nunito, sans-serif';
      const lines = wrapText(x, (n.emoji ? n.emoji + ' ' : '') + n.text, 170);
      const wN = Math.max(64, Math.min(200, Math.max(...lines.map(l => x.measureText(l).width)) + 26));
      const hN = lines.length * 17 + 15;
      x.fillStyle = n.type === 'center' ? '#7C5BFF' : n.mine ? '#ffffff' : (n.pal ? n.pal.bot : '#6ECBFF');
      roundRect(x, n.x - wN / 2, n.y - hN / 2, wN, hN, 13); x.fill();
      x.lineWidth = 3;
      x.strokeStyle = n.mine ? '#b9a6ff' : '#ffffff';
      x.setLineDash(n.mine ? [5, 5] : []);
      x.stroke(); x.setLineDash([]);
      x.fillStyle = n.type === 'center' ? '#fff' : n.mine ? '#5b3fd6' : (n.pal ? n.pal.ink : '#0d3f66');
      lines.forEach((l, i) => x.fillText(l, n.x, n.y - (lines.length - 1) * 8.5 + i * 17));
      if (n.step) {
        x.fillStyle = '#F4504B';
        x.beginPath(); x.arc(n.x - wN / 2 + 2, n.y - hN / 2 + 2, 11, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.font = '800 12px Nunito, sans-serif';
        x.fillText(String(n.step), n.x - wN / 2 + 2, n.y - hN / 2 + 3);
      }
      if (n.learned) { x.font = '14px sans-serif'; x.fillText('⭐', n.x + wN / 2 - 4, n.y - hN / 2); }
    }
    x.drawImage(ink, 0, 0);
    return c.toDataURL('image/png');
  }

  /* ---- API pública ---- */
  return {
    getNode: id => nodes.get(id),
    deselect,
    hasInk: () => inkUsed,
    inkURL: () => (inkUsed ? ink.toDataURL('image/png') : null),
    snapshot,

    /* Agrega hojas colgando de `parentId` (mine=true → idea del niño).
       También las inserta al modelo para sobrevivir cambios de pestaña. */
    addChildren(parentId, texts, { mine = false } = {}) {
      const p = nodes.get(parentId);
      if (!p) return [];
      const dir = model.kind === 'mental'
        ? (p.type === 'center' ? Math.PI / 2 : Math.atan2(p.y - H / 2, p.x - W / 2))
        : Math.PI / 2; // conceptual/flujo: cuelgan hacia abajo
      let idx = [...nodes.values()].filter(c => c.parent === p.id && c.id[0] === 'x').length;
      return texts.map(t => {
        const sign = idx % 2 ? -1 : 1;
        const ang = dir + sign * (0.5 + 0.35 * Math.floor(idx / 2));
        idx++;
        const n = {
          id: 'x' + Date.now().toString(36) + (seq++), text: String(t).slice(0, 46),
          emoji: mine ? '✏️' : '', type: 'leaf', parent: p.id,
          pal: p.pal || null, mine, learned: false,
          x: clampX(p.x + Math.cos(ang) * (p.type === 'center' ? 190 : 145)),
          y: clampY(p.y + Math.sin(ang) * (p.type === 'center' ? 150 : 115)),
        };
        model.nodes.push(n);
        spawn(n).el.classList.add('is-new');
        return n;
      });
    },

    markLearned(id) {
      const n = nodes.get(id);
      if (!n || n.type === 'center') return;
      n.learned = true;
      n.el.classList.add('is-learned');
    },

    stats() {
      let total = 0, learned = 0;
      for (const n of nodes.values()) if (n.type !== 'center') { total++; if (n.learned) learned++; }
      return { total, learned };
    },
  };
}

/* ---------- helpers de canvas ---------- */
function roundRect(x, px, py, w, h, r) {
  if (x.roundRect) { x.beginPath(); x.roundRect(px, py, w, h, r); return; }
  x.beginPath(); x.rect(px, py, w, h);
}

function wrapText(x, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [''];
  for (const w of words) {
    const li = lines.length - 1;
    const t = lines[li] ? lines[li] + ' ' + w : w;
    if (x.measureText(t).width <= maxW || !lines[li]) lines[li] = t;
    else if (lines.length < 2) lines.push(w);
    else { lines[li] += '…'; break; }
  }
  return lines;
}
