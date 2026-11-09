const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GG Proxy USA</title><style>body{background:#0f172a;color:white;font-family:sans-serif;text-align:center;padding:20px}input{width:85%;max-width:500px;padding:13px;border-radius:10px;border:none}button{padding:13px 20px;border:none;border-radius:10px;background:#00d4ff;font-weight:bold;cursor:pointer;margin-top:10px}.jogos button{background:#1e293b;color:white;margin:5px}iframe{width:100%;height:88vh;border:none;background:white;border-radius:10px;margin-top:15px}</style></head><body><h1>GG <span style="color:#00d4ff">Proxy</span> USA</h1><input id="u" value="https://now.gg/play/roblox-corporation/5349/roblox"><br><button onclick="go()">GO</button><div class="jogos"><button onclick="go('https://now.gg/play/roblox-corporation/5349/roblox')">Roblox</button><button onclick="go('https://now.gg/play/garena/5639/free-fire-max')">Free Fire</button></div><div id="v"></div><script>function go(url){url=url||document.getElementById('u').value;document.getElementById('v').innerHTML='<iframe src="/proxy?url='+encodeURIComponent(url)+'" allow="fullscreen; autoplay" allowfullscreen></iframe>'}</script></body></html>`);
});

const proxy = createProxyMiddleware({
  target: 'https://now.gg',
  changeOrigin: true,
  ws: true,
  router: (req) => {
    try { return new URL(req.query.url || 'https://now.gg').origin; } catch { return 'https://now.gg'; }
  },
  pathRewrite: (path, req) => {
    try { const u = new URL(req.query.url || 'https://now.gg'); return u.pathname + u.search; } catch { return '/'; }
  },
  onProxyRes: (proxyRes) => {
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];
  },
  logLevel: 'silent'
});

app.use('/proxy', proxy);
const server = app.listen(PORT, () => console.log('GG Proxy USA rodando na ' + PORT));
server.on('upgrade', proxy.upgrade);
