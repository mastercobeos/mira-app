/* Frames 2-3 — ¿Qué quieres aprender? (escribir o subir archivo) → ratifica el tema. */
import { state, save } from '../state.js';
import { miraPortrait, bubble, setMood, speak } from '../mira.js';

const IDEAS = [
  '🌋 Los volcanes', '🪐 El sistema solar', '🦖 Los dinosaurios', '➗ Ecuaciones lineales',
  '🐠 Animales del mar', '🦴 El cuerpo humano', '🌱 Cómo crecen las plantas', '🎨 Mezclar colores',
];

export function topic(app, screen) {
  screen.innerHTML = `
    <div class="act">
      <div class="act__mira">${miraPortrait({ role: 'learner', mood: 'curious' })}</div>
      <div class="act__body">
        <div class="screen__eyebrow">🎯 Paso 1 · Elige tema</div>
        <h2 class="screen__title">¿Qué quieres descubrir hoy? 🔍</h2>
        ${bubble('Escribe lo que te dé curiosidad… ¡o súbeme tus apuntes y los vemos juntos! 🎉', { left: true })}
        <div class="field">
          <input id="topicInput" type="text" placeholder="ej: los volcanes 🌋, ecuaciones lineales ➗…" autocomplete="off">
          <button class="field__send" id="topicSend" title="Continuar">→</button>
        </div>
        <label class="dropzone" id="dropzone">
          <input type="file" id="fileInput" hidden accept=".pdf,.txt,.png,.jpg,.jpeg,.docx,.pptx">
          <span id="dzText">Arrastra apuntes o <strong>busca un archivo</strong> · PDF, imagen, TXT</span>
        </label>
        <div class="ideas">
          ${IDEAS.map(i => `<button class="idea" data-idea="${i.replace(/^[^\s]+\s/, '')}">${i}</button>`).join('')}
        </div>
      </div>
    </div>`;

  const input = screen.querySelector('#topicInput');
  const dz = screen.querySelector('#dropzone');
  const fileInput = screen.querySelector('#fileInput');

  screen.querySelectorAll('.idea').forEach(b =>
    b.addEventListener('click', () => { input.value = b.dataset.idea; input.focus(); }));

  // archivo
  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('hover'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('hover'); }));
  dz.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

  function handleFile(file) {
    if (!file) return;
    screen.querySelector('#dzText').innerHTML = `📎 <strong>${file.name}</strong>`;
    const r = new FileReader();
    r.onload = ev => { state.file = { name: file.name, data: ev.target.result, type: file.type }; save(); };
    if (file.type.startsWith('image/')) r.readAsDataURL(file); else r.readAsText(file);
    if (!input.value) input.value = file.name.replace(/\.[^.]+$/, '');
  }

  const submit = () => {
    const t = input.value.trim();
    if (!t) { input.focus(); dz.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 200 }); return; }
    state.topic = t; save();
    ratify(app, screen);
  };
  screen.querySelector('#topicSend').addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  setTimeout(() => input.focus(), 300);
}

/* Frame 3 — MIRA ratifica el tema y avanza. */
function ratify(app, screen) {
  const body = screen.querySelector('.act__body');
  setMood(screen, 'happy');
  body.innerHTML = `
    <div class="screen__eyebrow">🎯 Paso 1 · ¡Listo!</div>
    <h2 class="screen__title">¡Perfecto! 🎉</h2>
    ${bubble('Trabajaremos sobre…', { left: true })}
    <div class="topic-badge"><span>${state.topic}</span><span class="check">✓</span></div>
    <button class="btn btn--primary btn--lg" id="toBase">Seguir →</button>`;
  speak('¡Perfecto! Trabajaremos sobre ' + state.topic);
  body.querySelector('#toBase').addEventListener('click', () => app.go('base'));
}
