/**
 * tools.jcem.pro — JeanCarloEM
 * https://github.com/JeanCarloEM/tools.jcem.pro
 * Mozilla Public License 2.0 — https://www.mozilla.org/MPL/2.0/
 * Gera o indexador efemero da revisao efetivamente enviada ao GitHub Pages.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Normaliza os dados publicos e rejeita revisoes ou timestamps ambiguos. */
export function createVersionIndex(hash, timestamp) {
  const normalizedHash = `${hash ?? ""}`.trim().toLowerCase();
  const normalizedTimestamp = Number(timestamp);
  if (!/^[0-9a-f]{40}$/.test(normalizedHash)) throw new Error("JCEM_DEPLOY_VERSION deve ser um SHA Git completo.");
  if (!Number.isSafeInteger(normalizedTimestamp) || normalizedTimestamp <= 0) throw new Error("Timestamp Unix de deploy invalido.");
  return { hash: normalizedHash, timestamp: normalizedTimestamp };
}

/** Grava somente no artefato efemero de uma publicacao oficial da branch primaria. */
export async function generateVersionIndex(environment = process.env) {
  if (environment.GITHUB_ACTIONS !== "true" || environment.GITHUB_REF !== "refs/heads/master") {
    throw new Error("version.json so pode ser gerado no deploy oficial do GitHub Pages.");
  }
  const payload = createVersionIndex(environment.JCEM_DEPLOY_VERSION, Math.floor(Date.now() / 1000));
  const output = path.join(root, "dist", "version.json");
  await writeFile(output, `${JSON.stringify(payload)}\n`, "utf8");
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateVersionIndex().then((output) => console.log(`Indexador de versao gerado: ${path.relative(root, output)}`)).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
