/* ============================================================
   MIRA · Mindmap data — genera los TRES organizadores visuales
   de la pizarra (mapa mental, mapa conceptual y diagrama de
   flujo) en JSON y los convierte en un modelo de nodos YA
   posicionado dentro de la pizarra (layout por tipo + relax
   anti-encimado + clamps a los bordes).
   ============================================================ */

import { KID_STYLE, askJSON } from './engine.js';
import { contextText } from './state.js';

/* Espacio virtual de la pizarra; se escala al ancho disponible. */
export const W = 1000, H = 660;
export const PADX = 86, PADY = 58;

export const KINDS = {
  mental:     { label: 'Mapa mental',       emoji: '🧠' },
  conceptual: { label: 'Mapa conceptual',   emoji: '🕸️' },
  flujo:      { label: 'Diagrama de flujo', emoji: '➡️' },
};

/* Paleta clay por rama/paso (degradado, tinta y sombra del nodo). */
export const PALETTE = [
  { top: '#8fd3ff', bot: '#6ECBFF', ink: '#0d3f66', sh: '#3ba1dd' }, // sky
  { top: '#FFD75E', bot: '#FFC93C', ink: '#7a4a12', sh: '#E89B2E' }, // sun
  { top: '#7ee2a8', bot: '#4ECB71', ink: '#0c4d24', sh: '#379e53' }, // mint
  { top: '#d9b8ff', bot: '#C58BFF', ink: '#45207a', sh: '#9a63e6' }, // grape
  { top: '#ff9d99', bot: '#F4504B', ink: '#ffffff', sh: '#C93732' }, // coral
];

/* ================= Generación (motor → JSON) ================= */

async function fetchMental(topic) {
  return askJSON(
    `${KID_STYLE}
La clase sobre "${topic}" acaba de terminar. Crea un MAPA MENTAL para repasar lo estudiado.
Devuelve SOLO JSON:
{"titulo":"título corto del mapa","centro":"idea central (máx 3 palabras)","ramas":[
 {"nombre":"nombre de rama (máx 3 palabras)","emoji":"1 emoji","ideas":["idea corta","otra idea"]}]}
Reglas: 3 o 4 ramas, 2 o 3 ideas por rama, textos de máx 5 palabras. Basa el mapa SOLO en lo que se vio en la clase. Sin markdown.
Contexto de la clase:
${contextText(14)}`);
}

async function fetchConceptual(topic) {
  return askJSON(
    `${KID_STYLE}
La clase sobre "${topic}" acaba de terminar. Crea un MAPA CONCEPTUAL (conceptos unidos por palabras de enlace) para repasar lo estudiado.
Devuelve SOLO JSON:
{"titulo":"título corto","concepto":"concepto central (máx 3 palabras)","relaciones":[
 {"enlace":"palabra de enlace (máx 3 palabras)","concepto":"concepto (máx 4 palabras)",
  "sub":[{"enlace":"palabra de enlace","concepto":"concepto (máx 4 palabras)"}]}]}
Reglas: 3 o 4 relaciones, cada una con 1 o 2 "sub". Los enlaces son verbos/conectores ("tiene","produce","se divide en"). Basado SOLO en lo visto en la clase. Sin markdown.
Contexto de la clase:
${contextText(14)}`);
}

async function fetchFlujo(topic) {
  return askJSON(
    `${KID_STYLE}
La clase sobre "${topic}" acaba de terminar. Crea un DIAGRAMA DE FLUJO (proceso paso a paso) para repasar lo estudiado.
Devuelve SOLO JSON: {"titulo":"título corto del proceso","pasos":["primer paso","segundo","tercero","cuarto"]}
Reglas: 4 a 6 pasos EN ORDEN correcto, máx 6 palabras por paso. Funciona con CUALQUIER tema: si hay un proceso natural úsalo; si no, haz los pasos para resolver, aplicar o explicar el tema. Sin markdown.
Contexto de la clase:
${contextText(14)}`);
}

/* Explicación corta de un nodo + 2 sub-ideas para expandirlo. */
export async function fetchNodeDetail(topic, nodeText) {
  return askJSON(
    `${KID_STYLE}
Estamos repasando "${topic}" en la pizarra. El estudiante tocó el nodo "${nodeText}" y quiere saber más.
Devuelve SOLO JSON: {"explica":"explicación de máx 2 frases","nuevas":["sub-idea corta","otra sub-idea"]}
Las "nuevas" son 2 sub-ideas de máx 4 palabras que expanden ese nodo. Sin markdown.
Contexto:\n${contextText(8)}`);
}

/* ¿La idea que agregó el niño encaja en esa parte del mapa? */
export async function fetchIdeaVerdict(topic, branch, idea) {
  return askJSON(
    `${KID_STYLE}
En la pizarra de "${topic}", el estudiante agregó su propia idea "${idea}" bajo "${branch}".
Devuelve SOLO JSON: {"encaja":true,"comentario":"1 frase cálida diciendo si encaja y por qué"}
"encaja" es true si la idea tiene relación correcta con el tema, false si no. Sin markdown.`);
}

/* ================= JSON → modelo de nodos ================= */
/* Nodo: { id, text, emoji, type:'center'|'branch'|'leaf'|'step',
          parent, edgeLabel, step, pal, mine, learned, x, y }    */

function buildMental(data) {
  const ramas = (data?.ramas || []).filter(r => r && r.nombre).slice(0, 5);
  if (!ramas.length) return null;
  const nodes = [{ id: 'c', text: str(data.centro, 40) || '💜', emoji: '', type: 'center', parent: null }];
  ramas.forEach((r, i) => {
    nodes.push({ id: 'b' + i, text: str(r.nombre, 40), emoji: str(r.emoji, 4), type: 'branch', parent: 'c', pal: PALETTE[i % PALETTE.length] });
    (r.ideas || []).slice(0, 3).forEach((t, j) =>
      nodes.push({ id: `b${i}-${j}`, text: str(t, 46), type: 'leaf', parent: 'b' + i, pal: PALETTE[i % PALETTE.length] }));
  });
  return nodes;
}

function buildConceptual(data) {
  const rels = (data?.relaciones || []).filter(r => r && r.concepto).slice(0, 4);
  if (!rels.length) return null;
  const nodes = [{ id: 'c', text: str(data.concepto, 40) || '💜', emoji: '', type: 'center', parent: null }];
  rels.forEach((r, i) => {
    nodes.push({ id: 'b' + i, text: str(r.concepto, 42), type: 'branch', parent: 'c', edgeLabel: str(r.enlace, 26), pal: PALETTE[i % PALETTE.length] });
    (r.sub || []).filter(s => s && s.concepto).slice(0, 2).forEach((s, j) =>
      nodes.push({ id: `b${i}-${j}`, text: str(s.concepto, 46), type: 'leaf', parent: 'b' + i, edgeLabel: str(s.enlace, 26), pal: PALETTE[i % PALETTE.length] }));
  });
  return nodes;
}

function buildFlujo(data) {
  const pasos = (data?.pasos || []).map(String).filter(Boolean).slice(0, 6);
  if (pasos.length < 3) return null;
  return pasos.map((p, i) => ({
    id: 's' + i, text: str(p, 46), type: 'step', step: i + 1,
    parent: i ? 's' + (i - 1) : null, pal: PALETTE[i % PALETTE.length],
  }));
}

const str = (v, n) => String(v || '').trim().slice(0, n);

/* ================= Layout por tipo ================= */

function layoutMental(nodes) {
  const cx = W / 2, cy = H / 2;
  const branches = nodes.filter(n => n.type === 'branch');
  const at = (n, x, y) => { n.x = clampX(x); n.y = clampY(y); };
  at(nodes[0], cx, cy);
  branches.forEach((b, i) => {
    const ang = -Math.PI / 2 + i * (Math.PI * 2 / branches.length);
    at(b, cx + Math.cos(ang) * 300, cy + Math.sin(ang) * 185);
    const leaves = nodes.filter(n => n.parent === b.id);
    leaves.forEach((l, j) => {
      const la = ang + (j - (leaves.length - 1) / 2) * 0.62;
      at(l, b.x + Math.cos(la) * 185, b.y + Math.sin(la) * 115);
    });
  });
}

function layoutConceptual(nodes) {
  const branches = nodes.filter(n => n.type === 'branch');
  nodes[0].x = W / 2; nodes[0].y = 96;
  branches.forEach((b, i) => {
    b.x = clampX(W * (i + 1) / (branches.length + 1));
    b.y = 322;
    const subs = nodes.filter(n => n.parent === b.id);
    subs.forEach((s, j) => {
      s.x = clampX(b.x + (j - (subs.length - 1) / 2) * 185);
      s.y = 540;
    });
  });
}

function layoutFlujo(nodes) {
  const COLS = 3;
  const rows = Math.ceil(nodes.length / COLS);
  const y0 = Math.max(120, (H - (rows - 1) * 200) / 2); // centrado vertical
  nodes.forEach((n, i) => {
    const r = Math.floor(i / COLS);
    const c = r % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS); // serpiente
    n.x = 190 + c * 310;
    n.y = y0 + r * 200;
  });
}

const clampX = x => Math.max(PADX, Math.min(W - PADX, x));
const clampY = y => Math.max(PADY, Math.min(H - PADY, y));

/* Separación anti-encimado: empuja pares que se solapan por el
   eje de menor solape. El centro queda fijo (ancla del mapa). */
function relax(nodes, iters = 70) {
  const hw = n => Math.min(104, 30 + n.text.length * 3.4);
  const hh = n => (n.type === 'center' ? 34 : n.type === 'leaf' ? 24 : 30);
  for (let it = 0; it < iters; it++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const ox = hw(a) + hw(b) + 14 - Math.abs(a.x - b.x);
      const oy = hh(a) + hh(b) + 12 - Math.abs(a.y - b.y);
      if (ox <= 0 || oy <= 0) continue;
      moved = true;
      const aFix = a.type === 'center', bFix = b.type === 'center';
      if (ox < oy) {
        const s = (a.x < b.x ? -1 : 1) * ox / (aFix || bFix ? 1 : 2);
        if (!aFix) a.x = clampX(a.x + s);
        if (!bFix) b.x = clampX(b.x - s);
      } else {
        const s = (a.y < b.y ? -1 : 1) * oy / (aFix || bFix ? 1 : 2);
        if (!aFix) a.y = clampY(a.y + s);
        if (!bFix) b.y = clampY(b.y - s);
      }
    }
    if (!moved) break;
  }
}

/* ================= API de alto nivel ================= */

/* Pide el organizador `kind` al motor y devuelve el modelo
   posicionado { kind, title, nodes } — o null si falló. */
export async function makeBoardModel(kind, topic) {
  const fetchers = { mental: fetchMental, conceptual: fetchConceptual, flujo: fetchFlujo };
  const builders = { mental: buildMental, conceptual: buildConceptual, flujo: buildFlujo };
  const layouts  = { mental: layoutMental, conceptual: layoutConceptual, flujo: layoutFlujo };
  const data = await fetchers[kind](topic);
  const nodes = builders[kind](data);
  if (!nodes) return null;
  nodes.forEach(n => { n.mine = false; n.learned = false; });
  layouts[kind](nodes);
  relax(nodes);
  return { kind, title: str(data.titulo, 60) || KINDS[kind].label, nodes };
}
