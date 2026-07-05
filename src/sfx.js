/* ============================================================
   MIRA · SFX — sonidos de juego sintetizados (WebAudio).
   Sin archivos: ding (acierto), buzz (fallo), sparkle (estrella),
   pop (tocar), whoosh (avanzar). Se activan con gestos del usuario.
   ============================================================ */

let ctx = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = .12, delay = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(c.destination);
  const t = c.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.start(t); o.stop(t + dur + .03);
}

export const sfx = {
  ding()    { tone(660, .14, 'triangle', .14); tone(990, .22, 'triangle', .12, .09); },
  buzz()    { tone(150, .22, 'sawtooth', .07); tone(110, .18, 'sawtooth', .05, .06); },
  sparkle() { [880, 1175, 1568, 2093].forEach((f, i) => tone(f, .13, 'sine', .09, i * .06)); },
  pop()     { tone(520, .07, 'square', .06); },
  whoosh()  { tone(392, .1, 'sine', .08); tone(523, .12, 'sine', .08, .07); tone(659, .16, 'sine', .08, .14); },
};
