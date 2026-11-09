const express = require('express');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { join } = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const bare = createBareServer('/bare/');

// 1. Serve o Ultraviolet
app.use('/uv/', express.static(join(__dirname, 'node_modules/ultraviolet-static/public')));

// 2. Serve sua página (public/index.html)
app.use(express.static(join(__dirname, 'public')));

// 3. Se entrar direto no / abre o index
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// 4. Só usa o Bare Server se for /bare/, senão deixa passar
app.use((req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    // ANTES tava 404 aqui, AGORA volta pra home
    res.sendFile(join(__dirname, 'public', 'index.html'));
  }
});

const server = app.listen(PORT, () => console.log('Rodando na ' + PORT));

server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});
