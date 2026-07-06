import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

async function collectIndexFiles(dir = "src"): Promise<string[]> {
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

  for (const script of ["build", "build:dist", "bundle", "check", "compile", "dev", "dev-live", "lint", "test", "type-check", "validate", "validate:publication"]) {
    assert.ok(pkg.scripts[script], `missing npm script: ${script}`);
  }
});

test("TypeScript target is ES2020 or newer", async () => {
  const tsconfig = JSON.parse(await readFile("tsconfig.json", "utf8")) as {
    compilerOptions: { target: string };
  };

  assert.match(tsconfig.compilerOptions.target, /^ES20(2\d|[3-9]\d)$/);
});

test("source index pages use stable local asset paths", async () => {
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

test("build config keeps source and public paths explicit", async () => {
  const config = JSON.parse(await readFile("scripts/config.json", "utf8")) as {
    build: {
      browserScripts: Array<{ source: string; output: string }>;
      bookmarklets: Array<{ source: string; output: string }>;
      rootPassthroughFiles: string[];
      generatedRootFiles: Record<string, string>;
    };
  };
  const entries = [...config.build.browserScripts, ...config.build.bookmarklets];

  for (const entry of entries) {
    assert.match(entry.source, /^src\/.+\.ts$/);
    assert.doesNotMatch(entry.output, /^(?:src|dist)\//);
    assert.doesNotMatch(entry.output, /(?:^|\/)\.\.(?:\/|$)/);
  }

  assert.ok(config.build.rootPassthroughFiles.includes("CNAME"));
  assert.equal(config.build.generatedRootFiles[".nojekyll"], "");
});

test("modules use shared institutional chrome except dizimo", async () => {
  const violations: string[] = [];

  for (const file of await collectIndexFiles()) {
    const normalized = file.split(path.sep).join("/");
    if (normalized === "src/dizimo/index.html") {
      continue;
    }

    const html = await readFile(file, "utf8");
    if (!html.includes('/assets/js/documentos.js')) {
      violations.push(`${normalized}: missing shared documentos.js`);
    }
    if (!html.includes("data-jcem-actions")) {
      violations.push(`${normalized}: missing shared chrome action slot`);
    }
    if (/<\s*(?:header|footer)\b/i.test(html)) {
      violations.push(`${normalized}: declares local header/footer`);
    }
  }

  assert.deepEqual(violations, []);
});

test("shared printable surface stays light under forced dark modes", async () => {
  const css = await readFile("src/assets/css/documentos.css", "utf8");

  assert.match(css, /\.print-page,\s*div\.main\s*{/);
  assert.match(css, /color-scheme:\s*only light;/);
  assert.match(css, /forced-color-adjust:\s*none;/);
});

test("print page sizing does not constrain application chrome globally", async () => {
  const ts = await readFile("src/assets/js/documentos.ts", "utf8");

  assert.doesNotMatch(ts, /\*\{max-width:/);
  assert.match(ts, /body:not\(\.imprimir\) div\.main/);
  assert.match(ts, /body\.imprimir div\.main/);
});
