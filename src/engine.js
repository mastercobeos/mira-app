/* ============================================================
   MIRA · Engine — CEREBRO DUAL:
   · "local"  → server.js (claude -p con la suscripción, en tu PC)
   · "gemini" → API de Gemini directa desde el navegador con la
     clave del usuario (localStorage). Ideal para Vercel/GitHub:
     cada persona pega su clave gratis y MIRA funciona sola.
   Streaming + extracción tolerante de JSON.
   ============================================================ */

const BASE = ''; // mismo origen (server.js sirve la app en local)
const GEMINI_MODEL = 'gemini-2.5-flash';

/* — Clave de Gemini (vive SOLO en el navegador del usuario) — */
export function getGeminiKey() { try { return localStorage.getItem('mira.gemini.key') || ''; } catch { return ''; } }
export function setGeminiKey(k) { try { k ? localStorage.setItem('mira.gemini.key', k.trim()) : localStorage.removeItem('mira.gemini.key'); } catch {} }
export function engineMode() { return getGeminiKey() ? 'gemini' : 'local'; }
export function isLocalHost() { return /^(localhost|127\.|192\.168\.|\[::1\])/.test(location.hostname); }
/* true = está en la web (Vercel) sin clave → hay que configurar */
export function needsSetup() { return !getGeminiKey() && !isLocalHost(); }

/* Valida una clave haciendo una llamada mínima. */
export async function validateGeminiKey(key) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key.trim())}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Di solo: hola' }] }] }) });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error('(' + res.status + ') ' + t.slice(0, 140)); }
  return true;
}

/* ---- 📎 Material de estudio (se antepone a TODOS los prompts) ----
   La UI (panel de materiales) llama setStudyContext() al agregar/quitar
   archivos; así cualquier pantalla que hable con el motor lo aprovecha
   sin tener que tocar su prompt. */
let _studyContext = '';
export function setStudyContext(text) { _studyContext = (text || '').trim(); }
function withStudy(prompt) {
  if (!_studyContext) return prompt;
  return `MATERIAL DE ESTUDIO que el estudiante subió (úsalo como referencia si viene al caso; si no aplica, ignóralo):\n"""\n${_studyContext}\n"""\n\n${prompt}`;
}

/* Estilo de MIRA para niños (13-17). Va en todos los prompts. */
export const KID_STYLE = `Eres MIRA, una compañera de aprendizaje para chicos de 13 a 17 años.
Hablas en español, cálida, cercana y divertida. Reglas de estilo:
- Frases cortas y claras. Máximo 2-3 oraciones por turno.
- Una sola idea por turno. Usa 1-2 emojis, nunca más.
- Nada de markdown, asteriscos ni listas largas en el texto conversacional.
- Termina, cuando toque, con una pregunta o mini reto.
- Trato amable pero NEUTRO y profesional: NUNCA uses apodos ni términos cariñosos ("mi amor", "amor", "cariño", "corazón", "mi vida", "bebé", "reina", "linda", etc.) ni un tono romántico o meloso. Diríjete al estudiante de "tú", como una buena maestra o compañera, sin motes.`;

/* ---- transporte LOCAL (server.js → claude -p) ---- */
async function streamLocal(prompt, onChunk) {
  const res = await fetch(BASE + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok || !res.body) throw new Error('motor local no disponible (' + res.status + ')');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let acc = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    acc += dec.decode(value, { stream: true });
    onChunk && onChunk(acc);
  }
  return acc.trim();
}

/* ---- transporte GEMINI (SSE directo desde el navegador) ---- */
async function streamGemini(prompt, onChunk, extraParts = []) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(getGeminiKey())}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, ...extraParts] }] }) });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new Error('gemini ' + res.status + ' ' + t.slice(0, 120));
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', acc = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const j = JSON.parse(payload);
        const t = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
        if (t) { acc += t; onChunk && onChunk(acc); }
      } catch { /* línea parcial: se ignora */ }
    }
  }
  return acc.trim();
}

/* Llama al motor activo y transmite el texto por onChunk(textoAcumulado). */
export async function stream(prompt, onChunk) {
  prompt = withStudy(prompt);
  if (engineMode() === 'gemini') return streamGemini(prompt, onChunk);
  try { return await streamLocal(prompt, onChunk); }
  catch (e) { if (needsSetup()) throw new Error('SETUP'); throw e; }
}

/* Igual que stream pero sin callback (espera el texto completo). */
export async function ask(prompt) {
  return stream(prompt, null);
}

/* Envía un dibujo (dataURL) + pregunta (visión). */
export async function askImage(prompt, imageDataUrl) {
  if (engineMode() === 'gemini') {
    const b64 = String(imageDataUrl || '').replace(/^data:image\/\w+;base64,/, '');
    return streamGemini(prompt, null, [{ inline_data: { mime_type: 'image/png', data: b64 } }]);
  }
  const res = await fetch(BASE + '/chat-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image: imageDataUrl })
  });
  const dec = new TextDecoder();
  const reader = res.body.getReader();
  let acc = '';
  while (true) { const { value, done } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); }
  return acc.trim();
}

/* Extrae el primer objeto/array JSON de un texto (tolera ```json, prosa alrededor). */
export function extractJSON(text) {
  if (!text) return null;
  // bloque ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  // primer { ... } balanceado
  const start = raw.search(/[\[{]/);
  if (start < 0) return null;
  const open = raw[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { try { return JSON.parse(raw.slice(start, i + 1)); } catch { return null; } } }
  }
  return null;
}

/* Pide JSON con reintento: si no parsea, re-pregunta pegando el error. */
export async function askJSON(prompt, { retries = 1 } = {}) {
  let last = '';
  for (let attempt = 0; attempt <= retries; attempt++) {
    const p = attempt === 0 ? prompt
      : `${prompt}\n\nTu respuesta anterior no fue JSON válido. Devuélveme SOLO el JSON, sin texto extra ni markdown.`;
    last = await ask(p);
    const json = extractJSON(last);
    if (json) return json;
  }
  return null;
}
