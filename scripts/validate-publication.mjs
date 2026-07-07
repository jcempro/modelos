import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { loadBuildConfig } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");
const buildConfig = await loadBuildConfig();

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
const protectedChromeTerms = [
  "JeanCarloEM",
  "jeancarloem",
  "tools.jcem.pro",
  "Mozilla Public License",
  "mozilla.org/MPL",
  "Código disponibilizado sob",
  "Modelos e ferramentas são recursos auxiliares",
  "Os recursos não substituem",
  "único instrumento normativo",
  "Disclaimer e isenção"
];
const compiledOutputs = new Map([
  ...buildConfig.browserScripts,
  ...buildConfig.bookmarklets
].map(({ output, source }) => [output, source.replace(/^src\//, "")]));

function normalizeRel(file) {
  return file.split(path.sep).join("/");
}

function hasForbiddenPublicSegment(rel) {
  return normalizeRel(rel).split("/").some((segment) => ["src", "dist"].includes(segment.toLowerCase()));
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

async function collectDirectories(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const dirs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const rel = prefix ? path.join(prefix, entry.name) : entry.name;
    const full = path.join(dir, entry.name);
    dirs.push(normalizeRel(rel), ...await collectDirectories(full, rel));
  }

  return dirs.sort((a, b) => a.localeCompare(b));
}

async function assertFile(file, message) {
  const info = await stat(file).catch(() => undefined);
  if (!info?.isFile()) {
    throw new Error(message);
  }
}

function assertNoForbiddenPublicSegments(files) {
  const invalid = files.filter(hasForbiddenPublicSegment);
  if (invalid.length > 0) {
    throw new Error(`dist/ contem caminhos publicos com segmento reservado: ${invalid.join(", ")}`);
  }
}

function assertNoPublicSourceReferences(rel, content) {
  const forbiddenHtmlAttribute = /<[^>]+\b(?:href|src|data)\s*=\s*(["'])(?:(?:https?:)?\/\/[^"']*\/src\/|\/src\/|\.{0,2}\/src\/|src\/)[^"']*\1/i;
  const forbiddenCssUrl = /url\(\s*(["']?)(?:(?:https?:)?\/\/[^"')]*\/src\/|\/src\/|\.{0,2}\/src\/|src\/)[^"')]*\1\s*\)/i;

  if (forbiddenHtmlAttribute.test(content) || forbiddenCssUrl.test(content)) {
    throw new Error(`dist/${rel} contem caminho publico para src/`);
  }
}

function assertNoSourceMapReference(rel, content) {
  if (/sourceMappingURL/i.test(content)) {
    throw new Error(`dist/${rel} contem referencia a source map em artefato de producao`);
  }
}

function assertNoProtectedChromeText(rel, content) {
  const found = protectedChromeTerms.filter((term) => content.includes(term));
  if (found.length > 0) {
    throw new Error(`dist/${rel} expoe texto institucional protegido em claro: ${found.join(", ")}`);
  }
}

function bundleForIndex(rel) {
  return `${path.dirname(rel)}/${path.basename(path.dirname(rel))}.bundle.zip`.replace(/^\.\//, "");
}

function bundleHtmlNameForIndex(rel) {
  return `${path.basename(path.dirname(rel))}.bundle.html`;
}

async function assertBundleZip(rel, expectedInnerName) {
  const data = await readFile(path.join(distDir, rel));
  if (data.length < 4 || data.readUInt32LE(0) !== 0x04034b50) {
    throw new Error(`Bundle offline nao e ZIP valido em dist/: ${rel}`);
  }
  if (!data.includes(Buffer.from(expectedInnerName, "utf8"))) {
    throw new Error(`Bundle ZIP nao contem HTML autocontido esperado (${expectedInnerName}) em dist/: ${rel}`);
  }
  const html = extractSingleFileZipText(data, expectedInnerName, rel);
  assertAutonomousBundleHtml(rel, html);
  assertNoSourceMapReference(rel, html);
}

function extractSingleFileZipText(data, expectedInnerName, rel) {
  const method = data.readUInt16LE(8);
  const compressedSize = data.readUInt32LE(18);
  const filenameLength = data.readUInt16LE(26);
  const extraLength = data.readUInt16LE(28);
  const nameStart = 30;
  const nameEnd = nameStart + filenameLength;
  const name = data.subarray(nameStart, nameEnd).toString("utf8");

  if (name !== expectedInnerName) {
    throw new Error(`Bundle ZIP contem nome interno inesperado em dist/: ${rel}: ${name}`);
  }

  const contentStart = nameEnd + extraLength;
  const compressed = data.subarray(contentStart, contentStart + compressedSize);

  if (method === 0) {
    return compressed.toString("utf8");
  }

  if (method === 8) {
    return inflateRawSync(compressed).toString("utf8");
  }

  throw new Error(`Bundle ZIP usa metodo de compressao nao suportado em dist/: ${rel}: ${method}`);
}

function assertAutonomousBundleHtml(rel, html) {
  const scriptBlocks = [...html.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)];
  const externalScript = scriptBlocks.find((match) => /\bsrc\s*=/i.test(match[1] ?? ""));

  if (externalScript) {
    throw new Error(`Bundle offline contem script externo ou dependente de arquivo em dist/: ${rel}`);
  }

  scriptBlocks.forEach((match, index) => {
    assertNoProtectedChromeText(`${rel}#script-${index + 1}`, match[0]);
  });

  const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const stylesheetLink = /<link\b[^>]*\brel\s*=\s*(["'])[^"']*\bstylesheet\b[^"']*\1[^>]*>/i;
  if (stylesheetLink.test(withoutScripts)) {
    throw new Error(`Bundle offline contem stylesheet externo ou dependente de arquivo em dist/: ${rel}`);
  }

  const externalResource = /<(?:img|source|audio|video|iframe|object|embed)\b[^>]*(?:src|data)\s*=\s*(["'])https?:\/\//i;
  const cssExternal = /<(?:style|[^>]+\bstyle=)[\s\S]*?url\(\s*(["']?)https?:\/\//i;
  if (externalResource.test(withoutScripts) || cssExternal.test(withoutScripts)) {
    throw new Error(`Bundle offline contem recurso externo automatico em dist/: ${rel}`);
  }
}

async function assertBundleLink(rel, bundle) {
  const content = await readFile(path.join(distDir, rel), "utf8");
  if (!content.includes("data-bundle-download")) {
    return;
  }

  const expectedHref = `/${bundle}`;
  const escaped = expectedHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expectedPattern = new RegExp(`\\bhref\\s*=\\s*(["'])${escaped}\\1`, "i");
  if (!expectedPattern.test(content)) {
    throw new Error(`dist/${rel} declara download de bundle, mas nao aponta para ${expectedHref}`);
  }
}

async function validatePublicText(files) {
  for (const rel of files) {
    if (!textOutputExtensions.has(path.extname(rel).toLowerCase())) {
      continue;
    }
    const content = await readFile(path.join(distDir, rel), "utf8");
    assertNoPublicSourceReferences(rel, content);
    assertNoSourceMapReference(rel, content);
    if (path.extname(rel).toLowerCase() === ".js") {
      assertNoProtectedChromeText(rel, content);
    }
  }
}

function assertExactFiles(files, expectedFiles) {
  const unexpected = files.filter((rel) => !expectedFiles.has(rel));
  if (unexpected.length > 0) {
    throw new Error(`dist/ contem artefatos sem origem publica esperada: ${unexpected.join(", ")}`);
  }
}

function assertNoEmptyDirectories(directories, files) {
  const empty = directories.filter((dir) => !files.some((file) => file.startsWith(`${dir}/`)));
  if (empty.length > 0) {
    throw new Error(`dist/ contem diretorios vazios ou obsoletos: ${empty.join(", ")}`);
  }
}

async function main() {
  await assertFile(path.join(root, "CNAME"), "CNAME ausente na raiz do projeto.");

  const srcFiles = await collectFiles(srcDir);
  const distFiles = await collectFiles(distDir);
  const distDirectories = await collectDirectories(distDir);
  const distSet = new Set(distFiles);
  const sourceStaticFiles = srcFiles.filter(isStaticSource);
  const sourceIndexFiles = sourceStaticFiles.filter((file) => path.basename(file).toLowerCase() === "index.html");
  const expectedFiles = new Set([
    ...sourceStaticFiles,
    ...compiledOutputs.keys(),
    ...buildConfig.rootPassthroughFiles,
    ...buildConfig.generatedRootFiles.map(({ output }) => output)
  ]);

  assertNoForbiddenPublicSegments(distFiles);

  for (const rel of [...buildConfig.rootPassthroughFiles, ...buildConfig.generatedRootFiles.map(({ output }) => output)]) {
    if (!distSet.has(rel)) {
      throw new Error(`Artefato raiz obrigatorio ausente em dist/: ${rel}`);
    }
  }

  for (const rel of ["README.md", "readme.md"]) {
    if (distSet.has(rel)) {
      throw new Error(`README nao deve integrar o artefato publico Pages: ${rel}`);
    }
  }

  for (const rel of sourceStaticFiles) {
    if (!distSet.has(rel)) {
      throw new Error(`dist/ nao materializa fonte estatica publica: src/${rel} -> dist/${rel}`);
    }
  }

  for (const [output, source] of compiledOutputs) {
    if (!srcFiles.includes(source)) {
      throw new Error(`Fonte compilada ausente: src/${source}`);
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
    const bundle = bundleForIndex(rel);
    expectedFiles.add(bundle);
    if (!distSet.has(bundle)) {
      throw new Error(`Bundle offline ausente em dist/ para ${publicPath}: ${bundle}`);
    }
    await assertBundleZip(bundle, bundleHtmlNameForIndex(rel));
    await assertBundleLink(rel, bundle);
  }

  for (const rel of distFiles) {
    if (rel.endsWith(".bundle.html")) {
      throw new Error(`Bundle HTML solto nao deve ser publicado; use ZIP: ${rel}`);
    }
  }

  assertExactFiles(distFiles, expectedFiles);
  assertNoEmptyDirectories(distDirectories, distFiles);
  await validatePublicText(distFiles);

  console.log(`Publicacao validada: ${sourceIndexFiles.length} paginas, ${distFiles.length} arquivos em dist/.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
