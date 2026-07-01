import { watch as watchFs } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");

const entries = [
  ["src/assets/js/documentos.ts", "assets/js/documentos.js"],
  ["src/oficios/admissional/admissional.ts", "oficios/admissional/admissional.js"],
  ["src/dizimo/assets/js/main.ts", "dizimo/assets/js/main.js"]
];

const bookmarklets = [
  ["src/favoritos/remover.paywall.ts", "favoritos/remover.paywall.js"],
  ["src/favoritos/dark.discourse.ts", "favoritos/dark.discourse.js"]
];

async function ensureParent(file) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
}

async function buildBrowserScripts() {
  for (const [entry, outfile] of entries) {
    await ensureParent(outfile);
    await esbuild.build({
      entryPoints: [path.join(root, entry)],
      outfile: path.join(root, outfile),
      bundle: true,
      format: "iife",
      legalComments: "none",
      logLevel: "silent",
      sourcemap: false,
      target: "es2020"
    });
  }
}

async function buildBookmarklets() {
  for (const [entry, outfile] of bookmarklets) {
    await ensureParent(outfile);
    const result = await esbuild.build({
      bundle: true,
      entryPoints: [path.join(root, entry)],
      format: "iife",
      legalComments: "none",
      minify: true,
      target: "es2020",
      write: false
    });
    const code = result.outputFiles?.[0]?.text?.trim();
    if (!code) {
      throw new Error(`Falha ao compilar bookmarklet: ${entry}`);
    }
    await writeFile(path.join(root, outfile), `javascript:${code}\n`, "utf8");
  }
}

async function buildAll() {
  await buildBrowserScripts();
  await buildBookmarklets();
}

if (watch) {
  await buildAll();
  console.log("TypeScript watch ativo. Artefatos publicos serao recompilados ao alterar src/.");
  let timer;
  watchFs(path.join(root, "src"), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await buildAll();
        console.log(`[${new Date().toLocaleTimeString()}] compilacao concluida`);
      } catch (error) {
        console.error(error);
      }
    }, 150);
  });
} else {
  await buildAll();
  for (const [, outfile] of entries) {
    await readFile(path.join(root, outfile), "utf8");
  }
}
