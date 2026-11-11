import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import express from "express";
import wisp from "wisp-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const REQUIRED = [
  [uvPath, "sw.js"],
  [uvPath, "uv.bundle.js"],
  [uvPath, "uv.client.js"],
  [uvPath, "uv.handler.js"],
  [uvPath, "uv.sw.js"],
  [epoxyPath, "index.mjs"],
  [baremuxPath, "index.js"],
  [baremuxPath, "worker.js"],
];

for (const [dir, file] of REQUIRED) {
  const full = join(dir, file);
  if (!existsSync(full)) {
    console.error("Arquivo do Ultraviolet ausente:", full);
    console.error("Isso NÃO é cache de public/. Roda o deploy de novo para o npm install terminar.");
    process.exit(1);
  }
}

const UV_CONFIG = `self.__uv$config = {
  prefix: "/uv/service/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/uv/uv.handler.js",
  client: "/uv/uv.client.js",
  bundle: "/uv/uv.bundle.js",
  config: "/uv/uv.config.js",
  sw: "/uv/uv.sw.js",
};

if (typeof document !== "undefined") {
  var __ggConnect = function () {
    if (typeof BareMux === "undefined" || !BareMux.BareMuxConnection) return;
    var wisp = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/wisp/";
    var conn = new BareMux.BareMuxConnection("/baremux/worker.js");
    return conn.setTransport("/epoxy/index.mjs", [{ wisp: wisp }]);
  };
  __ggConnect();
  setInterval(__ggConnect, 4000);
}
`;

const SW_JS = `/*global UVServiceWorker,__uv$config*/
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.config.js");
importScripts("/uv/uv.sw.js");
const uv = new UVServiceWorker();
self.addEventListener("fetch", (event) => {
  event.respondWith((async () => {
    if (uv.route(event)) return await uv.fetch(event);
    return await fetch(event.request);
  })());
});
`;

const BOOT_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GG Proxy USA</title>
  <script src="/baremux/index.js"></script>
  <script src="/uv/uv.bundle.js"></script>
  <script src="/uv/uv.config.js"></script>
</head>
<body style="margin:0;background:#0b0d12;color:#e7e9ee;font-family:system-ui,sans-serif">
  <p id="m" style="padding:16px">Ativando o proxy...</p>
  <script>
    (async function () {
      var msg = document.getElementById("m");
      try {
        var tries = Number(sessionStorage.getItem("gg-uv-boot") || "0");
        if (tries > 2) {
          msg.textContent = "O service worker não assumiu esta aba. Volta na página inicial, espera aparecer Proxy EUA pronto e abre o jogo de novo.";
          return;
        }
        sessionStorage.setItem("gg-uv-boot", String(tries + 1));
        var reg = await navigator.serviceWorker.register("/uv/sw.js", { scope: "/", updateViaCache: "none" });
        await new Promise(function (resolve, reject) {
          var worker = reg.active || reg.installing || reg.waiting;
          if (!worker) { reject(new Error("Service worker não instalou")); return; }
          if (worker.state === "activated") { resolve(); return; }
          var timer = setTimeout(function () { reject(new Error("Service worker demorou demais")); }, 8000);
          worker.addEventListener("statechange", function () {
            if (worker.state === "activated") { clearTimeout(timer); resolve(); }
            else if (worker.state === "redundant") { clearTimeout(timer); reject(new Error("Service worker descartado")); }
          });
        });
        var wisp = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/wisp/";
        var connection = new BareMux.BareMuxConnection("/baremux/worker.js");
        await connection.setTransport("/epoxy/index.mjs", [{ wisp: wisp }]);
        sessionStorage.removeItem("gg-uv-boot");
        location.reload();
      } catch (err) {
        msg.textContent = "Falha ao ativar o proxy: " + (err && err.message ? err.message : err);
      }
    })();
  </script>
</body>
</html>
`;

const HOME_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0b0d12">
  <title>GG Proxy USA</title>
  <script src="/baremux/index.js"></script>
  <script src="/uv/uv.bundle.js"></script>
  <script src="/uv/uv.config.js"></script>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #0b0d12; color: #e7e9ee; }
    body {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    }
    header {
      flex: none;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: max(10px, env(safe-area-inset-top)) 10px 10px;
      background: #12151c;
      border-bottom: 1px solid #242833;
    }
    h1 { font-size: 16px; line-height: 1; margin: 0; font-weight: 750; }
    form { display: flex; gap: 8px; flex: 1 1 240px; min-width: 0; }
    input, button { font: inherit; }
    input {
      flex: 1;
      min-width: 0;
      background: #0b0d12;
      color: #fff;
      border: 1px solid #2c3344;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 16px;
    }
    button {
      appearance: none;
      border: 0;
      border-radius: 12px;
      padding: 12px 14px;
      min-height: 44px;
      background: #2f6fed;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    button.ghost { background: #1c2230; color: #d5d9e2; }
    #games { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
    #status { width: 100%; min-height: 1.2em; color: #9aa3b5; font-size: 12px; }
    #frame { flex: 1; width: 100%; min-height: 0; border: 0; background: #000; }
  </style>
</head>
<body>
  <header>
    <h1>GG Proxy USA</h1>
    <form id="f">
      <input id="u" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Cole a URL do now.gg">
      <button type="submit">GO</button>
    </form>
    <div id="games"></div>
    <button id="full" class="ghost" type="button">Tela cheia</button>
    <div id="status">Preparando o proxy...</div>
  </header>
  <iframe id="frame" title="Jogo" referrerpolicy="no-referrer" allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write; accelerometer; gyroscope; encrypted-media; picture-in-picture" allowfullscreen></iframe>
  <script>
    (function () {
      var GAMES = [
        ["Roblox", "https://now.gg/play/roblox-corporation/5349/roblox"],
        ["Free Fire Max", "https://now.gg/play/garena-international-ii-pte-ltd/5350/free-fire-max"],
        ["Stumble Guys", "https://now.gg/play/kitka-games/7999/stumble-guys"],
        ["99 Nights in the Forest", "https://now.gg/apps/mini-games-rb/19902/99-Nights.html"]
      ];
      var form = document.getElementById("f");
      var input = document.getElementById("u");
      var statusEl = document.getElementById("status");
      var frame = document.getElementById("frame");
      var gamesEl = document.getElementById("games");
      var connection = new BareMux.BareMuxConnection("/baremux/worker.js");
      var ready = null;

      function setStatus(text) { statusEl.textContent = text; }

      function normalize(raw) {
        var value = String(raw || "").trim();
        if (!value) throw new Error("Cola uma URL.");
        if (!/^https?:\\/\\//i.test(value)) value = "https://" + value;
        var url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Só http ou https.");
        return url.toString();
      }

      function wispUrl() {
        return (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/wisp/";
      }

      function ensure() {
        if (ready) return ready;
        ready = (async function () {
          if (!navigator.serviceWorker) throw new Error("Usa Chrome. Esse navegador não tem service worker.");
          if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
            throw new Error("O proxy só liga em HTTPS.");
          }
          setStatus("Ativando o proxy...");
          var reg = await navigator.serviceWorker.register("/uv/sw.js", { scope: "/", updateViaCache: "none" });
          await new Promise(function (resolve, reject) {
            var worker = reg.active || reg.installing || reg.waiting;
            if (!worker) { reject(new Error("Service worker não instalou.")); return; }
            if (worker.state === "activated") { resolve(); return; }
            var timer = setTimeout(function () { reject(new Error("Service worker demorou demais. Recarrega a página.")); }, 8000);
            worker.addEventListener("statechange", function () {
              if (worker.state === "activated") { clearTimeout(timer); resolve(); }
              else if (worker.state === "redundant") { clearTimeout(timer); reject(new Error("Service worker foi descartado. Recarrega a página.")); }
            });
          });
          await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl() }]);
          setStatus("Proxy EUA pronto.");
        })();
        ready.catch(function () { ready = null; });
        return ready;
      }

      async function openUrl(raw) {
        var url;
        try { url = normalize(raw); }
        catch (err) { setStatus(err.message || String(err)); return; }
        input.value = url;
        try { await ensure(); }
        catch (err) { setStatus(err && err.message ? err.message : String(err)); return; }
        setStatus("Abrindo " + url);
        frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
      }

      GAMES.forEach(function (pair) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "ghost";
        button.textContent = pair[0];
        button.addEventListener("click", function () { openUrl(pair[1]); });
        gamesEl.appendChild(button);
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        openUrl(input.value);
      });

      document.getElementById("full").addEventListener("click", function () {
        var req = frame.requestFullscreen || frame.webkitRequestFullscreen;
        if (req) req.call(frame);
        else setStatus("Tela cheia não disponível neste navegador.");
      });

      var auto = new URLSearchParams(location.search).get("url");
      if (auto) openUrl(auto);
      else ensure().catch(function (err) { setStatus(err.message || String(err)); });
    })();
  </script>
</body>
</html>
`;

function sendHtml(res, status, html) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(html);
}

function sendJs(res, body) {
  if (res.headersSent) return;
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Service-Worker-Allowed", "/");
  res.end(body);
}

function staticHeaders(res, filePath) {
  if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) {
    res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  }
}

const staticOptions = {
  index: false,
  redirect: false,
  fallthrough: true,
  setHeaders: staticHeaders,
};

const app = express();
app.disable("x-powered-by");

app.get("/uv/uv.config.js", (req, res) => sendJs(res, UV_CONFIG));
app.get("/uv/sw.js", (req, res) => sendJs(res, SW_JS));
app.get(["/", "/index.html", "/proxy"], (req, res) => sendHtml(res, 200, HOME_HTML));
app.get("/health", (req, res) => {
  if (res.headersSent) return;
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("ok");
});

app.use("/uv/", express.static(uvPath, staticOptions));
app.use("/epoxy/", express.static(epoxyPath, staticOptions));
app.use("/baremux/", express.static(baremuxPath, staticOptions));

app.use((req, res, next) => {
  if (!req.path.startsWith("/uv/service/")) return next();
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (res.headersSent) return;
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Service worker ainda não está ativo.");
    return;
  }
  sendHtml(res, 200, BOOT_HTML);
});

app.use((req, res) => {
  if (res.headersSent) return;
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Não encontrado");
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.statusCode = 500;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Erro interno");
});

const server = createServer();

server.on("request", (req, res) => {
  try {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  } catch (err) {
    console.error(err);
  }
  app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const path = String(req.url || "/").split("?")[0];
  if (path === "/wisp/" || path.startsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
    return;
  }
  socket.destroy();
});

server.on("clientError", (err, socket) => {
  if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});

const parsed = Number(process.env.PORT);
const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;

server.listen(port, "0.0.0.0", () => {
  console.log("GG Proxy USA rodando na " + port);
});
