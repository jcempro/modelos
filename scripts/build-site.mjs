import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { copyFile, mkdir, open, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "_site");
const cacheDir = path.join(root, ".cache", "build");
const manifestPath = path.join(cacheDir, "manifest.json");
const lockPath = path.join(cacheDir, "build.lock");

const excludedTopLevel = new Set([".cache", ".git", ".github", "_site", "node_modules", "scripts", "src", "tests"]);
const excludedFiles = new Set([".gitignore", "eslint.config.mjs", "package.json", "package-lock.json", "tsconfig.json"]);

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

async function hashFile(file) {
  const data = await readFile(file);
  return createHash("sha256").update(data).digest("hex");
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
    const fileStat = await stat(src);
    const hash = await hashFile(src);
    const old = oldManifest.files[rel];
    nextManifest.files[rel] = { hash, size: fileStat.size };

    if (old && old.hash === hash && old.size === fileStat.size) {
      continue;
    }

    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
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
