const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");
const { exec } = require("child_process");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const STORAGE_DIR = path.join(ROOT, "storage");
const DB_FILE = path.join(STORAGE_DIR, "user_state.json");

// Ensure storage directory & DB file exist
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ profiles: {} }, null, 2), "utf8");
}

// Generate native PWA PNG icons (192x192 & 512x512) if missing so iOS & Android allow native app installation
function createPwaPng(size) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc(height * (1 + width * 4));
  const cx1 = size * 0.34;
  const cy1 = size * 0.38;
  const r = size * 0.16;
  const stroke = size * 0.045;
  const cx2 = size * 0.66;
  const cy2 = size * 0.38;
  const cx3 = size * 0.5;
  const cy3 = size * 0.65;

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const idx = rowStart + 1 + x * 4;
      let R = 15;
      let G = 23;
      let B = 42;
      const A = 255;

      const d1 = Math.abs(Math.hypot(x - cx1, y - cy1) - r);
      const d2 = Math.abs(Math.hypot(x - cx2, y - cy2) - r);
      const d3 = Math.abs(Math.hypot(x - cx3, y - cy3) - r);
      const dc = Math.hypot(x - size * 0.5, y - size * 0.47);

      if (d1 < stroke) {
        R = 132;
        G = 204;
        B = 22;
      } else if (d2 < stroke) {
        R = 245;
        G = 158;
        B = 11;
      } else if (d3 < stroke) {
        R = 56;
        G = 189;
        B = 248;
      } else if (dc < size * 0.038) {
        R = 248;
        G = 250;
        B = 252;
      }

      raw[idx] = R;
      raw[idx + 1] = G;
      raw[idx + 2] = B;
      raw[idx + 3] = A;
    }
  }

  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
    }
    return (c ^ -1) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function ensurePngIcons() {
  const p192 = path.join(ROOT, "icon-192.png");
  const p512 = path.join(ROOT, "icon-512.png");
  if (!fs.existsSync(p192)) fs.writeFileSync(p192, createPwaPng(192));
  if (!fs.existsSync(p512)) fs.writeFileSync(p512, createPwaPng(512));
}
ensurePngIcons();

function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return { profiles: {} };
  }
}

function writeDb(data) {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpFile, DB_FILE);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function getLocalLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;
  const profile = (parsedUrl.searchParams.get("profile") || "nuri").replace(/[^a-zA-Z0-9_-]/g, "");

  // --- BACKEND REST API ENDPOINTS ---
  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      service: "notom-backend",
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (pathname === "/api/state" && req.method === "GET") {
    const db = readDb();
    const record = db.profiles?.[profile] || null;
    sendJson(res, 200, {
      ok: true,
      profile,
      state: record ? record.state : null,
      updatedAt: record ? record.updatedAt : null
    });
    return;
  }

  if (pathname === "/api/state" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const incoming = JSON.parse(body || "{}");
        if (!incoming || typeof incoming.state !== "object") {
          sendJson(res, 400, { ok: false, error: "Invalid state payload" });
          return;
        }
        const db = readDb();
        if (!db.profiles) db.profiles = {};
        const nowIso = new Date().toISOString();
        db.profiles[profile] = {
          state: incoming.state,
          updatedAt: incoming.updatedAt || nowIso
        };
        writeDb(db);
        sendJson(res, 200, {
          ok: true,
          profile,
          updatedAt: db.profiles[profile].updatedAt
        });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: "Malformed JSON" });
      }
    });
    return;
  }

  // --- STATIC PWA FILE SERVER ---
  let filePath = path.join(ROOT, pathname === "/" ? "index.html" : pathname);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(ROOT, "index.html");
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end("Sunucu hatasi");
        return;
      }
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache"
      });
      res.end(content);
    });
  });
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    const lanIp = getLocalLanIp();
    const localUrl = `http://localhost:${PORT}`;
    console.log("\n========================================================");
    console.log("  NoTom — Full-Stack PWA & Backend Sunucusu Hazir");
    console.log("========================================================");
    console.log(`  💻 Bilgisayarda ac : ${localUrl}`);
    if (lanIp) {
      console.log(`  📱 Telefonda ac    : http://${lanIp}:${PORT} (Wi-Fi)`);
    }
    console.log(`  ☁️  Backend API     : ${localUrl}/api/state?profile=nuri`);
    console.log("========================================================\n");

    if (process.platform === "win32" && !process.env.NO_OPEN) {
      exec(`start "" "${localUrl}"`);
    }
  });
}

module.exports = server;
