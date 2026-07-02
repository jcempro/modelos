import * as esbuild from "esbuild";

const htmlBlockPattern = /<script\b(?![^>]*\bsrc\s*=)[\s\S]*?<\/script>|<(style|pre|textarea)\b[\s\S]*?<\/\1>/gi;

export async function minifyCssText(css, sourcefile = "inline.css") {
  const result = await esbuild.transform(css, {
    loader: "css",
    legalComments: "none",
    minify: true,
    sourcefile
  });
  return result.code.trim();
}

export async function minifyJsText(js, sourcefile = "inline.js") {
  const result = await esbuild.transform(js, {
    format: "iife",
    legalComments: "none",
    loader: "js",
    minify: true,
    sourcefile,
    target: "es2020"
  });
  return result.code.trim();
}

export async function optimizeTextByPath(rel, text) {
  const normalized = rel.replace(/\\/g, "/").toLowerCase();

  if (normalized.endsWith(".css")) {
    return `${await minifyCssText(text, rel)}\n`;
  }

  if (normalized.endsWith(".js") && !normalized.includes("/favoritos/")) {
    return `${await minifyJsText(text, rel)}\n`;
  }

  if (normalized.endsWith(".json")) {
    return `${JSON.stringify(JSON.parse(text))}\n`;
  }

  if (normalized.endsWith(".html")) {
    return `${minifyHtmlText(text)}\n`;
  }

  return text;
}

export function minifyHtmlText(html) {
  const blocks = [];
  const markerPrefix = "___JCEM_HTML_BLOCK_";
  let compact = html.replace(htmlBlockPattern, (block) => {
    const marker = `${markerPrefix}${blocks.length}___`;
    blocks.push(block);
    return marker;
  });

  compact = compact
    .replace(/<!--(?!\[if\b)[\s\S]*?-->/gi, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\s+\/>/g, "/>")
    .trim();

  return compact.replace(new RegExp(`${markerPrefix}(\\d+)___`, "g"), (_match, index) => blocks[Number(index)] ?? "");
}
