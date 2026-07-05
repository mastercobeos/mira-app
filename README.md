# MIRA 💜 — Tu compañera de aprendizaje con IA

App educativa interactiva para chicos de 13-17 años. **No es un chat: es un juego.**
MIRA enseña cualquier tema con retos (pizarra mágica, diagramas de nodos arrastrables,
minijuegos con estrellas ⭐) y al final **cambian de roles**: el estudiante le enseña a ella.

![tema](https://img.shields.io/badge/tema-juego%20plastilina-1E88F0) ![motor](https://img.shields.io/badge/cerebro-Gemini%20o%20Claude%20local-FFC93C)

## ✨ Qué hace

- **MIRA Profesora**: contextualiza el tema → *Reto 1: Pizarra mágica* (completa los huecos)
  → *Reto 2: Diagrama de nodos* (arrastra y suelta) → *Reto 3: 3 minijuegos*
  (quiz, verdadero/falso, ordenar, parejas, completar) → resumen.
- **Cambio de roles**: MIRA se vuelve aprendiz "angustiada" y el estudiante le explica
  (escribiendo, hablando 🎤 o dibujando 🎨). Ella demuestra lo que entendió y el
  estudiante corrige sus errores tocándolos.
- **Expresiones vivas**: MIRA celebra, se sorprende, se pone triste y te anima según
  cómo vayas jugando. Gana ⭐ estrellas, confeti y sonidos.

## 🧠 El cerebro (dos modos, sin tocar código)

| Modo | Cómo | Para quién |
|---|---|---|
| **Gemini API** | Botón 🧠 en la app → pega tu clave gratis de [Google AI Studio](https://aistudio.google.com/app/apikey) | Cualquier persona, en la web (Vercel) o local |
| **Claude local** | `iniciar.bat` (usa tu suscripción de Claude Code vía `server.js`) | Desarrollo en tu PC |

La clave de Gemini se guarda **solo en el navegador del usuario** (localStorage) —
nunca se sube al repo ni a ningún servidor.

## 🚀 Usarlo

**En la web (recomendado para compartir):** entra al deploy de Vercel, toca 🧠,
pega tu clave de Gemini y juega.

**En tu PC:**
```bash
node server.js   # o doble clic en iniciar.bat
# abre http://localhost:8787
```
Requisitos locales: Node.js (+ Claude Code si quieres el modo Claude).

## 📦 Desplegar tu propia copia

1. Haz fork/clona este repo.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. Framework: **Other** (es HTML/JS estático, sin build). Deploy.
4. Comparte la URL: cada usuario conecta su propia clave con el botón 🧠.

## 🗂️ Estructura

```
index.html            shell (HUD juego + decoración flotante)
styles/               tokens · base · mira · screen · visuals · games · activities · settings
src/
  app.js              máquina de estados (pantallas)
  engine.js           cerebro dual (Gemini API ↔ claude -p local) + JSON tolerante
  state.js            sesión + estrellas
  mira.js             avatar (sprites, expresiones, voz TTS, confeti)
  games.js            minijuegos (quiz/vf/ordenar/parejas/hueco)
  activities.js       pizarra mágica + diagrama de nodos drag&drop
  sfx.js              sonidos de juego sintetizados (WebAudio)
  settings.js         panel 🧠 (clave de Gemini)
  screens/            welcome · topic · base · role · teach · summary · learner
avatars/              sprites de MIRA (medio cuerpo, 2 roles × expresiones)
server.js             motor local opcional (claude -p, puerto 8787)
```

Hecho con 💜 — proyecto educativo.
