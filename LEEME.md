# MIRA v2 — experiencia guiada (20 frames)

MIRA, tu compañera de aprendizaje con IA. Reescritura limpia y modular guiada por
el storyboard oficial de 20 frames: una **historia paso a paso**, no un workspace.

## Cómo usarlo
1. Doble clic en **`iniciar.bat`** (abre el navegador y arranca el servidor).
2. Deja abierta la ventana negra del servidor mientras juegas.

> Requisitos: **Node.js** + **Claude Code** con tu sesión iniciada (el motor usa tu
> suscripción vía `claude -p`, sin API de pago ni claves).

## La experiencia (los 20 frames)
- **Inicio (1-5):** MIRA se presenta (voz+texto) → eliges tema (o subes archivo) →
  ratifica → ¿tienes base? → eliges rol (Profesora / Aprendiz).
- **MIRA Profesora (6-10):** acepta rol y avisa el cambio → contextualiza → **pizarrón** →
  **apoyo visual** (balanza/flujo) → **🎮 MINIJUEGOS** (quiz, verdadero/falso, ordenar pasos,
  unir parejas, completar — generados por el motor según el tema; se ganan ⭐ estrellas y
  MIRA reacciona: celebra si aciertas, se pone triste y te anima si fallas) →
  checkpoint "¿todo claro?".
- **Cambio de roles (11-20):** resumen → transición → **MIRA aprendiz** pide ayuda →
  tú le explicas (escribir/hablar/dibujar) → ¿algo más? → ella demuestra paso a paso →
  **encuentra el error** (si un paso está mal, lo tocas y se lo corriges) → recap "Hoy aprendí" + ⭐.

## Expresiones contextuales
MIRA cambia de cara según lo que pasa: celebra 🎉 y se sorprende 😮 cuando aciertas,
se pone triste 😢 y luego te anima 💪 cuando fallas, piensa 🤔 cuando prepara algo,
tiene "¡ideas!" 💡 al proponer juegos, y en reposo va rotando expresiones cada ~2.6s.

## Estructura (modular)
```
index.html            shell (fuentes + CSS)
styles/               tokens · base · mira · screen · visuals   (CSS por pieza)
src/
  app.js              máquina de estados (orden de pantallas)
  state.js engine.js  sesión + puente al motor (streaming + JSON tolerante)
  mira.js             avatar de MEDIO CUERPO + moods + burbuja + voz + confeti
  screens/            welcome · topic · base · role · teach · summary · learner
server.js             motor (claude -p) + servidor estático (puerto 8787)
avatars/  *.svg        sprites y retratos
```

## Detalles clave
- **MIRA siempre de medio cuerpo** (cintura para arriba) — retrato recortado con máscara.
- **Cualquier tema:** el pizarrón y el apoyo visual los genera el motor en JSON y se
  dibujan con HTML/CSS (fiable, sin mermaid). La balanza es ideal para ecuaciones.
- **Voz:** botón 🔊 en la barra superior (Web Speech API).
- **Modelo:** `server.js`, `MODEL = "sonnet"` (cambia a `"opus"` para más calidad).

## Nota de entrega (para Fernanda)
Con tu suscripción, MIRA corre **en tu PC con el servidor encendido**. Para que Fernanda
la use sola haría falta un motor con API (clave) o desplegar en la nube. Esta versión es
ideal para desarrollar y demostrar.
