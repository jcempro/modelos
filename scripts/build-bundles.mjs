import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { mkdir, open, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minifyCssText, minifyHtmlText, minifyJsText } from "./asset-optimizer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".cache", "build");
const lockPath = path.join(cacheDir, "bundle.lock");

const excludedTopLevel = new Set([".cache", ".git", ".github", "_site", "node_modules", "scripts", "src", "tests"]);
const externalResources = new Map([
  [
    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.8.0/html2pdf.bundle.min.js",
    path.join(root, "node_modules", "html2pdf.js", "dist", "html2pdf.bundle.min.js")
  ],
  [
    "https://cdnjs.cloudflare.com/ajax/libs/zepto/1.2.0/zepto.min.js",
    path.join(root, "node_modules", "zepto", "dist", "zepto.min.js")
  ],
  [
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/v5-font-face.min.css",
    path.join(root, "node_modules", "@fortawesome", "fontawesome-free", "css", "v5-font-face.min.css")
  ]
]);

const mimeByExt = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

async function acquireLock() {
  await mkdir(cacheDir, { recursive: true });
  try {
    return await open(lockPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_RDWR);
  } catch (error) {
    throw new Error(`Geracao de bundle ja esta em execucao ou lock antigo presente em ${lockPath}. Erro: ${error.message}`);
  }
}

async function releaseLock(handle) {
  await handle.close();
  await unlink(lockPath).catch(() => undefined);
}

async function collectIndexFiles(dir = root, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = prefix ? path.join(prefix, entry.name) : entry.name;
    const top = rel.split(path.sep)[0];

    if (excludedTopLevel.has(top)) {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectIndexFiles(full, rel));
    } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      files.push(rel);
    }
  }

  return files;
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
  return tag.match(pattern)?.[2];
}

function isStylesheetLink(tag) {
  const rel = getAttribute(tag, "rel");
  return Boolean(rel && rel.toLowerCase().split(/\s+/).includes("stylesheet"));
}

function resolveResource(ref, baseDir) {
  if (/^https?:\/\//i.test(ref)) {
    const mapped = externalResources.get(ref);
    if (!mapped) {
      throw new Error(`Recurso externo sem copia local para bundle offline: ${ref}`);
    }
    return mapped;
  }

  if (/^(data:|mailto:|tel:|#)/i.test(ref)) {
    return undefined;
  }

  const normalized = decodeURIComponent(ref.split("#")[0].split("?")[0]);
  const resolved = path.resolve(baseDir, normalized);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Recurso fora do workspace bloqueado no bundle: ${ref}`);
  }

  return resolved;
}

function mimeFor(file) {
  return mimeByExt.get(path.extname(file).toLowerCase()) || "application/octet-stream";
}

async function toDataUrl(file) {
  const data = await readFile(file);
  return `data:${mimeFor(file)};base64,${data.toString("base64")}`;
}

async function inlineCssAssets(css, cssFile) {
  const baseDir = path.dirname(cssFile);
  const matches = [...css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)];
  let output = css;

  for (const match of matches) {
    const raw = match[2];
    if (!raw || /^(data:|https?:|#)/i.test(raw)) {
      continue;
    }

    const file = resolveResource(raw, baseDir);
    if (!file) {
      continue;
    }

    const dataUrl = await toDataUrl(file);
    output = output.replace(match[0], `url(${dataUrl})`);
  }

  return output;
}

async function asyncReplace(text, pattern, replacer) {
  const matches = [...text.matchAll(pattern)];
  let output = "";
  let cursor = 0;

  for (const match of matches) {
    output += text.slice(cursor, match.index);
    output += await replacer(match);
    cursor = (match.index ?? 0) + match[0].length;
  }

  return `${output}${text.slice(cursor)}`;
}

function escapeInlineScript(js) {
  return js.replace(/<\/script/gi, "<\\/script");
}

function escapeInlineStyle(css) {
  return css.replace(/<\/style/gi, "<\\/style");
}

async function inlineStyles(html, indexFile) {
  return await asyncReplace(html, /<link\b[^>]*>/gi, async (match) => {
    const tag = match[0];
    if (!isStylesheetLink(tag)) {
      return tag;
    }

    const href = getAttribute(tag, "href");
    if (!href) {
      return tag;
    }

    const file = resolveResource(href, path.dirname(indexFile));
    if (!file) {
      return tag;
    }

    const css = await inlineCssAssets(await readFile(file, "utf8"), file);
    return `<style>${escapeInlineStyle(await minifyCssText(css, path.relative(root, file)))}</style>`;
  });
}

async function inlineScripts(html, indexFile) {
  return await asyncReplace(html, /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>\s*<\/script>/gi, async (match) => {
    const src = match[2];
    const file = resolveResource(src, path.dirname(indexFile));
    if (!file) {
      return match[0];
    }

    const js = await minifyJsText(await readFile(file, "utf8"), path.relative(root, file));
    return `<script>${escapeInlineScript(js)}</script>`;
  });
}

async function inlineMediaSources(html, indexFile) {
  return await asyncReplace(html, /<(img|source|audio|video)\b[^>]*\bsrc\s*=\s*(["'])(.*?)\2[^>]*>/gi, async (match) => {
    const src = match[3];
    const file = resolveResource(src, path.dirname(indexFile));
    if (!file) {
      return match[0];
    }

    return match[0].replace(src, await toDataUrl(file));
  });
}

function assertOffline(html, rel) {
  const automaticExternal = /<(script|link|img|source|audio|video|iframe|object|embed)\b[^>]*(src|href|data)\s*=\s*["']https?:\/\//i;
  const cssExternal = /url\(\s*["']?https?:\/\//i;

  if (automaticExternal.test(html) || cssExternal.test(html)) {
    throw new Error(`Bundle offline ainda contem recurso externo automatico: ${rel}`);
  }
}

async function buildBundle(rel) {
  const indexFile = path.join(root, rel);
  const dir = path.dirname(indexFile);
  const bundleName = `${path.basename(dir)}.bundle.html`;
  const outputFile = path.join(dir, bundleName);

  let html = await readFile(indexFile, "utf8");
  html = await inlineStyles(html, indexFile);
  html = await inlineScripts(html, indexFile);
  html = await inlineMediaSources(html, indexFile);
  html = minifyHtmlText(html);
  assertOffline(html, rel);

  const body = `<!DOCTYPE html>${html.replace(/^<!DOCTYPE html>/i, "")}\n`;
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 12);
  const tmp = `${outputFile}.tmp-${process.pid}-${hash}`;
  await writeFile(tmp, body, "utf8");
  await rename(tmp, outputFile);
  return path.relative(root, outputFile);
}

const lock = await acquireLock();
try {
  const indexes = await collectIndexFiles();
  const bundles = [];

  for (const rel of indexes) {
    bundles.push(await buildBundle(rel));
  }

  console.log(`Bundles offline gerados: ${bundles.join(", ")}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await releaseLock(lock);
}
