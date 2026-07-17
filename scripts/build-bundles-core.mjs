import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { mkdir, open, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { constants as zlibConstants, deflateRawSync } from "node:zlib";
import { minifyCssText, minifyHtmlText, minifyJsText, stripSourceMapReferences } from "./asset-optimizer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const cacheDir = path.join(root, ".cache", "build");
const lockPath = path.join(cacheDir, "bundle.lock");

const externalResources = new Map([
  [
    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.8.0/html2pdf.bundle.min.js",
    path.join(root, "node_modules", "html2pdf.js", "dist", "html2pdf.bundle.min.js")
  ],
  [
    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.14.0/html2pdf.bundle.min.js",
    path.join(root, "node_modules", "html2pdf.js", "dist", "html2pdf.bundle.min.js")
  ],
  [
    "https://cdnjs.cloudflare.com/ajax/libs/zepto/1.2.0/zepto.min.js",
    path.join(root, "node_modules", "zepto", "dist", "zepto.min.js")
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
const crcTable = Array.from({ length: 256 }, (_item, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return value >>> 0;
});

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

async function collectIndexFiles(dir = distDir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = prefix ? path.join(prefix, entry.name) : entry.name;
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
  const resolved = normalized.startsWith("/")
    ? path.resolve(distDir, normalized.slice(1))
    : path.resolve(baseDir, normalized);
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
  // PROTECAO: evita o estado HTML "script data double escaped" em strings de dependencias.
  return js.replace(/<\/script/gi, "<\\/script").replace(/<script/gi, "<\\x73cript");
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

    const source = await readFile(file, "utf8");
    const js = externalResources.has(src)
      ? stripSourceMapReferences(source)
      : await minifyJsText(source, path.relative(root, file));
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

async function embedOfflineCatalog(html) {
  const source = JSON.parse(await readFile(path.join(distDir, "assets", "config", "apps.json"), "utf8"));
  const dataUrlFromCatalogRef = async (ref) => {
    if (!ref || /^data:/i.test(ref)) {
      return ref;
    }
    const file = resolveResource(ref, distDir);
    return file ? await toDataUrl(file) : undefined;
  };
  const catalog = {
    ...source,
    workspaceOfflineLogo: await dataUrlFromCatalogRef(source.workspaceLogo),
    apps: Array.isArray(source.apps)
      ? await Promise.all(source.apps.map(async (app) => ({
        ...app,
        href: new URL(app.href, "https://tools.jcem.pro/").href,
        offlineLogo: await dataUrlFromCatalogRef(app.logo)
      })))
      : []
  };
  const encoded = JSON.stringify(catalog).split("")
    .map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .join("");
  const meta = `<meta name="jcem-app-catalog" content="${encoded}">`;
  return /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, (head) => `${head}${meta}`) : `${meta}${html}`;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime() {
  return {
    date: (1 << 5) | 1,
    time: 0
  };
}

function writeUInt16(value) {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function writeUInt32(value) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZipSingleFile(filename, content) {
  const name = Buffer.from(filename, "utf8");
  const source = Buffer.from(content, "utf8");
  const compressed = deflateRawSync(source, { level: zlibConstants.Z_BEST_COMPRESSION });
  const checksum = crc32(source);
  const { date, time } = dosDateTime();
  const localHeader = Buffer.concat([
    writeUInt32(0x04034b50),
    writeUInt16(20),
    writeUInt16(0x0800),
    writeUInt16(8),
    writeUInt16(time),
    writeUInt16(date),
    writeUInt32(checksum),
    writeUInt32(compressed.byteLength),
    writeUInt32(source.byteLength),
    writeUInt16(name.byteLength),
    writeUInt16(0),
    name
  ]);
  const centralHeader = Buffer.concat([
    writeUInt32(0x02014b50),
    writeUInt16(20),
    writeUInt16(20),
    writeUInt16(0x0800),
    writeUInt16(8),
    writeUInt16(time),
    writeUInt16(date),
    writeUInt32(checksum),
    writeUInt32(compressed.byteLength),
    writeUInt32(source.byteLength),
    writeUInt16(name.byteLength),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt32(0),
    writeUInt32(0),
    name
  ]);
  const centralDirectoryOffset = localHeader.byteLength + compressed.byteLength;
  const end = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(1),
    writeUInt16(1),
    writeUInt32(centralHeader.byteLength),
    writeUInt32(centralDirectoryOffset),
    writeUInt16(0)
  ]);

  return Buffer.concat([localHeader, compressed, centralHeader, end]);
}

async function buildBundle(rel) {
  const indexFile = path.join(distDir, rel);
  const dir = path.dirname(indexFile);
  const bundleBaseName = `${path.basename(dir)}.bundle`;
  const htmlName = `${bundleBaseName}.html`;
  const zipName = `${bundleBaseName}.zip`;
  const outputFiles = [
    path.join(distDir, path.dirname(rel), zipName)
  ];
  const legacyOutputFiles = [
    path.join(distDir, path.dirname(rel), htmlName)
  ];

  let html = await readFile(indexFile, "utf8");
  html = await embedOfflineCatalog(html);
  html = await inlineStyles(html, indexFile);
  html = await inlineScripts(html, indexFile);
  html = await inlineMediaSources(html, indexFile);
  html = minifyHtmlText(html);
  assertOffline(html, rel);

  const body = `<!DOCTYPE html>${html.replace(/^<!DOCTYPE html>/i, "")}\n`;
  const zip = createZipSingleFile(htmlName, body);
  const hash = createHash("sha256").update(zip).digest("hex").slice(0, 12);

  for (const outputFile of outputFiles) {
    await mkdir(path.dirname(outputFile), { recursive: true });
    const tmp = `${outputFile}.tmp-${process.pid}-${hash}`;
    await writeFile(tmp, zip);
    await rename(tmp, outputFile);
  }

  for (const legacyOutputFile of legacyOutputFiles) {
    await rm(legacyOutputFile, { force: true });
  }

  return path.relative(root, outputFiles[0]);
}

const lock = await acquireLock();
try {
  const indexes = await collectIndexFiles();
  const bundles = [];

  for (const rel of indexes) {
    if (rel.replace(/\\/g, "/") === "index.html") continue;
    bundles.push(await buildBundle(rel));
  }

  console.log(`Bundles offline gerados: ${bundles.join(", ")}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await releaseLock(lock);
}
