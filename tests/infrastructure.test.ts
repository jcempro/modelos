import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

async function collectIndexFiles(dir = "site"): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectIndexFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      files.push(full);
    }
  }

  return files;
}

test("package exposes the full development lifecycle", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };

  for (const script of ["build", "build:dist", "build:site", "bundle", "check", "compile", "dev", "dev-live", "lint", "test", "type-check", "validate"]) {
    assert.ok(pkg.scripts[script], `missing npm script: ${script}`);
  }
});

test("TypeScript target is ES2020 or newer", async () => {
  const tsconfig = JSON.parse(await readFile("tsconfig.json", "utf8")) as {
    compilerOptions: { target: string };
  };

  assert.match(tsconfig.compilerOptions.target, /^ES20(2\d|[3-9]\d)$/);
});

test("published index pages use stable local asset paths", async () => {
  const attributePattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  const relativeLocalReferences: string[] = [];

  for (const file of await collectIndexFiles()) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(attributePattern)) {
      const value = match[1] ?? "";
      if (/^(?:https?:|\/\/|\/|#|data:|mailto:|tel:)/i.test(value)) {
        continue;
      }
      relativeLocalReferences.push(`${file}: ${value}`);
    }
  }

  assert.deepEqual(relativeLocalReferences, []);
});
