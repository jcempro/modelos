import { watch as watchFs } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const siteRoot = path.join(root, "site");
const watch = process.argv.includes("--watch");

const entries = [
  ["src/assets/js/documentos.ts", "site/assets/js/documentos.js"],
  ["src/oficios/admissional/admissional.ts", "site/oficios/admissional/admissional.js"],
  ["src/faturamento/faturamento.ts", "site/faturamento/faturamento.js"],
  ["src/dizimo/assets/js/main.ts", "site/dizimo/assets/js/main.js"]
];

const bookmarklets = [
  ["src/favoritos/remover.paywall.ts", "site/favoritos/remover.paywall.js"],
  ["src/favoritos/dark.discourse.ts", "site/favoritos/dark.discourse.js"]
];

const generatedFiles = new Set([...entries, ...bookmarklets].map(([, outfile]) => path.normalize(outfile.replace(/^site[\\/]/, ""))));
const staticSourceExtensions = new Set([
  ".avif",
  ".css",
  ".gif",
  ".html",
  ".ico",
  ".jpeg",
  ".jpg",
  ".json",
  ".png",
  ".svg",
  ".ttf",
  ".webp",
  ".woff",
  ".woff2"
]);

async function ensureParent(file) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
}

function stripInternalSourcePathComments(code) {
  return code.replace(/^\s*\/\/\s*src[\\/][^\r\n]*(?:\r?\n)?/gm, "");
}

function normalizeRel(file) {
  return file.replace(/\\/g, "/");
}

function isStaticSource(file) {
  if (path.basename(file).toLowerCase() === "rcf.md") {
    return false;
  }
  return staticSourceExtensions.has(path.extname(file).toLowerCase());
}

async function collectFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const rel = prefix ? path.join(prefix, entry.name) : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(full, rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }

  return files;
}

async function copyChanged(src, dest) {
  const data = await readFile(src);
  const current = await readFile(dest).catch(() => undefined);

  if (current && Buffer.compare(data, current) === 0) {
    return false;
  }

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
  return true;
}

async function copyStaticSources() {
  let changed = 0;

  for (const rel of await collectFiles(srcRoot)) {
    if (!isStaticSource(rel)) {
      continue;
    }

    generatedFiles.add(path.normalize(rel));
    if (await copyChanged(path.join(srcRoot, rel), path.join(siteRoot, rel))) {
      changed += 1;
    }
  }

  return changed;
}

async function pruneSite() {
  const generated = new Set([...generatedFiles].map((file) => normalizeRel(file)));

  for (const rel of await collectFiles(siteRoot)) {
    if (generated.has(normalizeRel(rel))) {
      continue;
    }
    await rm(path.join(siteRoot, rel), { force: true });
  }
}

async function buildBrowserScripts() {
  for (const [entry, outfile] of entries) {
    await ensureParent(outfile);
    const result = await esbuild.build({
      entryPoints: [path.join(root, entry)],
      bundle: true,
      format: "iife",
      legalComments: "none",
      logLevel: "silent",
      minify: false,
      sourcemap: false,
      target: "es2020",
      write: false
    });
    const code = result.outputFiles?.[0]?.text;
    if (!code) {
      throw new Error(`Falha ao compilar script: ${entry}`);
    }
    await writeFile(path.join(root, outfile), stripInternalSourcePathComments(code), "utf8");
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
  const copied = await copyStaticSources();
  await buildBrowserScripts();
  await buildBookmarklets();
  await pruneSite();
  return copied;
}

if (watch) {
  await buildAll();
  console.log("Watch ativo. O cache site/ sera reconstruido ao alterar src/.");
  let timer;
  watchFs(srcRoot, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const copied = await buildAll();
        console.log(`[${new Date().toLocaleTimeString()}] site atualizado (${copied} estaticos alterados)`);
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
