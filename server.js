const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const { exec } = require("child_process");
const { WebSocketServer } = require("ws");
const os     = require("os");
const QRCode = require("qrcode");

// ── Constantes ────────────────────────────────────────────────────────────────
const { version: VERSION } = require("./package.json");
const PORT = 3000;
const SCRIPTS_DIR = path.join(__dirname, "scripts");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
};

const PASTEL_COLORS = [
  { id:0, bg:"#FFB3B3", text:"#8B1A1A", label:"Coral"       },  // rojo  0°
  { id:1, bg:"#FFD4A0", text:"#7A3D00", label:"Naranja"     },  // naranja 30°
  { id:2, bg:"#FFF4A0", text:"#6B5500", label:"Amarillo"    },  // amarillo 60°
  { id:3, bg:"#AEFFCC", text:"#0A5C30", label:"Menta"       },  // verde 140°
  { id:4, bg:"#A0DEFF", text:"#0A3D6B", label:"Celeste"     },  // azul claro 200°
  { id:5, bg:"#A0AAFF", text:"#0A1580", label:"Periwinkle"  },  // azul/violeta 235°
  { id:6, bg:"#CCA0FF", text:"#420A80", label:"Lila"        },  // lila 270°
  { id:7, bg:"#FFB3E8", text:"#800A55", label:"Rosa Fucsia" },  // fucsia 320°
];

// ── Config persistente ────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, "config.json");
const DEFAULT_CONFIG = {
  speakerSize: 22, noteSize: 42, contentWidth: 80,
  hideCursor: false, showServerIP: false,
};

function loadSavedConfig() {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}
function persistConfig(cfg) {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); } catch {}
}

// ── Estado global ─────────────────────────────────────────────────────────────
const state = {
  activeScriptId: null,
  script: null,
  playhead: {
    blockIndex: 0,
    lineIndex:  0,
    scrollPx:   0,
    playing:    false,
    speed:      45,
    fontSize:   56,
    config:     loadSavedConfig(),
  },
  clock: {
    visible:  true,
    items:    ["clock"],
    timerSec: 600,
    chronoStart:   null,
    chronoElapsed: 0,    // ms acumulados cuando está pausado
    timerStart:    null,
  },
  clients: new Map(),       // ws → {role, id, name}
};

// ── Utilidades de scripts ─────────────────────────────────────────────────────
if (!fs.existsSync(SCRIPTS_DIR)) fs.mkdirSync(SCRIPTS_DIR, { recursive: true });

function listScripts() {
  return fs.readdirSync(SCRIPTS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, f), "utf8"));
        return { id: f, title: raw.title || f, updatedAt: raw.updatedAt };
      } catch { return { id: f, title: f }; }
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function loadScript(id) {
  const p = path.join(SCRIPTS_DIR, id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function saveScript(script) {
  script.updatedAt = Date.now();
  const id = script.id || `script_${Date.now()}.json`;
  script.id = id;
  fs.writeFileSync(path.join(SCRIPTS_DIR, id), JSON.stringify(script, null, 2));
  return id;
}

function deleteScript(id) {
  const p = path.join(SCRIPTS_DIR, id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ── Utilidades de red ─────────────────────────────────────────────────────────
function getNetworkIPs() {
  const all = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) all.push(addr.address);
    }
  }
  const preferred =
    all.find(ip => /^192\.168\./.test(ip)) ||
    all.find(ip => /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) ||
    all[0] || null;
  return { all, preferred };
}

async function buildNetworkInfo() {
  const { all, preferred } = getNetworkIPs();
  if (!preferred) return { allIps: all, preferredIp: null, qrCodes: null };
  const base = `http://${preferred}:${PORT}`;
  const opts = { type: "svg", margin: 2, color: { dark: "#111111", light: "#ffffff" }, width: 220 };
  const [editor, remote, teleprompter] = await Promise.all([
    QRCode.toString(base + "/",                  opts),
    QRCode.toString(base + "/remote.html",       opts),
    QRCode.toString(base + "/teleprompter.html", opts),
  ]);
  return { version: VERSION, allIps: all, preferredIp: preferred, qrCodes: { editor, remote, teleprompter } };
}

// ── Servidor HTTP ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/studio.html";

  // API endpoints
  if (urlPath === "/api/colors") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(PASTEL_COLORS));
  }

  if (urlPath === "/api/network") {
    buildNetworkInfo().then(info => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(info));
    }).catch(() => {
      res.writeHead(500); res.end("{}");
    });
    return;
  }

  // ── Update via git pull ──────────────────────────────────────────────────
  if (urlPath === "/api/update") {
    exec("git pull", { cwd: __dirname }, (err, stdout, stderr) => {
      const out = (stdout + stderr).trim();
      const upToDate = /already up.to.date|ya está actualizado/i.test(out);
      const needsDeps = !upToDate && /package\.json|pnpm-lock/i.test(out);
      if (needsDeps) {
        exec("pnpm install", { cwd: __dirname }, (err2, out2) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ output: out + "\n\n" + out2.trim(), upToDate: false, needsRestart: true }));
        });
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ output: out, upToDate, needsRestart: !upToDate }));
      }
    });
    return;
  }

  if (urlPath === "/api/restart") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    setTimeout(() => process.exit(0), 300);
    return;
  }

  // Servir scripts individuales: /scripts/<id>
  if (urlPath.startsWith("/scripts/") && !urlPath.includes("..")) {
    const scriptPath = path.join(SCRIPTS_DIR, path.basename(urlPath));
    fs.readFile(scriptPath, (err, data) => {
      if (err) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    });
    return;
  }

  const filePath = path.join(__dirname, "public", urlPath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(data);
  });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(obj, roles = null, exclude = null) {
  const data = JSON.stringify(obj);
  for (const [ws, info] of state.clients) {
    if (ws === exclude) continue;
    if (roles && !roles.includes(info.role)) continue;
    if (ws.readyState === 1) ws.send(data);
  }
}

function broadcastAll(obj, exclude = null) {
  broadcast(obj, null, exclude);
}

wss.on("connection", (ws, req) => {
  const rawIp = req.socket.remoteAddress || "";
  const ip = rawIp.replace(/^::ffff:/, "").replace("::1", "localhost");
  state.clients.set(ws, { role: "unknown", id: null, name: null, ip });

  // Enviar estado inicial
  send(ws, {
    type: "init",
    colors: PASTEL_COLORS,
    scripts: listScripts(),
    activeScriptId: state.activeScriptId,
    script: state.script,
    playhead: state.playhead,
    config: state.playhead.config || {},
    clock: state.clock,
  });

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(ws, msg);
  });

  ws.on("close", () => {
    const info = state.clients.get(ws);
    state.clients.delete(ws);
    broadcastAll({ type: "clients_updated", clients: getClientList() });
  });
});

function getClientList() {
  const list = [];
  for (const [, info] of state.clients) {
    if (info.role !== "unknown") list.push({ role: info.role, name: info.name, ip: info.ip });
  }
  return list;
}

function handleMessage(ws, msg) {
  const info = state.clients.get(ws);

  switch (msg.type) {

    // ── Registro de cliente ──────────────────────────────────────────────────
    case "register": {
      info.role = msg.role; // "teleprompter" | "studio" | "remote"
      info.name = msg.name || msg.role;
      broadcastAll({ type: "clients_updated", clients: getClientList() });
      break;
    }

    // ── Scripts ──────────────────────────────────────────────────────────────
    case "list_scripts":
      send(ws, { type: "scripts_list", scripts: listScripts() });
      break;

    case "save_script": {
      const id = saveScript(msg.script);
      broadcastAll({ type: "scripts_list", scripts: listScripts() });
      send(ws, { type: "script_saved", id });
      break;
    }

    case "delete_script": {
      deleteScript(msg.id);
      if (state.activeScriptId === msg.id) {
        state.activeScriptId = null;
        state.script = null;
        broadcastAll({ type: "script_loaded", script: null, activeScriptId: null });
      }
      broadcastAll({ type: "scripts_list", scripts: listScripts() });
      break;
    }

    case "load_script": {
      const sc = loadScript(msg.id);
      if (!sc) break;
      state.script = sc;
      state.activeScriptId = msg.id;
      state.playhead.blockIndex = 0;
      state.playhead.lineIndex  = 0;
      state.playhead.scrollPx   = 0;
      state.playhead.playing    = false;
      broadcastAll({ type: "script_loaded", script: sc, activeScriptId: msg.id });
      break;
    }

    // ── Playhead ─────────────────────────────────────────────────────────────
    case "play":
      state.playhead.playing = true;
      broadcastAll({ type: "play" });
      break;

    case "pause":
      state.playhead.playing = false;
      broadcastAll({ type: "pause" });
      break;

    case "reset":
      state.playhead = { ...state.playhead, blockIndex:0, lineIndex:0, scrollPx:0, playing:false };
      broadcastAll({ type: "reset" });
      break;

    case "scroll_to":
      state.playhead.scrollPx   = msg.px   ?? state.playhead.scrollPx;
      state.playhead.blockIndex = msg.block ?? state.playhead.blockIndex;
      broadcast({ type: "scroll_to", px: state.playhead.scrollPx, block: state.playhead.blockIndex },
        ["teleprompter"], ws);
      break;

    case "sync_scroll":
      state.playhead.scrollPx = msg.px;
      break;

    case "set_speed":
      state.playhead.speed = clamp(msg.value, 5, 250);
      broadcastAll({ type: "set_speed", value: state.playhead.speed });
      break;

    case "set_font":
      state.playhead.fontSize = clamp(msg.value, 24, 120);
      broadcastAll({ type: "set_font", value: state.playhead.fontSize });
      break;

    case "jump_block":
      state.playhead.blockIndex = msg.index;
      state.playhead.scrollPx   = 0;
      broadcastAll({ type: "jump_block", index: msg.index });
      break;

    case "set_config":
      if (!state.playhead.config) state.playhead.config = { ...DEFAULT_CONFIG };
      Object.assign(state.playhead.config, msg.config || {});
      broadcastAll({ type: "set_config", config: state.playhead.config }, ws);
      break;

    case "save_config":
      persistConfig(state.playhead.config || {});
      send(ws, { type: "config_saved" });
      break;

    case "reset_config":
      state.playhead.config = { ...DEFAULT_CONFIG };
      broadcastAll({ type: "set_config", config: state.playhead.config });
      send(ws, { type: "config_saved", reset: true });
      break;

    // ── Salto a línea concreta ────────────────────────────────────────────────
    case "jump_line":
      state.playhead.blockIndex = msg.blockIndex;
      broadcastAll({ type: "jump_line", blockIndex: msg.blockIndex, lineIndex: msg.lineIndex }, ws);
      break;

    // ── Sync línea activa (teleprompter → studio) ─────────────────────────────
    case "sync_line":
      broadcast({ type: "sync_line", blockIndex: msg.blockIndex, lineIndex: msg.lineIndex },
        ["studio"], ws);
      break;

    // ── Patch line (live edit sin resetear scroll) ───────────────────────────
    case "patch_line": {
      const { blockIndex: bi, lineIndex: li, text } = msg;
      if (state.script?.blocks[bi]?.lines[li] != null) {
        state.script.blocks[bi].lines[li].text = text;
      }
      broadcastAll({ type: "patch_line", blockIndex: bi, lineIndex: li, text }, ws);
      break;
    }

    // ── Voice advance ─────────────────────────────────────────────────────────
    case "voice_advance":
      // Studio or remote detected a voice cue → relay to teleprompter
      broadcast({ type: "voice_advance", lines: msg.lines }, ["teleprompter"]);
      break;

    // ── Reloj ─────────────────────────────────────────────────────────────────
    case "clock_update":
      Object.assign(state.clock, msg.clock);
      broadcastAll({ type: "clock_update", clock: state.clock }, ws);
      break;

    case "chrono_start":
      state.clock.chronoStart = Date.now() - (state.clock.chronoElapsed || 0);
      broadcastAll({ type: "chrono_start", at: state.clock.chronoStart });
      break;

    case "chrono_stop":
      state.clock.chronoElapsed = state.clock.chronoStart
        ? Date.now() - state.clock.chronoStart
        : (state.clock.chronoElapsed || 0);
      state.clock.chronoStart = null;
      broadcastAll({ type: "chrono_stop", elapsed: state.clock.chronoElapsed });
      break;

    case "chrono_reset":
      state.clock.chronoStart   = null;
      state.clock.chronoElapsed = 0;
      broadcastAll({ type: "chrono_reset" });
      break;

    case "timer_start":
      state.clock.timerStart = Date.now() - (state.clock.timerElapsed || 0);
      broadcastAll({ type: "timer_start", at: state.clock.timerStart, sec: state.clock.timerSec });
      break;

    case "timer_stop":
      state.clock.timerElapsed = state.clock.timerStart
        ? Date.now() - state.clock.timerStart
        : (state.clock.timerElapsed || 0);
      state.clock.timerStart = null;
      broadcastAll({ type: "timer_stop", elapsed: state.clock.timerElapsed });
      break;

    case "timer_reset":
      state.clock.timerStart   = null;
      state.clock.timerElapsed = 0;
      broadcastAll({ type: "timer_reset" });
      break;
  }
}

function clamp(v, min, max) { return Math.min(Math.max(Number(v) || 0, min), max); }

// ── Arranque ──────────────────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  const ips = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) ips.push(addr.address);
    }
  }
  console.log("\n🎙️  Teleprónter PRO arrancado");
  console.log(`\n   🎛️  ESTUDIO (principal)  →  http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`\n   📱 Mando (móvil)        →  http://${ip}:${PORT}/remote.html`);
    console.log(`   📺 Teleprónter (cast)   →  http://${ip}:${PORT}/teleprompter.html`);
    console.log(`   🎛️  Estudio (red local)  →  http://${ip}:${PORT}`);
  });
  console.log("\n   Ctrl+C para detener\n");
});
