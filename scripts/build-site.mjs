import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { mkdir, open, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { optimizeTextByPath } from "./asset-optimizer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "_site");
const cacheDir = path.join(root, ".cache", "build");
const manifestPath = path.join(cacheDir, "manifest.json");
const lockPath = path.join(cacheDir, "build.lock");

const excludedTopLevel = new Set([".cache", ".git", ".github", "_site", "node_modules", "scripts", "src", "tests"]);
const excludedFiles = new Set([".gitignore", "eslint.config.mjs", "package.json", "package-lock.json", "tsconfig.json"]);
const optimizerVersion = "site-optimizer-v1";
const textExtensions = new Set([".css", ".html", ".js", ".json"]);

async function acquireLock() {
  await mkdir(cacheDir, { recursive: true });
  try {
    return await open(lockPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_RDWR);
  } catch (error) {
    throw new Error(`Build ja esta em execucao ou lock antigo presente em ${lockPath}. Remova o lock apenas se nao houver build ativo. Erro: ${error.message}`);
  }
}

async function releaseLock(handle) {
  await handle.close();
  await unlink(lockPath).catch(() => undefined);
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (_error) {
    return { files: {} };
  }
}

async function writeManifest(manifest) {
  const tmp = `${manifestPath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(tmp, manifestPath);
}

function hashBuffer(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function buildOutput(rel, src) {
  const ext = path.extname(rel).toLowerCase();

  if (!textExtensions.has(ext)) {
    return await readFile(src);
  }

  const source = await readFile(src, "utf8");
  const optimized = await optimizeTextByPath(rel, source);
  return Buffer.from(optimized, "utf8");
}

async function collectFiles(dir = root, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = prefix ? path.join(prefix, entry.name) : entry.name;
    const top = rel.split(path.sep)[0];

    if (excludedTopLevel.has(top) || excludedFiles.has(rel)) {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(full, rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }

  return files;
}

async function copyChanged(files, oldManifest) {
  const nextManifest = { files: {} };
  await mkdir(siteDir, { recursive: true });

  for (const rel of files) {
    const src = path.join(root, rel);
    const dest = path.join(siteDir, rel);
    await stat(src);
    const output = await buildOutput(rel, src);
    const hash = hashBuffer(Buffer.concat([Buffer.from(`${optimizerVersion}\0${rel}\0`, "utf8"), output]));
    const old = oldManifest.files[rel];
    nextManifest.files[rel] = { hash, size: output.byteLength };

    if (old && old.hash === hash && old.size === output.byteLength) {
      continue;
    }

    await mkdir(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.tmp-${process.pid}`;
    await writeFile(tmp, output);
    await rename(tmp, dest);
  }

  for (const rel of Object.keys(oldManifest.files || {})) {
    if (!nextManifest.files[rel]) {
      await rm(path.join(siteDir, rel), { force: true });
    }
  }

  return nextManifest;
}

const lock = await acquireLock();
try {
  const oldManifest = await readManifest();
  const files = await collectFiles();
  const nextManifest = await copyChanged(files, oldManifest);
  await writeManifest(nextManifest);
  console.log(`_site atualizado: ${Object.keys(nextManifest.files).length} arquivos rastreados.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await releaseLock(lock);
}
