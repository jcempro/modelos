import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const siteDir = path.join(root, "site");
const distDir = path.join(root, "dist");

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
const textOutputExtensions = new Set([".css", ".html", ".js", ".json", ".txt", ".xml"]);
const distOnlyFiles = new Set(["CNAME", ".nojekyll"]);

const compiledOutputs = new Map([
  ["assets/js/documentos.js", "assets/js/documentos.ts"],
  ["oficios/admissional/admissional.js", "oficios/admissional/admissional.ts"],
  ["faturamento/faturamento.js", "faturamento/faturamento.ts"],
  ["dizimo/assets/js/main.js", "dizimo/assets/js/main.ts"],
  ["tools/bd/bd.js", "tools/bd/bd.ts"],
  ["favoritos/remover.paywall.js", "favoritos/remover.paywall.ts"],
  ["favoritos/dark.discourse.js", "favoritos/dark.discourse.ts"]
]);

function normalizeRel(file) {
  return file.split(path.sep).join("/");
}

function hasSrcSegment(rel) {
  return normalizeRel(rel).split("/").some((segment) => segment.toLowerCase() === "src");
}

function isStaticSource(rel) {
  if (path.basename(rel).toLowerCase() === "rcf.md") {
    return false;
  }
  return staticSourceExtensions.has(path.extname(rel).toLowerCase());
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
      files.push(normalizeRel(rel));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function assertFile(file, message) {
  const info = await stat(file).catch(() => undefined);
  if (!info?.isFile()) {
    throw new Error(message);
  }
}

function assertNoSrcSegments(label, files) {
  const invalid = files.filter(hasSrcSegment);
  if (invalid.length > 0) {
    throw new Error(`${label} contem caminhos publicos com segmento src/: ${invalid.join(", ")}`);
  }
}

function assertNoPublicSrcReferences(label, rel, content) {
  const forbiddenHtmlAttribute = /<[^>]+\b(?:href|src|data)\s*=\s*(["'])(?:(?:https?:)?\/\/[^"']*\/src\/|\/src\/|\.{0,2}\/src\/|src\/)[^"']*\1/i;
  const forbiddenCssUrl = /url\(\s*(["']?)(?:(?:https?:)?\/\/[^"')]*\/src\/|\/src\/|\.{0,2}\/src\/|src\/)[^"')]*\1\s*\)/i;

  if (forbiddenHtmlAttribute.test(content) || forbiddenCssUrl.test(content)) {
    throw new Error(`${label}/${rel} contem caminho publico para src/`);
  }
}

function bundleForIndex(rel) {
  return `${path.dirname(rel)}/${path.basename(path.dirname(rel))}.bundle.html`.replace(/^\.\//, "");
}

async function validatePublicText(label, dir, files) {
  for (const rel of files) {
    if (!textOutputExtensions.has(path.extname(rel).toLowerCase())) {
      continue;
    }
    const content = await readFile(path.join(dir, rel), "utf8");
    assertNoPublicSrcReferences(label, rel, content);
  }
}

async function main() {
  await assertFile(path.join(root, "CNAME"), "CNAME ausente na raiz do projeto.");

  const srcFiles = await collectFiles(srcDir);
  const siteFiles = await collectFiles(siteDir);
  const distFiles = await collectFiles(distDir);
  const siteSet = new Set(siteFiles);
  const distSet = new Set(distFiles);
  const sourceStaticFiles = srcFiles.filter(isStaticSource);
  const sourceIndexFiles = sourceStaticFiles.filter((file) => path.basename(file).toLowerCase() === "index.html");

  assertNoSrcSegments("site", siteFiles);
  assertNoSrcSegments("dist", distFiles);

  for (const rel of sourceStaticFiles) {
    if (!siteSet.has(rel)) {
      throw new Error(`site/ nao espelha fonte estatica publica: src/${rel} -> site/${rel}`);
    }
    if (!distSet.has(rel)) {
      throw new Error(`dist/ nao espelha cache publico: site/${rel} -> dist/${rel}`);
    }
  }

  for (const [output, source] of compiledOutputs) {
    if (!srcFiles.includes(source)) {
      throw new Error(`Fonte compilada ausente: src/${source}`);
    }
    if (!siteSet.has(output)) {
      throw new Error(`Cache compilado ausente: site/${output}`);
    }
    if (!distSet.has(output)) {
      throw new Error(`Artefato compilado ausente: dist/${output}`);
    }
  }

  for (const rel of sourceIndexFiles) {
    const publicPath = path.dirname(rel) === "." ? "/" : `/${normalizeRel(path.dirname(rel))}/`;
    if (publicPath.toLowerCase().includes("/src/")) {
      throw new Error(`URL publica invalida para src/${rel}: ${publicPath}`);
    }
    if (!distSet.has(bundleForIndex(rel))) {
      throw new Error(`Bundle offline ausente para ${publicPath}: ${bundleForIndex(rel)}`);
    }
  }

  for (const rel of siteFiles) {
    if (!distSet.has(rel)) {
      throw new Error(`dist/ nao contem artefato correspondente ao cache site/: ${rel}`);
    }
  }

  for (const rel of distFiles) {
    if (distOnlyFiles.has(rel) || rel.endsWith(".bundle.html")) {
      continue;
    }
    if (!siteSet.has(rel)) {
      throw new Error(`dist/ contem artefato sem origem correspondente em site/: ${rel}`);
    }
  }

  for (const rel of distOnlyFiles) {
    if (!distSet.has(rel)) {
      throw new Error(`Artefato raiz obrigatorio ausente em dist/: ${rel}`);
    }
  }

  await validatePublicText("site", siteDir, siteFiles);
  await validatePublicText("dist", distDir, distFiles);

  console.log(`Publicacao validada: ${sourceIndexFiles.length} paginas, ${siteFiles.length} arquivos em site/, ${distFiles.length} arquivos em dist/.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
