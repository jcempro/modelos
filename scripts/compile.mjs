import { watch as watchFs } from "node:fs";
import { mkdir, readFile, readdir, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { loadBuildConfig } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const siteRoot = path.join(root, "site");
const watch = process.argv.includes("--watch");
const buildConfig = await loadBuildConfig();
const generatedFiles = new Set([
  ...buildConfig.browserScripts,
  ...buildConfig.bookmarklets
].map(({ output }) => normalizeRel(output)));
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

    generatedFiles.add(normalizeRel(rel));
    if (await copyChanged(path.join(srcRoot, rel), path.join(siteRoot, rel))) {
      changed += 1;
    }
  }

  for (const rel of buildConfig.rootPassthroughFiles) {
    generatedFiles.add(normalizeRel(rel));
    if (await copyChanged(path.join(root, rel), path.join(siteRoot, rel))) {
      changed += 1;
    }
  }

  for (const { output, content } of buildConfig.generatedRootFiles) {
    generatedFiles.add(normalizeRel(output));
    const dest = path.join(siteRoot, output);
    const current = await readFile(dest, "utf8").catch(() => undefined);
    if (current !== content) {
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content, "utf8");
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

async function pruneEmptyDirectories(dir = siteRoot) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    await pruneEmptyDirectories(path.join(dir, entry.name));
  }

  if (dir !== siteRoot) {
    await rmdir(dir).catch(() => undefined);
  }
}

async function buildBrowserScripts() {
  for (const { source, output } of buildConfig.browserScripts) {
    const outfile = path.join("site", output);
    await ensureParent(outfile);
    const result = await esbuild.build({
      entryPoints: [path.join(root, source)],
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
      throw new Error(`Falha ao compilar script: ${source}`);
    }
    await writeFile(path.join(root, outfile), stripInternalSourcePathComments(code), "utf8");
  }
}

async function buildBookmarklets() {
  for (const { source, output } of buildConfig.bookmarklets) {
    const outfile = path.join("site", output);
    await ensureParent(outfile);
    const result = await esbuild.build({
      bundle: true,
      entryPoints: [path.join(root, source)],
      format: "iife",
      legalComments: "none",
      minify: true,
      target: "es2020",
      write: false
    });
    const code = result.outputFiles?.[0]?.text?.trim();
    if (!code) {
      throw new Error(`Falha ao compilar bookmarklet: ${source}`);
    }
    await writeFile(path.join(root, outfile), `javascript:${code}\n`, "utf8");
  }
}

async function buildAll() {
  const copied = await copyStaticSources();
  await buildBrowserScripts();
  await buildBookmarklets();
  await pruneSite();
  await pruneEmptyDirectories();
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
  for (const { output } of buildConfig.browserScripts) {
    await readFile(path.join(siteRoot, output), "utf8");
  }
}
