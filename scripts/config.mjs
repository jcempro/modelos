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

    if (/^(?:src|site|dist)\//.test(output)) {
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

export async function loadBuildConfig() {
  const config = assertRecord(JSON.parse(await readFile(configPath, "utf8")), "scripts/config.json");
  const build = assertRecord(config.build, "scripts/config.json.build");

  return {
    browserScripts: normalizeScriptEntries(build.browserScripts, "build.browserScripts"),
    bookmarklets: normalizeScriptEntries(build.bookmarklets, "build.bookmarklets"),
    rootPassthroughFiles: normalizeRootFiles(build.rootPassthroughFiles, "build.rootPassthroughFiles"),
    generatedRootFiles: normalizeGeneratedRootFiles(build.generatedRootFiles, "build.generatedRootFiles")
  };
}
