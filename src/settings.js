/* ============================================================
   MIRA · Settings — panel del cerebro 🧠
   Pega tu clave GRATIS de Gemini (Google AI Studio) y MIRA
   funciona en cualquier computadora, sin servidor.
   La clave vive SOLO en tu navegador (localStorage).
   ============================================================ */

import { getGeminiKey, setGeminiKey, validateGeminiKey, engineMode, isLocalHost, needsSetup } from './engine.js';
import { spanishVoices, getVoicePref, setVoicePref, speak } from './mira.js';
import { sfx } from './sfx.js';

export function initSettings() {
  const btn = document.getElementById('setupBtn');
  if (btn) btn.addEventListener('click', () => openSettings());
  // Si está en la web (Vercel) y no hay clave: abrir solo, con bienvenida
  if (needsSetup()) setTimeout(() => openSettings(true), 600);
}

export function openSettings(firstTime = false) {
  document.getElementById('settingsOverlay')?.remove();

  const hasKey = !!getGeminiKey();
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.id = 'settingsOverlay';
  el.innerHTML = `
    <div class="modal card" role="dialog" aria-label="Cerebro de MIRA">
      <button class="modal__close" title="Cerrar">✕</button>
      <h3 class="modal__title">🧠 El cerebro de MIRA</h3>
      ${firstTime ? `<p class="modal__lead">¡Hola! Para que MIRA piense, conéctale su cerebro. Solo toma 1 minuto y es <b>gratis</b>:</p>` : ''}
      <ol class="modal__steps">
        <li>Entra a <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a> (cuenta de Google).</li>
        <li>Toca <b>"Create API key"</b> y copia la clave.</li>
        <li>Pégala aquí abajo y listo ✨</li>
      </ol>
      <div class="modal__row">
        <input id="gkeyInput" type="password" placeholder="Pega tu clave de Gemini (AIza…)" value="${hasKey ? getGeminiKey() : ''}" autocomplete="off" spellcheck="false">
      </div>
      <div class="modal__row choices">
        <button class="btn btn--primary" id="gkeySave">Conectar 🔌</button>
        ${hasKey ? '<button class="btn btn--ghost" id="gkeyRemove">Quitar clave</button>' : ''}
      </div>
      <div class="modal__status" id="gkeyStatus">${statusLine()}</div>
      <hr style="border:none;border-top:2px dashed var(--line);margin:14px 0;">
      <h4 class="modal__title" style="font-size:17px;margin-bottom:6px;">🗣️ Voz de MIRA</h4>
      <div class="modal__row" style="display:flex;gap:8px;">
        <select id="voiceSelect" style="flex:1;border:2px solid var(--line-2);border-radius:var(--r-md);padding:11px 12px;font-family:var(--font-body);font-size:14px;color:var(--ink);outline:none;">
          <option value="">✨ La mejor disponible (auto)</option>
          ${spanishVoices().map(v => `<option value="${v.name}" ${getVoicePref() === v.name ? 'selected' : ''}>${v.name} (${v.lang})${/google/i.test(v.name) ? ' ⭐' : ''}</option>`).join('')}
        </select>
        <button class="btn btn--ghost" id="voiceTest" style="padding:10px 16px;">▶ Probar</button>
      </div>
      <p class="modal__note">🔒 Tu clave se guarda solo en este navegador. Nunca sale de tu computadora ni se sube a ningún lado.</p>
    </div>`;
  document.body.appendChild(el);

  const close = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('.modal__close').addEventListener('click', close);

  const status = el.querySelector('#gkeyStatus');
  const input = el.querySelector('#gkeyInput');

  el.querySelector('#gkeySave').addEventListener('click', async () => {
    const key = input.value.trim();
    if (!key) { status.textContent = '✏️ Pega una clave primero.'; input.focus(); return; }
    status.textContent = '⏳ Probando la clave…';
    try {
      await validateGeminiKey(key);
      setGeminiKey(key);
      sfx.sparkle();
      status.textContent = '✅ ¡Conectado! MIRA ya piensa con Gemini. Puedes cerrar esta ventana.';
    } catch (e) {
      sfx.buzz();
      status.textContent = '❌ Esa clave no funcionó ' + (e.message || '') + ' — revisa que la copiaste completa.';
    }
  });

  el.querySelector('#gkeyRemove')?.addEventListener('click', () => {
    setGeminiKey('');
    status.textContent = statusLine();
    input.value = '';
    sfx.pop();
  });

  // — voz: guardar preferencia + probar —
  const sel = el.querySelector('#voiceSelect');
  sel.addEventListener('change', () => { setVoicePref(sel.value); sfx.pop(); });
  el.querySelector('#voiceTest').addEventListener('click', () => {
    speak('¡Hola! Soy MIRA y así suena mi voz. ¿Te gusta?');
  });
}

function statusLine() {
  if (engineMode() === 'gemini') return '🟢 Cerebro actual: Gemini (clave conectada).';
  if (isLocalHost()) return '🟡 Cerebro actual: Claude local (server.js en esta compu). Pega una clave para usar Gemini.';
  return '🔴 Sin cerebro todavía: pega tu clave de Gemini para empezar.';
}
