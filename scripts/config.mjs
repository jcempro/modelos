import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(scriptsDir, "config.json");

function assertRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Configuracao invalida em ${label}: objeto esperado.`);
  }
  return value;
}

function normalizeRelativePath(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Configuracao invalida em ${label}: caminho vazio.`);
  }

  const normalized = value.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const segments = normalized.split("/");

  if (path.isAbsolute(value) || segments.includes("..") || segments.some((segment) => segment === "")) {
    throw new Error(`Configuracao invalida em ${label}: caminho relativo seguro esperado (${value}).`);
  }

  return normalized;
}

function normalizeScriptEntries(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Configuracao invalida em ${label}: lista esperada.`);
  }

  return value.map((item, index) => {
    const entry = assertRecord(item, `${label}[${index}]`);
    const source = normalizeRelativePath(entry.source, `${label}[${index}].source`);
    const output = normalizeRelativePath(entry.output, `${label}[${index}].output`);

    if (!source.startsWith("src/")) {
      throw new Error(`Configuracao invalida em ${label}[${index}].source: fonte deve estar em src/.`);
    }

    if (/^(?:src|dist)\//.test(output)) {
      throw new Error(`Configuracao invalida em ${label}[${index}].output: saida deve ser relativa a raiz publica.`);
    }

    return { source, output };
  });
}

function normalizeRootFiles(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Configuracao invalida em ${label}: lista esperada.`);
  }

  return value.map((item, index) => normalizeRelativePath(item, `${label}[${index}]`));
}

function normalizeGeneratedRootFiles(value, label) {
  const files = assertRecord(value, label);
  return Object.entries(files).map(([name, content]) => {
    const output = normalizeRelativePath(name, `${label}.${name}`);
    if (typeof content !== "string") {
      throw new Error(`Configuracao invalida em ${label}.${name}: conteudo textual esperado.`);
    }
    return { output, content };
  });
}

function normalizeUrl(value, label) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) throw new Error();
    return url.href;
  } catch {
    throw new Error(`Configuracao invalida em ${label}: URL HTTP(S) absoluta esperada.`);
  }
}

function normalizePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Configuracao invalida em ${label}: inteiro positivo esperado.`);
  return value;
}

export async function loadProjectConfig() {
  const config = assertRecord(JSON.parse(await readFile(configPath, "utf8")), "scripts/config.json");
  const paths = assertRecord(config.paths, "paths");
  const site = assertRecord(config.site, "site");
  const development = assertRecord(config.development, "development");
  const publication = assertRecord(config.publication, "publication");
  const vendor = Array.isArray(development.vendor) ? development.vendor.map((item, index) => {
    const entry = assertRecord(item, `development.vendor[${index}]`);
    return {
      url: normalizeUrl(entry.url, `development.vendor[${index}].url`),
      file: normalizeRelativePath(entry.file, `development.vendor[${index}].file`),
      route: `/${normalizeRelativePath(`${entry.route ?? ""}`.replace(/^\/+/, ""), `development.vendor[${index}].route`)}`
    };
  }) : (() => { throw new Error("Configuracao invalida em development.vendor: lista esperada."); })();

  return {
    paths: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, normalizeRelativePath(value, `paths.${key}`)])),
    site: {
      publicBaseUrl: normalizeUrl(site.publicBaseUrl, "site.publicBaseUrl")
    },
    development: {
      host: `${development.host ?? ""}`.trim(),
      port: normalizePositiveInteger(development.port, "development.port"),
      rebuildDebounceMs: normalizePositiveInteger(development.rebuildDebounceMs, "development.rebuildDebounceMs"),
      liveRoute: `/${normalizeRelativePath(`${development.liveRoute ?? ""}`.replace(/^\/+/, ""), "development.liveRoute")}`,
      vendor
    },
    publication: {
      primaryBranch: normalizeRelativePath(publication.primaryBranch, "publication.primaryBranch"),
      versionIndex: normalizeRelativePath(publication.versionIndex, "publication.versionIndex"),
      requiredFiles: normalizeRootFiles(publication.requiredFiles, "publication.requiredFiles"),
      forbiddenRoots: normalizeRootFiles(publication.forbiddenRoots, "publication.forbiddenRoots"),
      bundlePattern: `${publication.bundlePattern ?? ""}`,
      legacyBundlePattern: `${publication.legacyBundlePattern ?? ""}`
    },
    build: assertRecord(config.build, "build")
  };
}

export async function loadBuildConfig() {
  const { build } = await loadProjectConfig();

  return {
    browserScripts: normalizeScriptEntries(build.browserScripts, "build.browserScripts"),
    bookmarklets: normalizeScriptEntries(build.bookmarklets, "build.bookmarklets"),
    rootPassthroughFiles: normalizeRootFiles(build.rootPassthroughFiles, "build.rootPassthroughFiles"),
    generatedRootFiles: normalizeGeneratedRootFiles(build.generatedRootFiles, "build.generatedRootFiles")
  };
}
