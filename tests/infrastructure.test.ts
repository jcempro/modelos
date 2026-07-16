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

test("compile pruning preserves bundle zips for current index pages", async () => {
  const compile = await readFile("scripts/compile.mjs", "utf8");

  assert.match(compile, /function bundleForIndex/);
  assert.match(compile, /path\.posix\.basename\(dir\)\}\.bundle\.zip/);
  assert.match(compile, /generated\.add\(bundle\)/);
});

test("NOSCRIPT source is incorporated without direct publication", async () => {
  const compile = await readFile("scripts/compile.mjs", "utf8");
  const validate = await readFile("scripts/validate-publication.mjs", "utf8");

  assert.match(compile, /const noscriptSource = "NOSCRIPT\.html"/);
  assert.match(compile, /officialNoscriptFragment/);
  assert.match(compile, /withOfficialNoscript/);
  assert.match(validate, /distSet\.has\(noscriptSource\)/);
  assert.match(validate, /assertOfficialNoscript/);
});

test("application modules use shared institutional chrome except declared special pages", async () => {
  const violations: string[] = [];

  for (const file of await collectIndexFiles()) {
    const normalized = file.split(path.sep).join("/");
    if (normalized === "src/dizimo/index.html" || normalized === "src/index.html") {
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

test("printable modules consume the shared document workspace layout", async () => {
  const sharedTs = await readFile("src/assets/js/documentos.ts", "utf8");
  const faturamentoTs = await readFile("src/faturamento/faturamento.ts", "utf8");
  const admissionalTs = await readFile("src/oficios/admissional/admissional.ts", "utf8");
  const faturamentoCss = await readFile("src/faturamento/faturamento.css", "utf8");
  const sharedCss = await readFile("src/assets/css/documentos.css", "utf8");

  assert.match(sharedTs, /renderPrintableLayout/);
  assert.match(sharedTs, /jcem-document-workspace/);
  assert.match(sharedCss, /body\.jcem-printable-layout\s*{[^}]*min-height:\s*100vh;/s);
  assert.match(sharedCss, /body\.jcem-printable-layout\s*{[^}]*margin:\s*0;/s);
  assert.match(sharedCss, /body\.jcem-printable-layout\s*{[^}]*overflow-y:\s*auto;/s);
  assert.doesNotMatch(sharedCss, /body\.jcem-printable-layout\s*{[^}]*overflow:\s*hidden;/s);
  assert.match(sharedCss, /\.jcem-document-workspace\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(sharedCss, /@media\s*\(min-width:\s*1120px\)\s*{[^}]*\.jcem-document-workspace\s*{[^}]*grid-template-columns:/s);
  assert.match(sharedCss, /\.jcem-document-preview-region\s*{[^}]*padding:\s*1rem;/s);
  assert.match(sharedCss, /\.jcem-document-form-region\.no-print,\s*\.jcem-document-form-region\s*{[^}]*background:\s*#e7edf2;/s);
  assert.doesNotMatch(sharedCss, /\.jcem-chrome-footer\s*{[^}]*position:\s*fixed;/s);
  assert.match(faturamentoTs, /api\.layout\.printable/);
  assert.match(admissionalTs, /api\.layout\.printable/);
  assert.doesNotMatch(faturamentoCss, /\.faturamento-shell\s*{/);
  assert.doesNotMatch(faturamentoCss, /\.preview-wrap\s*{/);
});

test("shared toolbar uses declarative Font Awesome icons and portable data actions", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
    devDependencies: Record<string, string>;
  };
  const sharedTs = await readFile("src/assets/js/documentos.ts", "utf8");
  const sharedCss = await readFile("src/assets/css/documentos.css", "utf8");
  const faturamentoTs = await readFile("src/faturamento/faturamento.ts", "utf8");
  const admissionalTs = await readFile("src/oficios/admissional/admissional.ts", "utf8");

  assert.ok(pkg.devDependencies["@fortawesome/free-solid-svg-icons"]);
  assert.ok(pkg.devDependencies["@floating-ui/dom"]);
  assert.equal(pkg.devDependencies["@fortawesome/fontawesome-free"], undefined);
  assert.equal(pkg.devDependencies["@fortawesome/fontawesome-svg-core"], undefined);
  assert.match(sharedTs, /renderIcon/);
  assert.match(sharedTs, /ToolbarItemConfig/);
  assert.match(sharedTs, /toolbarLegacyBlueprints/);
  assert.match(sharedTs, /toolbarFillItems/);
  assert.match(sharedTs, /toolbarActionHooks/);
  assert.match(sharedTs, /hook:\s*"document\.export"/);
  assert.match(sharedTs, /hook:\s*"document\.import"/);
  assert.match(sharedTs, /toolbarRuntime\.actions/);
  assert.match(sharedTs, /id:\s*"blank-pdf"/);
  assert.match(sharedTs, /exportFilling/);
  assert.match(sharedTs, /importFilling/);
  assert.match(sharedTs, /computePosition/);
  assert.match(sharedCss, /--jcem-toolbar-icon-color:\s*#888;\/\*\s*não regredir/);
  assert.match(sharedCss, /\.jcem-chrome-actions\.menu \.jcem-fa-icon\s*{[^}]*var\(--jcem-toolbar-icon-color\)/s);
  assert.match(faturamentoTs, /actions:\s*{/);
  assert.match(admissionalTs, /actions:\s*{/);
  assert.doesNotMatch(faturamentoTs, /api\.toolbar\.bind|api\.share\.bindToolbar/);
  assert.doesNotMatch(admissionalTs, /api\.toolbar\.bind|api\.share\.bindToolbar/);
  assert.doesNotMatch(sharedCss, /\\27A6|\\1F5B6|\\1F5BC|\\232B|\\21E9/);
});

test("institutional chrome protects author, license and legal notices", async () => {
  const sharedTs = await readFile("src/assets/js/documentos.ts", "utf8");
  const guardTs = await readFile("src/assets/js/guard.ts", "utf8");
  const sharedCss = await readFile("src/assets/css/documentos.css", "utf8");
  const compile = await readFile("scripts/compile.mjs", "utf8");
  const validate = await readFile("scripts/validate-publication.mjs", "utf8");
  const { g } = await import("../src/assets/js/guard");
  const seal = g();
  const protectedSources = [sharedTs, guardTs];
  const protectedTerms = [
    "JeanCarloEM",
    "jeancarloem",
    "tools.jcem.pro",
    "Mozilla Public License",
    "mozilla.org/MPL",
    "Código disponibilizado sob",
    "Os recursos não substituem",
    "único instrumento normativo",
    "Nada constitui consultoria",
    "serviço gerenciado",
    "assunção de responsabilidade",
    "responsabilidades civis"
  ];

  for (const source of protectedSources) {
    for (const term of protectedTerms) {
      assert.ok(!source.includes(term), `protected term leaked in source: ${term}`);
    }
  }

  assert.equal(seal.__p0, "JeanCarloEM");
  assert.equal(seal.__p1, "https://www.jeancarloem.com");
  assert.equal(seal.__p2, "Tools JeanCarloEM");
  assert.equal(seal.__p3, "tools.jcem.pro");
  assert.equal(seal.__p4, "Mozilla Public License 2.0");
  assert.equal(seal.__p5, "https://www.mozilla.org/MPL/2.0/");
  assert.match(seal.__p21, /Os recursos não substituem/);
  assert.match(seal.__p22, /único instrumento normativo/);
  assert.match(seal.__p23, /Nada constitui consultoria/);
  assert.match(seal.__p23, /assunção de responsabilidade/);
  assert.match(seal.__p23, /responsabilidades civis/);
  assert.match(sharedTs, /guard\(\)/);
  assert.doesNotMatch(sharedTs, /chromeDefaults|chromeCopy/);
  assert.doesNotMatch(sharedTs, /Tools JCEM/);
  assert.doesNotMatch(sharedTs, /author:\s*"JCEM"/);
  assert.match(sharedTs, /target="_blank"/);
  assert.match(sharedTs, /rel="\$\{escapeHtml\(rel\)\}"/);
  assert.match(sharedTs, /jcem-footer-legal/);
  assert.match(compile, /mangleProps:\s*\/\^__p\\d\+\$\/,/);
  assert.match(validate, /protectedChromeTerms/);
  assert.match(validate, /assertNoSourceMapReference/);
  assert.match(validate, /assertNoProtectedChromeText/);
  assert.match(sharedCss, /\.jcem-chrome-footer\s*{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s);
});
