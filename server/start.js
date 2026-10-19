import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLobby } from "./lobby.js";
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const lobby = createLobby();
const server = http.createServer(async (req, res) => {
  if (await lobby.handler(req, res)) return;
  try {
    const url = new URL(req.url, "http://localhost");
    const requested = decodeURIComponent(url.pathname);
    const file = path.resolve(
      root,
      "." + (requested === "/" ? "/index.html" : requested),
    );
    if (!file.startsWith(root)) throw Error("Invalid path");
    const info = await stat(file);
    if (!info.isFile()) throw Error("Not a file");
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
const port = Number(process.env.PORT ?? 8787);
server.listen(port, "0.0.0.0", () =>
  console.log(`AXIS v3 web + matchmaking server listening on ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    lobby.close();
    server.close(() => process.exit(0));
  });
