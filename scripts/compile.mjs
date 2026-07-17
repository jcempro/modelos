import { watch as watchFs } from "node:fs";
import { mkdir, readFile, readdir, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import * as sass from "sass";
import { optimizeTextByPath } from "./asset-optimizer.mjs";
import { loadBuildConfig, loadProjectConfig } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectConfig = await loadProjectConfig();
const srcRoot = path.join(root, projectConfig.paths.source);
const distRoot = path.join(root, projectConfig.paths.distribution);
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
const optimizableTextExtensions = new Set([".css", ".html", ".js", ".json"]);
const noscriptSource = "NOSCRIPT.html";
const buildVersion = process.env.JCEM_BUILD_VERSION?.trim() || "development";
let noscriptFragmentCache;

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
  if (normalizeRel(file).toLowerCase() === noscriptSource.toLowerCase()) {
    return false;
  }
  return staticSourceExtensions.has(path.extname(file).toLowerCase());
}

function extractTagContent(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

async function officialNoscriptFragment() {
  if (noscriptFragmentCache) {
    return noscriptFragmentCache;
  }

  const source = await readFile(path.join(srcRoot, noscriptSource), "utf8");
  const styleBlocks = [...source.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map((match) => match[0].trim());
  const body = extractTagContent(source, "body");

  if (!body) {
    throw new Error(`${noscriptSource} nao contem corpo renderizavel para <noscript>.`);
  }

  noscriptFragmentCache = `<noscript>${styleBlocks.join("")}${body}</noscript>`;
  return noscriptFragmentCache;
}

async function withOfficialNoscript(html, rel) {
  if (path.extname(rel).toLowerCase() !== ".html") {
    return html;
  }

  const fragment = await officialNoscriptFragment();
  const withoutNoscript = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "");

  if (/<\/body>/i.test(withoutNoscript)) {
    return withoutNoscript.replace(/<\/body>/i, `${fragment}</body>`);
  }

  return `${withoutNoscript}${fragment}`;
}

function bundleForIndex(rel) {
  const normalized = normalizeRel(rel);
  if (path.posix.basename(normalized).toLowerCase() !== "index.html") {
    return undefined;
  }

  const dir = path.posix.dirname(normalized);
  if (!dir || dir === ".") {
    return undefined;
  }

  return `${dir}/${path.posix.basename(dir)}.bundle.zip`;
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

async function copyChangedData(data, dest) {
  const current = await readFile(dest).catch(() => undefined);

  if (current && Buffer.compare(data, current) === 0) {
    return false;
  }

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
  return true;
}

async function readStaticOutput(src, rel) {
  if (!optimizableTextExtensions.has(path.extname(rel).toLowerCase())) {
    return await readFile(src);
  }

  const source = await readFile(src, "utf8");
  const prepared = await withOfficialNoscript(source, rel);
  return Buffer.from(await optimizeTextByPath(rel, prepared), "utf8");
}

async function copyStaticSources() {
  let changed = 0;

  for (const rel of await collectFiles(srcRoot)) {
    if (!isStaticSource(rel)) {
      continue;
    }

    generatedFiles.add(normalizeRel(rel));
    const source = path.join(srcRoot, rel);
    const output = await readStaticOutput(source, rel);
    if (await copyChangedData(output, path.join(distRoot, rel))) {
      changed += 1;
    }
  }

  for (const rel of buildConfig.rootPassthroughFiles) {
    generatedFiles.add(normalizeRel(rel));
    if (await copyChangedData(await readFile(path.join(root, rel)), path.join(distRoot, rel))) {
      changed += 1;
    }
  }

  for (const { output, content } of buildConfig.generatedRootFiles) {
    generatedFiles.add(normalizeRel(output));
    const dest = path.join(distRoot, output);
    const current = await readFile(dest, "utf8").catch(() => undefined);
    if (current !== content) {
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content, "utf8");
      changed += 1;
    }
  }

  return changed;
}

async function pruneDist() {
  const generated = new Set([...generatedFiles].map((file) => normalizeRel(file)));
  for (const file of [...generated]) {
    const bundle = bundleForIndex(file);
    if (bundle) {
      generated.add(bundle);
    }
  }

  for (const rel of await collectFiles(distRoot)) {
    if (generated.has(normalizeRel(rel))) {
      continue;
    }
    await rm(path.join(distRoot, rel), { force: true });
  }
}

async function pruneEmptyDirectories(dir = distRoot) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    await pruneEmptyDirectories(path.join(dir, entry.name));
  }

  if (dir !== distRoot) {
    await rmdir(dir).catch(() => undefined);
  }
}

async function buildBrowserScripts() {
  for (const { source, output } of buildConfig.browserScripts) {
    const outfile = path.join(projectConfig.paths.distribution, output);
    await ensureParent(outfile);
    const result = await esbuild.build({
      entryPoints: [path.join(root, source)],
      bundle: true,
      define: { __JCEM_BUILD_VERSION__: JSON.stringify(buildVersion) },
      format: "iife",
      legalComments: "none",
      logLevel: "silent",
      mangleProps: /^__p\d+$/,
      minify: true,
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

async function buildStyles() {
  for (const rel of await collectFiles(srcRoot)) {
    if (!rel.endsWith(".scss") || path.basename(rel).startsWith("_")) continue;
    const output = normalizeRel(rel.replace(/\.scss$/i, ".css"));
    const result = await sass.compileAsync(path.join(srcRoot, rel), { loadPaths: [srcRoot], style: "compressed" });
    await ensureParent(path.join("dist", output));
    await writeFile(path.join(distRoot, output), result.css, "utf8");
    generatedFiles.add(output);
  }
}

async function buildBookmarklets() {
  for (const { source, output } of buildConfig.bookmarklets) {
    const outfile = path.join(projectConfig.paths.distribution, output);
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
  await buildStyles();
  await buildBrowserScripts();
  await buildBookmarklets();
  await pruneDist();
  await pruneEmptyDirectories();
  return copied;
}

if (watch) {
  await buildAll();
  console.log("Watch ativo. dist/ sera reconstruido ao alterar src/.");
  let timer;
  watchFs(srcRoot, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const copied = await buildAll();
        console.log(`[${new Date().toLocaleTimeString()}] dist atualizado (${copied} estaticos alterados)`);
      } catch (error) {
        console.error(error);
      }
    }, 150);
  });
} else {
  await buildAll();
  for (const { output } of buildConfig.browserScripts) {
    await readFile(path.join(distRoot, output), "utf8");
  }
}
