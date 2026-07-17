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

async function collectAllFiles(dir = "src"): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectAllFiles(full));
    else if (entry.isFile()) files.push(full);
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
    if (normalized === "src/index.html") {
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
  const css = await readFile("src/assets/css/documentos.scss", "utf8");

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
  const faturamentoCss = await readFile("src/faturamento/faturamento.scss", "utf8");
  const sharedCss = await readFile("src/assets/css/documentos.scss", "utf8");

  assert.match(sharedTs, /renderPrintableLayout/);
  assert.match(sharedTs, /jcem-document-workspace/);
  assert.match(sharedCss, /body\.jcem-printable-layout\s*{[^}]*min-height:\s*100vh;/s);
  assert.match(sharedCss, /body\.jcem-printable-layout\s*{[^}]*margin:\s*0;/s);
  assert.match(sharedCss, /body\.jcem-printable-layout\s*{[^}]*overflow-x:\s*clip[^}]*overflow-y:\s*visible;/s);
  assert.match(sharedCss, /html\s*{[^}]*overflow-x:\s*clip;/s);
  assert.doesNotMatch(sharedCss, /body\.jcem-printable-layout\s*{[^}]*overflow:\s*hidden;/s);
  assert.match(sharedCss, /\.jcem-document-workspace\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
  assert.match(sharedCss, /\.jcem-document-workspace\s*{[^}]*overflow:\s*clip;/s);
  assert.match(sharedCss, /@media\s*\(min-width:\s*1120px\)\s*{[^}]*\.jcem-document-workspace\s*{[^}]*grid-template-columns:/s);
  assert.match(sharedCss, /\.jcem-document-workspace\.jcem-document-workspace--document-only\s*{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(sharedCss, /\.jcem-document-preview-region\s*{[^}]*padding:\s*1rem;/s);
  assert.match(sharedCss, /\.jcem-document-preview-region\s*{[^}]*contain:\s*inline-size layout paint;/s);
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
  const sharedCss = await readFile("src/assets/css/documentos.scss", "utf8");
  const faturamentoTs = await readFile("src/faturamento/faturamento.ts", "utf8");
  const admissionalTs = await readFile("src/oficios/admissional/admissional.ts", "utf8");

  assert.ok(pkg.devDependencies["@fortawesome/free-solid-svg-icons"]);
  assert.ok(pkg.devDependencies["@floating-ui/dom"]);
  assert.equal(pkg.devDependencies["@fortawesome/fontawesome-free"], undefined);
  assert.equal(pkg.devDependencies["@fortawesome/fontawesome-svg-core"], undefined);
  assert.match(sharedTs, /renderIcon/);
  assert.match(sharedTs, /<span>Local e <\/span><strong>automático<\/strong>/);
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
  assert.match(sharedCss, /--jcem-toolbar-icon-color:\s*#425b70/);
  assert.match(sharedCss, /\.jcem-chrome-actions\.menu \.jcem-fa-icon\s*{[^}]*var\(--jcem-toolbar-icon-color\)/s);
  assert.match(sharedTs, /unicode:\s*"f0c7"[^\n]*id:\s*"export-fill"/);
  assert.match(sharedTs, /unicode:\s*"f07c"[^\n]*id:\s*"import-fill"/);
  assert.match(sharedTs, /icons:\s*\[\{ unicode:\s*"f49e" \},\s*\{ unicode:\s*"f358" \}\]/);
  assert.match(sharedTs, /separator-print-clear/);
  assert.match(sharedTs, /item\.icons/);
  assert.match(sharedTs, /renderIcon\(\{ unicode: "f042" \}\)/);
  assert.match(sharedCss, /\.jcem-theme-toggle \.jcem-fa-icon\s*{[^}]*width:\s*1\.65rem[^}]*height:\s*1\.65rem/s);
  assert.match(sharedCss, /\.jcem-author-badge:hover[\s\S]*transform:\s*translateY\(-0\.08rem\)/);
  assert.match(sharedCss, /\.jcem-theme-toggle\s*{[^}]*place-items:\s*center[^}]*padding:\s*0/s);
  assert.match(sharedCss, /\[data-jcem-toolbar-id="bundle"\] \.jcem-fa-icon:first-child\s*{[^}]*width:\s*1\.8rem[^}]*opacity:\s*1/s);
  assert.match(sharedCss, /\[data-jcem-toolbar-id="bundle"\] \.jcem-fa-icon:nth-child\(2\)\s*{[^}]*opacity:\s*0\.68[^}]*scale\(0\.82\)/s);
  assert.match(sharedCss, /@keyframes jcem-autosave-breathe/);
  assert.match(sharedCss, /animation:\s*jcem-autosave-breathe 1\.2s cubic-bezier\(\.4, 0, \.2, 1\) infinite/);
  assert.match(sharedCss, /\.jcem-license-badge\s*{[^}]*font-size:\s*0\.68rem/s);
  assert.doesNotMatch(sharedTs, /setTimeout\(\(\) => tick/);
  assert.match(sharedCss, /\[data-jcem-toolbar-id="bundle"\] \.jcem-fa-icon\s*{[^}]*height:\s*2rem/s);
  assert.match(faturamentoTs, /actions:\s*{/);
  assert.match(admissionalTs, /actions:\s*{/);
  assert.doesNotMatch(faturamentoTs, /api\.toolbar\.bind|api\.share\.bindToolbar/);
  assert.doesNotMatch(admissionalTs, /api\.toolbar\.bind|api\.share\.bindToolbar/);
  assert.doesNotMatch(sharedCss, /\\27A6|\\1F5B6|\\1F5BC|\\232B|\\21E9/);
});

test("institutional chrome protects author, license and legal notices", async () => {
  const sharedTs = await readFile("src/assets/js/documentos.ts", "utf8");
  const guardTs = await readFile("src/assets/js/guard.ts", "utf8");
  const sharedCss = await readFile("src/assets/css/documentos.scss", "utf8");
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
  assert.match(sharedCss, /\.jcem-chrome-footer\s*{[^}]*padding:\s*2rem 1rem 2\.25rem;/s);
});

test("dashboard catalog, themes and consent remain centralized", async () => {
  const catalog = JSON.parse(await readFile("src/assets/config/apps.json", "utf8"));
  const consent = JSON.parse(await readFile("src/assets/config/consent.json", "utf8"));
  const dashboard = await readFile("src/index.html", "utf8");
  const shared = await readFile("src/assets/js/documentos.ts", "utf8");
  assert.equal(catalog.defaultApp, null);
  assert.equal(catalog.apps.length, 3);
  assert.equal(consent.cdnVersion, "2.0.0");
  assert.match(dashboard, /data-app-grid/);
  assert.match(dashboard, /data-dashboard-theme/);
  assert.ok(catalog.apps.every((app: { logo?: string }) => app.logo?.endsWith("/logo.svg")));
  assert.ok(catalog.apps.every((app: { offlineLogo?: string }) => app.offlineLogo?.startsWith("data:image/svg+xml;base64,")));
  assert.match(catalog.workspaceOfflineLogo, /^data:image\/svg\+xml;base64,/);
  assert.match(shared, /jcem-theme/);
  assert.match(shared, /assets\/config\/apps\.json/);
  assert.match(shared, /jcem-app-shell-content/);
  assert.match(shared, /jcem-nav-state/);
  const sharedCss = await readFile("src/assets/css/documentos.scss", "utf8");
  assert.match(sharedCss, /\.jcem-app-shell\s*{[^}]*grid-template-columns:\s*3\.5rem minmax\(0, 1fr\)/s);
  assert.match(sharedCss, /\.jcem-app-shell::before\s*{[^}]*inset:\s*0 auto 0 0[^}]*background:\s*#d6e0e7/s);
  assert.match(sharedCss, /\.jcem-app-nav\s*{[^}]*position:\s*sticky[^}]*height:\s*max-content/s);
  assert.match(sharedCss, /\.jcem-app-nav::before\s*{[^}]*height:\s*100vh[^}]*background:\s*transparent/s);
  assert.match(sharedCss, /:root\[data-theme="dark"\] \.jcem-app-shell::before\s*{[^}]*background:\s*#25272a/s);
  assert.match(sharedCss, /\.jcem-nav-state:checked\s*~\s*\.jcem-app-shell \.jcem-app-nav/);
  assert.match(shared, /renderIcon\(\{ unicode: "f0c9" \}\)/);
  assert.match(sharedCss, /\.jcem-app-nav::before\s*{[^}]*transition:\s*width \.18s ease/s);
  assert.match(sharedCss, /body\.jcem-has-app-nav:not\(\.imprimir\) \.jcem-chrome-header\s*{[^}]*animation-timeline:\s*scroll\(root block\)[^}]*animation-range:\s*0 7rem/s);
  assert.match(sharedCss, /@keyframes jcem-header-nav-clearance\s*{[^}]*padding-left:\s*1rem[\s\S]*padding-left:\s*4\.5rem/s);
  assert.match(sharedCss, /@keyframes jcem-toolbar-nav-clearance\s*{[^}]*margin-right:\s*-1rem[\s\S]*margin-right:\s*-4\.5rem/s);
  assert.match(sharedCss, /:root\[data-theme="light"\] \.jcem-nav-toggle\s*{[^}]*color:\s*#29465b/s);
  assert.match(sharedCss, /:root\[data-theme="light"\] \.jcem-theme-toggle\s*{[^}]*color:\s*#526a7a/s);
  assert.match(sharedCss, /\.jcem-dashboard-footer p\s*{[^}]*color:\s*inherit/s);
  assert.match(sharedCss, /:root\[data-theme="dark"\] \.jcem-dashboard-footer p\s*{[^}]*color:\s*#b6bac0/s);
  assert.match(sharedCss, /\.jcem-nav-state:checked\s*~\s*\.jcem-app-shell \.jcem-app-nav::before\s*{[^}]*width:\s*min\(18rem/s);
  assert.doesNotMatch(shared, /addEventListener\("(?:resize|scroll)"|ResizeObserver/);
  assert.match(sharedCss, /:root\[data-theme="dark"\] \.jcem-chrome-actions\.menu > \*/);
  assert.match(sharedCss, /body\.jcem-has-app-nav:not\(\.imprimir\)\s*{\s*background:\s*#18191b/);
  assert.match(sharedCss, /\.jcem-license-badge/);
  assert.match(sharedCss, /\.jcem-app-nav a > span:last-child\s*{[^}]*visibility:\s*hidden/s);
  assert.match(sharedCss, /\.jcem-app-nav img\s*{[^}]*justify-self:\s*center/s);
  assert.match(sharedCss, /:root\[data-theme="dark"\] \.jcem-document-form-region fieldset\s*{[^}]*background:\s*#292b2f/s);
});

test("CSV module preserves readable local surfaces in both themes", async () => {
  const css = await readFile("src/csv-bd/bd.scss", "utf8");
  const html = await readFile("src/csv-bd/index.html", "utf8");
  const ts = await readFile("src/csv-bd/bd.ts", "utf8");
  const shared = await readFile("src/assets/js/documentos.ts", "utf8");

  assert.match(css, /:root\[data-theme="dark"\]\s*{[^}]*--panel:\s*#292c30[^}]*--ink:\s*#eef0f2/s);
  assert.match(css, /:root\[data-theme="dark"\] \.bd-app input,[\s\S]*background:\s*#35383d[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /:root\[data-theme="dark"\] \.bd-app \.summary-grid div\s*{[^}]*background:\s*#32353a/s);
  assert.match(css, /:root\[data-theme="dark"\] \.bd-app \.decisions\s*{[^}]*background:\s*#3a3525/s);
  assert.match(html, /class="ico csv-open"/);
  assert.match(html, /<div data-jcem-actions hidden>[\s\S]*<input id="csv-file" type="file"/);
  assert.doesNotMatch(html, /<label for="csv-file">/);
  assert.match(html, /class="ico csv-download"/);
  assert.match(html, /class="ico clear"/);
  assert.match(ts, /"csv-open":\s*\(\)\s*=>\s*input\("#csv-file"\)\.click\(\)/);
  assert.match(ts, /"csv-download":\s*downloadCsv/);
  assert.match(ts, /chrome\.render\(\{[^}]*autosave:\s*false/s);
  assert.match(shared, /selector:\s*"\.csv-open"/);
  assert.match(shared, /selector:\s*"\.csv-download"/);
  assert.match(shared, /options\.autosave === false \? ""/);
});

test("all published applications have SVG identity and SCSS sources", async () => {
  for (const directory of ["csv-bd", "faturamento", "oficios/admissional"]) {
    assert.match(await readFile(`src/${directory}/logo.svg`, "utf8"), /<svg/);
  }
  const files = await collectAllFiles("src");
  assert.equal(files.some((file) => file.endsWith(".css")), false);
  assert.equal(files.filter((file) => file.endsWith(".scss")).length, 4);
});

test("dev-live builds before serving and keeps Web plus bundles synchronized", async () => {
  const live = await readFile("scripts/dev-live.mjs", "utf8");
  assert.match(live, /await runBuild\(\);[\s\S]*server\.listen/);
  assert.match(live, /watchFs\(srcRoot/);
  assert.match(live, /scripts\/compile\.mjs/);
  assert.match(live, /scripts\/build-bundles\.mjs/);
  assert.match(live, /buildQueued/);
  assert.match(live, /EADDRINUSE/);
  assert.match(live, /<\\\/body>\\s\*<\\\/html>\\s\*\$/i);
});

test("offline bundles embed the app catalog as metadata with absolute upstream routes", async () => {
  const bundleEntry = await readFile("scripts/build-bundles.mjs", "utf8");
  const bundleCore = await readFile("scripts/build-bundles-core.mjs", "utf8");
  const bundles = `${bundleEntry}\n${bundleCore}`;
  const shared = await readFile("src/assets/js/documentos.ts", "utf8");
  assert.match(bundles, /jcem-app-catalog/);
  assert.match(bundles, /charCodeAt\(0\)/);
  assert.match(bundles, /replace\(\/<head\\b\[\^>\]\*>\/i/);
  assert.match(bundles, /replace\(\/<script\/gi, "<\\\\x73cript"\)/);
  assert.match(shared, /__JCEM_APP_CATALOG__/);
  assert.match(shared, /meta\[name="jcem-app-catalog"\]/);
  assert.match(shared, /offlineLogo/);
  assert.match(bundleEntry, /https:\/\/jcem\.pro\/logo\/64-yellow\.png/);
  assert.match(bundleEntry, /const authorLogo\s*=\s*await authorLogoDataUrl/);
  assert.match(bundleEntry, /catalog\.authorLogo\s*=\s*authorLogo/);
  assert.match(bundleEntry, /originalSharedScript\.replaceAll\(authorLogoUrl, authorLogo\)/);
  assert.match(shared, /authorLogo\?\.startsWith\("data:image\/png;base64,"\)/);
  assert.match(shared, /authorImage\.src\s*=\s*"https:\/\/jcem\.pro\/logo\/64-yellow\.png"/);
});
