import { spawn } from "node:child_process";
import { createReadStream, watch as watchFs } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const compile = spawn("npm", ["run", "compile:watch"], { shell: true, stdio: "inherit" });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "site");
const port = Number(process.env.PORT || 4173);
const clients = new Set();

const liveSnippet = `
<script>
(() => {
  const events = new EventSource("/__live");
  events.addEventListener("reload", () => window.location.reload());
})();
</script>`;

const mime = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

function isInside(base, target) {
  const relative = path.relative(base, target);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function notifyReload() {
  for (const response of clients) {
    response.write("event: reload\ndata: now\n\n");
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

    if (url.pathname === "/__live") {
      response.writeHead(200, {
        "cache-control": "no-cache",
        "connection": "keep-alive",
        "content-type": "text/event-stream; charset=utf-8"
      });
      response.write("\n");
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const requested = path.normalize(path.join(siteRoot, pathname));

    if (requested !== siteRoot && !isInside(siteRoot, requested)) {
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

    if (path.extname(file).toLowerCase() === ".html") {
      const html = await readFile(file, "utf8");
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html.includes("</body>") ? html.replace("</body>", `${liveSnippet}</body>`) : `${html}${liveSnippet}`);
      return;
    }

    response.writeHead(200, { "content-type": mime.get(path.extname(file)) || "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch (_error) {
    response.writeHead(404);
    response.end("Not found");
  }
});

let timer;
function scheduleReload() {
  clearTimeout(timer);
  timer = setTimeout(notifyReload, 120);
}

try {
  watchFs(siteRoot, { recursive: true }, scheduleReload);
} catch (_error) {
  watchFs(siteRoot, scheduleReload);
}

server.listen(port, "127.0.0.1", () => {
  console.log(`Servidor live em http://127.0.0.1:${port}/ servindo site/`);
});

function stop() {
  compile.kill();
  server.close();
  for (const response of clients) {
    response.end();
  }
}

process.on("SIGINT", () => {
  stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
