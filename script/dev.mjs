import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const compile = spawn("npm", ["run", "compile:watch"], { shell: true, stdio: "inherit" });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "site");
const port = Number(process.env.PORT || 4173);

const mime = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
    const pathname = decodeURIComponent(url.pathname);
    const requested = path.normalize(path.join(siteRoot, pathname));

    const relative = path.relative(siteRoot, requested);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const info = await stat(requested).catch(() => undefined);
    if (info?.isDirectory() && pathname !== "/" && !pathname.endsWith("/")) {
      response.writeHead(308, { location: `${url.pathname}/${url.search}` });
      response.end();
      return;
    }

    const file = info?.isDirectory() ? path.join(requested, "index.html") : requested;
    const fileInfo = await stat(file);

    if (!fileInfo.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": mime.get(path.extname(file)) || "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch (_error) {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Servidor local em http://127.0.0.1:${port}/ servindo site/`);
});

function stop() {
  compile.kill();
  server.close();
}

process.on("SIGINT", () => {
  stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
