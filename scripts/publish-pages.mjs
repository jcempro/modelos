/**
 * tools.jcem.pro — JeanCarloEM
 * https://github.com/JeanCarloEM/tools.jcem.pro
 * Mozilla Public License 2.0 — https://www.mozilla.org/MPL/2.0/
 * Orquestra a preparacao validada do artefato de publicacao estatica.
 */
import { spawn } from "node:child_process";
import { appendFile, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectConfig } from "./config.mjs";
import { createVersionIndex, generateVersionIndex } from "./generate-version-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Executa a validacao integral usando a entrada publica canonica do manifesto. */
function runCheck() {
  return new Promise((resolve, reject) => {
    const child = process.platform === "win32"
      ? spawn("npm run check", { cwd: root, env: process.env, shell: true, stdio: "inherit" })
      : spawn("npm", ["run", "check"], { cwd: root, env: process.env, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Validacao integral falhou (${signal || code}).`)));
  });
}

/** Percorre o artefato para validar contratos que pertencem exclusivamente ao empacotamento Pages. */
async function collectFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await collectFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

/** Assegura que a raiz produzida satisfaz o contrato central antes de upload. */
async function validateArtifact(config, artifactRoot) {
  const files = await collectFiles(artifactRoot);
  for (const required of config.publication.requiredFiles) {
    if (!(await stat(path.join(artifactRoot, required)).catch(() => undefined))?.isFile()) throw new Error(`Artefato obrigatorio ausente: ${required}`);
  }
  for (const forbidden of config.publication.forbiddenRoots) {
    if (await stat(path.join(artifactRoot, forbidden)).catch(() => undefined)) throw new Error(`Entrada proibida no artefato: ${forbidden}`);
  }
  if (!files.some((file) => file.endsWith(config.publication.bundlePattern))) throw new Error("Nenhum bundle publicavel foi gerado.");
  if (files.some((file) => file.endsWith(config.publication.legacyBundlePattern))) throw new Error("Bundle legado solto encontrado no artefato.");
}

/** Publica saidas para o GitHub Actions sem duplicar configuracao no workflow. */
async function writeActionOutputs(values, environment) {
  if (!environment.GITHUB_OUTPUT) return;
  await appendFile(environment.GITHUB_OUTPUT, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`, "utf8");
}

/** Prepara em uma unica execucao o build, bundles, validacao e metadado efemero aplicavel. */
export async function preparePublication(environment = process.env, args = process.argv.slice(2)) {
  const config = await loadProjectConfig();
  await runCheck();
  const artifactRoot = path.join(root, config.paths.distribution);
  await validateArtifact(config, artifactRoot);
  const pagesMode = args.includes("--pages");
  const shouldDeploy = pagesMode && environment.GITHUB_ACTIONS === "true" && environment.GITHUB_EVENT_NAME === "push" && environment.GITHUB_REF === `refs/heads/${config.publication.primaryBranch}`;
  if (shouldDeploy) {
    const output = await generateVersionIndex({ ...environment, JCEM_DEPLOY_VERSION: environment.GITHUB_SHA });
    const payload = JSON.parse(await readFile(output, "utf8"));
    const expected = createVersionIndex(environment.GITHUB_SHA, payload.timestamp);
    if (payload.hash !== expected.hash || payload.timestamp !== expected.timestamp) throw new Error("Indexador de versao divergente da publicacao.");
  }
  await writeActionOutputs({ "should-deploy": shouldDeploy, "artifact-path": config.paths.distribution }, environment);
  console.log(`Publicacao preparada em ${config.paths.distribution}/; deploy=${shouldDeploy}.`);
  return { artifactRoot, shouldDeploy };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  preparePublication().catch((error) => { console.error(error); process.exitCode = 1; });
}
