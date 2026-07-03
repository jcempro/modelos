import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { mkdir, open, readFile, readdir, rename, rm, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { optimizeTextByPath } from "./asset-optimizer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "site");
const distDir = path.join(root, "dist");
const cacheDir = path.join(root, ".cache", "build");
const manifestPath = path.join(cacheDir, "dist-manifest.json");
const lockPath = path.join(cacheDir, "dist.lock");

const optimizerVersion = "dist-optimizer-v1";
const textExtensions = new Set([".css", ".html", ".js", ".json"]);
const rootPassthroughFiles = ["CNAME"];
const generatedRootFiles = new Map([[".nojekyll", ""]]);

function isBundleArtifact(rel) {
  return /\.bundle\.(?:html|zip)$/i.test(rel);
}

async function acquireLock() {
  await mkdir(cacheDir, { recursive: true });
  try {
    return await open(lockPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_RDWR);
  } catch (error) {
    throw new Error(`Build de dist ja esta em execucao ou lock antigo presente em ${lockPath}. Erro: ${error.message}`);
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
  const tmp = `${manifestPath}.tmp-${process.pid}`;
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

async function collectFiles(dir = siteDir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = prefix ? path.join(prefix, entry.name) : entry.name;
    if (isBundleArtifact(rel)) {
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

async function collectAllFiles(dir = distDir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const rel = prefix ? path.join(prefix, entry.name) : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectAllFiles(full, rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }

  return files;
}

async function pruneEmptyDirectories(dir = distDir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    await pruneEmptyDirectories(path.join(dir, entry.name));
  }

  if (dir !== distDir) {
    await rmdir(dir).catch(() => undefined);
  }
}

async function writeChanged(files, oldManifest) {
  const nextManifest = { files: {} };
  await mkdir(distDir, { recursive: true });

  for (const rel of files) {
    const src = path.join(siteDir, rel);
    const dest = path.join(distDir, rel);
    await stat(src);
    const output = await buildOutput(rel, src);
    const hash = hashBuffer(Buffer.concat([Buffer.from(`${optimizerVersion}\0${rel}\0`, "utf8"), output]));
    const old = oldManifest.files[rel];
    nextManifest.files[rel] = { hash, size: output.byteLength };
    const currentDest = await stat(dest).catch(() => undefined);

    if (old && old.hash === hash && old.size === output.byteLength && currentDest?.isFile()) {
      continue;
    }

    await mkdir(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.tmp-${process.pid}`;
    await writeFile(tmp, output);
    await rename(tmp, dest);
  }

  for (const rel of rootPassthroughFiles) {
    const src = path.join(root, rel);
    const exists = await stat(src).catch(() => undefined);

    if (!exists?.isFile()) {
      continue;
    }

    const dest = path.join(distDir, rel);
    const output = await readFile(src);
    const hash = hashBuffer(Buffer.concat([Buffer.from(`${optimizerVersion}\0${rel}\0`, "utf8"), output]));
    const old = oldManifest.files[rel];
    nextManifest.files[rel] = { hash, size: output.byteLength };
    const currentDest = await stat(dest).catch(() => undefined);

    if (old && old.hash === hash && old.size === output.byteLength && currentDest?.isFile()) {
      continue;
    }

    await mkdir(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.tmp-${process.pid}`;
    await writeFile(tmp, output);
    await rename(tmp, dest);
  }

  for (const [rel, content] of generatedRootFiles) {
    const dest = path.join(distDir, rel);
    const output = Buffer.from(content, "utf8");
    const hash = hashBuffer(Buffer.concat([Buffer.from(`${optimizerVersion}\0${rel}\0`, "utf8"), output]));
    const old = oldManifest.files[rel];
    nextManifest.files[rel] = { hash, size: output.byteLength };
    const currentDest = await stat(dest).catch(() => undefined);

    if (old && old.hash === hash && old.size === output.byteLength && currentDest?.isFile()) {
      continue;
    }

    await mkdir(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.tmp-${process.pid}`;
    await writeFile(tmp, output);
    await rename(tmp, dest);
  }

  for (const rel of Object.keys(oldManifest.files || {})) {
    if (!nextManifest.files[rel]) {
      await rm(path.join(distDir, rel), { force: true });
    }
  }

  for (const rel of await collectAllFiles()) {
    if (!nextManifest.files[rel]) {
      await rm(path.join(distDir, rel), { force: true });
    }
  }

  await pruneEmptyDirectories();

  return nextManifest;
}

const lock = await acquireLock();
try {
  const siteInfo = await stat(siteDir).catch(() => undefined);
  if (!siteInfo?.isDirectory()) {
    throw new Error("site ausente. Execute npm run compile antes de gerar dist.");
  }

  const oldManifest = await readManifest();
  const files = await collectFiles();
  const nextManifest = await writeChanged(files, oldManifest);
  await writeManifest(nextManifest);
  console.log(`dist atualizado: ${Object.keys(nextManifest.files).length} arquivos rastreados.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await releaseLock(lock);
}
