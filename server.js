import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "10000", 10);
const file = (name) => join(__dirname, name);

const app = express();

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Arquivos do site (todos na raiz do repositório). Só estes são públicos.
app.get(["/", "/index.html"], (_req, res) => res.sendFile(file("index.html")));
app.get("/sw.js", (_req, res) => {
  res.set("Service-Worker-Allowed", "/");
  res.sendFile(file("sw.js"));
});
// Nossa config tem prioridade sobre a que vem dentro do pacote do Ultraviolet
app.get("/uv/uv.config.js", (_req, res) => res.sendFile(file("uv.config.js")));

// Scripts do Ultraviolet, bare-mux e transporte epoxy
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

app.use((_req, res) => {
  res.status(404).send("404 - Not found");
});

const server = createServer(app);

// Backend de transporte (Wisp via WebSocket)
server.on("upgrade", (req, socket, head) => {
  if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.end();
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`GG Proxy USA rodando na porta ${PORT}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
