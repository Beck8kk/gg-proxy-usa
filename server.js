const express = require('express');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { join } = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Bare Server = ele que faz o WebSocket e o proxy de verdade
const bare = createBareServer('/bare/');

app.use(express.static('public'));
// Serve os arquivos do Ultraviolet (uv.bundle.js, etc)
app.use('/uv/', express.static(join(__dirname, 'node_modules/ultraviolet-static/public')));

app.use((req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    res.status(404).send('Not found');
  }
});

const server = app.listen(PORT, () => console.log('GG Proxy rodando na ' + PORT));

server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});
