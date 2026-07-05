/* ============================================================
   MIRA — Servidor local
   Motor: tu SUSCRIPCIÓN de Claude vía Claude Code (claude -p).
   No usa la API de pago de Anthropic ni ninguna clave.
   El HTML le habla a http://localhost:8787
   ============================================================ */

const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const PORT = 8787;
const MODEL = "sonnet"; // rápido y suficiente para tutoría. Cambia a "opus" para máxima calidad.

/* Construye un prompt de texto a partir de system + historial */
function buildPrompt(system, messages) {
  const convo = (messages || [])
    .map((m) => (m.role === "user" ? "Estudiante" : "MIRA") + ": " + (m.content || ""))
    .join("\n\n");
  return (system || "") + "\n\n=== Conversación ===\n" + convo;
}

/* Ejecuta claude -p y transmite (stream) su salida a la respuesta HTTP */
function runClaude(args, prompt, res) {
  const isWin = process.platform === "win32";
  const child = spawn(isWin ? "claude.cmd" : "claude", args, { shell: isWin });

  let errBuf = "";
  child.stdout.on("data", (d) => res.write(d));
  child.stderr.on("data", (d) => (errBuf += d.toString()));
  child.on("error", (e) => {
    res.write("\n\n[ERROR] No pude ejecutar Claude Code: " + e.message);
    res.end();
  });
  child.on("close", (code) => {
    if (code !== 0 && errBuf) res.write("\n\n[ERROR] " + errBuf.slice(0, 600));
    res.end();
  });
  child.stdin.write(prompt);
  child.stdin.end();
  return child;
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch (_) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  /* --- Chat de texto (enseñar, preguntar, JSON) --- */
  if (req.method === "POST" && req.url === "/chat") {
    const { system, messages, prompt: rawPrompt } = await readBody(req);
    // app.js (MIRA) ya construye el prompt completo y lo manda en `prompt`.
    // Como respaldo, aceptamos {system, messages}.
    const prompt = rawPrompt || buildPrompt(system, messages);
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    runClaude(["-p", "--model", MODEL], prompt, res);
    return;
  }

  /* --- Chat con imagen (opción Dibujar → visión) --- */
  if (req.method === "POST" && req.url === "/chat-image") {
    const { system, prompt: userPrompt, image } = await readBody(req);
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    try {
      const b64 = String(image || "").replace(/^data:image\/\w+;base64,/, "");
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mira-"));
      const imgPath = path.join(dir, "dibujo.png");
      fs.writeFileSync(imgPath, Buffer.from(b64, "base64"));
      const full =
        (system || "") +
        "\n\nEl estudiante dibujó su explicación. Observa la imagen en esta ruta y evalúala:\n" +
        imgPath +
        "\n\n" + (userPrompt || "");
      const isWin = process.platform === "win32";
      const child = spawn(
        isWin ? "claude.cmd" : "claude",
        ["-p", "--model", MODEL, "--allowedTools", "Read", "--dangerously-skip-permissions"],
        { shell: isWin, cwd: dir }
      );
      let errBuf = "";
      child.stdout.on("data", (d) => res.write(d));
      child.stderr.on("data", (d) => (errBuf += d.toString()));
      child.on("error", (e) => { res.write("\n\n[ERROR] " + e.message); res.end(); });
      child.on("close", (code) => {
        if (code !== 0 && errBuf) res.write("\n\n[ERROR] " + errBuf.slice(0, 400));
        res.end();
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
      });
      child.stdin.write(full);
      child.stdin.end();
    } catch (e) {
      res.write("\n\n[ERROR] " + e.message);
      res.end();
    }
    return;
  }

  /* --- Servir la app (mismo origen: sin CORS, sin file://) --- */
  if (req.method === "GET") {
    let rel = decodeURIComponent((req.url || "/").split("?")[0]);
    if (rel === "/") rel = "/index.html";
    const safeRel = path.normalize(rel).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(__dirname, safeRel);
    if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end("prohibido"); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("No encontrado"); return; }
      const types = {
        ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml", ".ico": "image/x-icon",
      };
      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("MIRA: usa POST /chat o /chat-image");
});

server.listen(PORT, () => {
  console.log("========================================");
  console.log("  MIRA — servidor listo");
  console.log("  Motor: tu suscripción de Claude (Claude Code)");
  console.log("  Escuchando en http://localhost:" + PORT);
  console.log("  Abre index.html (o usa iniciar.bat).");
  console.log("========================================");
});
