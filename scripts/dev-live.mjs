import { spawn } from "node:child_process";
import { createReadStream, watch as watchFs } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectConfig } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = await loadProjectConfig();
const srcRoot = path.join(root, config.paths.source);
const distRoot = path.join(root, config.paths.distribution);
const port = Number(process.env.PORT || config.development.port);
const host = config.development.host;
const clients = new Set();
const vendorResources = new Map(config.development.vendor.map(({ url, file, route }) => [url, { file: path.join(root, file), route }]));
let activeBuild;
let buildQueued = false;
let buildTimer;
let stopped = false;

const liveSnippet = `<script>(()=>{const e=new EventSource(${JSON.stringify(config.development.liveRoute)});e.addEventListener("reload",()=>location.reload())})()</script>`;

function injectLiveReload(html) {
  for (const [url, { route }] of vendorResources) {
    html = html.replaceAll(url, route);
  }
  html = html
    .replace(/(<script\b[^>]*\bsrc=(["'])\/__vendor\/[^"']+\2[^>]*)\s+integrity=(["']).*?\3/gi, "$1")
    .replace(/(<script\b[^>]*\bsrc=(["'])\/__vendor\/[^"']+\2[^>]*)\s+crossorigin=(["']).*?\3/gi, "$1")
    .replace(/(<script\b[^>]*\bsrc=(["'])\/__vendor\/[^"']+\2[^>]*)\s+referrerpolicy=(["']).*?\3/gi, "$1");
  // PROTECAO: somente o fechamento estrutural final; bundles podem conter </body> em JavaScript inline.
  return /<\/body>\s*<\/html>\s*$/i.test(html)
    ? html.replace(/<\/body>\s*<\/html>\s*$/i, `${liveSnippet}</body></html>`)
    : `${html}${liveSnippet}`;
}
const mime = new Map([[".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"], [".svg", "image/svg+xml"]]);

function runNodeScript(relativePath, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, relativePath)], { cwd: root, env: { ...process.env, ...env }, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${relativePath} falhou (${signal || code}).`)));
  });
}

function runBuild() {
  if (activeBuild) {
    buildQueued = true;
    return activeBuild;
  }
  activeBuild = runNodeScript("scripts/compile.mjs")
    .then(() => runNodeScript("scripts/build-bundles.mjs", { JCEM_DEV_LIVE: "1" }))
    .finally(async () => {
    activeBuild = undefined;
    if (buildQueued && !stopped) {
      buildQueued = false;
      await runBuild().catch(reportBuildError);
    }
  });
  return activeBuild;
}

function reportBuildError(error) {
  console.error(`[dev-live] ${error instanceof Error ? error.message : String(error)}`);
}

function notifyReload() {
  for (const response of clients) response.write("event: reload\ndata: now\n\n");
}

function scheduleBuild() {
  clearTimeout(buildTimer);
  buildTimer = setTimeout(async () => {
    try { await runBuild(); notifyReload(); }
    catch (error) { reportBuildError(error); }
  }, config.development.rebuildDebounceMs);
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
    if (url.pathname === config.development.liveRoute) {
      response.writeHead(200, { "cache-control": "no-cache", connection: "keep-alive", "content-type": "text/event-stream; charset=utf-8" });
      response.write("\n"); clients.add(response); request.on("close", () => clients.delete(response)); return;
    }
    if (url.pathname === "/favicon.ico") {
      response.writeHead(204, { "cache-control": "no-store" });
      response.end(); return;
    }
    for (const { file, route } of vendorResources.values()) {
      if (url.pathname === route) {
        response.writeHead(200, { "cache-control": "no-store", "content-type": "text/javascript; charset=utf-8" });
        createReadStream(file).pipe(response); return;
      }
    }
    const requested = path.normalize(path.join(distRoot, decodeURIComponent(url.pathname)));
    if (!isInside(distRoot, requested)) { response.writeHead(403); response.end("Forbidden"); return; }
    const info = await stat(requested).catch(() => undefined);
    if (info?.isDirectory() && url.pathname !== "/" && !url.pathname.endsWith("/")) { response.writeHead(308, { location: `${url.pathname}/${url.search}` }); response.end(); return; }
    const file = info?.isDirectory() ? path.join(requested, "index.html") : requested;
    if (!(await stat(file)).isFile()) throw new Error("Arquivo ausente");
    if (path.extname(file).toLowerCase() === ".html") {
      const html = await readFile(file, "utf8");
      response.writeHead(200, { "cache-control": "no-store", "content-type": "text/html; charset=utf-8" });
      response.end(injectLiveReload(html)); return;
    }
    response.writeHead(200, { "cache-control": "no-store", "content-type": mime.get(path.extname(file)) || "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end("Not found"); }
});

async function stop() {
  if (stopped) return;
  stopped = true; clearTimeout(buildTimer); sourceWatcher.close();
  for (const response of clients) response.end();
  await new Promise((resolve) => server.close(resolve));
}

await mkdir(distRoot, { recursive: true });
console.log("[dev-live] Gerando Web e bundles antes de abrir o servidor...");
await runBuild();
const sourceWatcher = watchFs(srcRoot, { recursive: true }, scheduleBuild);
server.once("error", async (error) => {
  reportBuildError(error.code === "EADDRINUSE" ? new Error(`Porta ${port} ocupada. Encerre o processo anterior ou defina PORT.`) : error);
  sourceWatcher.close(); process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Servidor live pronto em http://${host}:${port}/ (Web + bundles sincronizados)`));
process.on("SIGINT", () => void stop().then(() => process.exit(0)));
process.on("SIGTERM", () => void stop().then(() => process.exit(0)));
