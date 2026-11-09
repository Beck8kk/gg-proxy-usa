const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = process.env.PORT || 10000;

// ============ SITE GG PROXY USA ============
const HTML = `<!DOCTYPE html>
<html lang="en" translate="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google" content="notranslate">
<title>GG Proxy USA</title>
<style>
body{background:#0f172a;color:white;font-family:sans-serif;text-align:center;padding:20px}
input{width:85%;max-width:500px;padding:13px;border-radius:10px;border:none}
button{padding:13px 20px;border:none;border-radius:10px;background:#00d4ff;font-weight:bold;cursor:pointer;margin-top:10px}
.jogos button{background:#1e293b;color:white;margin:5px}
#loading{display:none;position:fixed;inset:0;background:#0f172a;z-index:99;padding-top:35%}
iframe{width:100%;height:88vh;border:none;background:white;border-radius:10px;margin-top:15px}
</style>
</head>
<body>
<div id="loading">Carregando jogo... espera 15s, nao fecha</div>
<h1>GG <span style="color:#00d4ff">Proxy</span> USA 🇺🇸</h1>
<input id="urlInput" value="https://now.gg/play/roblox-corporation/5349/roblox" /><br>
<button id="goBtn">GO</button>
<div class="jogos">
<button onclick="irJogo('roblox')">🎮 Roblox</button>
<button onclick="irJogo('freefire')">🔥 Free Fire</button>
<button onclick="irJogo('stumble')">Stumble Guys</button>
<button onclick="irJogo('ninetynights')">🌲 99 Nights</button>
</div>
<button onclick="voltar()" style="background:#333;color:white">🏠 Home</button>
<div id="visor"></div>
<script>
function irPara(url){
  if(!url.startsWith('http')) url='https://'+url;
  document.getElementById('loading').style.display='block';
  // AGORA passa a URL inteira pro proxy
  document.getElementById('visor').innerHTML='<iframe src="/proxy?url='+encodeURIComponent(url)+'" allow="fullscreen; autoplay; clipboard-write; gamepad" allowfullscreen></iframe>';
  setTimeout(()=>{document.getElementById('loading').style.display='none'},4000);
}
document.getElementById('goBtn').onclick=e=>{e.preventDefault();irPara(document.getElementById('urlInput').value)};
document.getElementById('urlInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();irPara(e.target.value)}});
function irJogo(j){
  const l={roblox:'https://now.gg/play/roblox-corporation/5349/roblox',freefire:'https://now.gg/play/garena/5639/free-fire-max',stumble:'https://now.gg/play/kitka-games/7999/stumble-guys',ninetynights:'https://now.gg/play/farm-games/6943/99-nights-in-the-forest'};
  irPara(l[j]);
}
function voltar(){document.getElementById('visor').innerHTML='';}
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HTML));

// ============ PROXY QUE RODA QUALQUER SITE, INCLUINDO NOW.GG ============
const proxy = createProxyMiddleware({
  changeOrigin: true,
  ws: true, // <-- WebSocket ligado, é isso que destrava o jogo
  followRedirects: true,
  // Descobre pra qual site mandar, baseado no ?url=
  router: (req) => {
    try {
      const u = new URL(req.query.url || 'https://now.gg');
      return u.origin;
    } catch { return 'https://now.gg'; }
  },
  // Tira o /proxy?url= e deixa só o caminho do jogo
  pathRewrite: (path, req) => {
    try {
      const u = new URL(req.query.url || 'https://now.gg');
      return u.pathname + u.search;
    } catch { return '/'; }
  },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');
    proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
    proxyReq.setHeader('Referer', 'https://now.gg/');
    proxyReq.setHeader('Origin', 'https://now.gg');
  },
  onProxyRes: (proxyRes) => {
    // Remove o que bloqueia o jogo dentro do iframe
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];
    delete proxyRes.headers['content-security-policy-report-only'];
  },
  proxyTimeout: 60000,
  timeout: 60000,
});

app.use('/proxy', proxy);

const server = app.listen(PORT, () => console.log('GG Proxy USA rodando na ' + PORT));
server.on('upgrade', proxy.upgrade);
