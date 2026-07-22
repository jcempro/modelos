/**
 * tools.jcem.pro — JeanCarloEM
 * https://github.com/JeanCarloEM/tools.jcem.pro
 * Mozilla Public License 2.0 — https://www.mozilla.org/MPL/2.0/
 * Este arquivo integra o construtor de bundles e preserva os avisos autorais.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectConfig } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = await loadProjectConfig();
const distRoot = path.join(root, config.paths.distribution);
const catalogPath = path.join(distRoot, config.paths.catalog);
const sharedScriptPath = path.join(distRoot, config.paths.sharedBrowserScript);
const authorLogoCachePath = path.join(root, config.paths.cache, "author-logo.png");

async function authorLogoDataUrl(authorLogoUrl) {
  try {
    const response = await fetch(authorLogoUrl);
    if (!response.ok) {
      throw new Error(`Falha ao baixar a marca de autoria (${response.status}): ${authorLogoUrl}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error(`Marca de autoria vazia: ${authorLogoUrl}`);
    }
    await mkdir(path.dirname(authorLogoCachePath), { recursive: true });
    await writeFile(authorLogoCachePath, bytes);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch (error) {
    const cached = await readFile(authorLogoCachePath).catch(() => undefined);
    if (cached?.length) {
      return `data:image/png;base64,${cached.toString("base64")}`;
    }
    if (process.env.JCEM_DEV_LIVE === "1") {
      console.warn("[dev-live] Marca de autoria remota indisponivel; mantendo URL remota configurada apenas no bundle live.");
      return authorLogoUrl;
    }
    throw error;
  }
}

const originalCatalog = await readFile(catalogPath, "utf8");
const originalSharedScript = await readFile(sharedScriptPath, "utf8");

try {
  const catalog = JSON.parse(originalCatalog);
  const configuredAuthorLogoUrl = typeof catalog.authorLogoUrl === "string" && catalog.authorLogoUrl.trim() ? catalog.authorLogoUrl : undefined;
  if (!configuredAuthorLogoUrl) throw new Error(`authorLogoUrl ausente em ${config.paths.catalog}.`);
  const authorLogo = await authorLogoDataUrl(configuredAuthorLogoUrl);
  catalog.authorLogo = authorLogo;
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  await writeFile(sharedScriptPath, originalSharedScript.replaceAll(configuredAuthorLogoUrl, authorLogo), "utf8");
  await import("./build-bundles-core.mjs");
} finally {
  // PROTECAO: a publicação Web conserva exclusivamente a URL remota declarada.
  await writeFile(catalogPath, originalCatalog, "utf8");
  await writeFile(sharedScriptPath, originalSharedScript, "utf8");
}
