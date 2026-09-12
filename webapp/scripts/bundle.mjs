// Builds dist/SLV-Invoice.html: one self-contained file with the stylesheet, the
// three vendored libraries, every app module and both images inlined. That single
// file is what the client receives - she saves it anywhere and double-clicks it.
// Run: npm run bundle
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(resolve(root, relativePath), "utf8");

/** Keeps a literal </script> inside a library from closing the tag early. */
const escapeScript = (source) => source.replace(/<\/script/gi, "<\\/script");
const escapeStyle = (source) => source.replace(/<\/style/gi, "<\\/style");

export async function bundle() {
  let html = read("index.html");

  // Strip the HTML comments first: the inlined sources below may contain "<!--"
  // inside string literals, which this would otherwise chew through.
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  html = html.replace(
    /<link rel="stylesheet" href="([^"]+)"\s*\/?>/,
    (_match, href) => `<style>\n${escapeStyle(read(href))}</style>`
  );

  // The 256px logo the generators already embed serves the page header and both
  // icon links too, so the bundle carries one copy of it and no full-resolution
  // assets/logo.png at all.
  const logo = read("js/logoData.js").match(/"(data:image\/png;base64,[^"]+)"/)[1];
  html = html.replace(/src="assets\/logo\.png"/, `src="${logo}"`);
  html = html.replace(/href="assets\/icon\.png"/g, `href="${logo}"`);

  html = html.replace(
    /<script src="([^"]+)"><\/script>/g,
    (_match, src) => `<script>\n${escapeScript(read(src))}</script>`
  );

  // Collapse the blank lines the removed comments left behind.
  return html.replace(/\n{3,}/g, "\n\n");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const html = await bundle();
  const out = resolve(root, "dist");
  mkdirSync(out, { recursive: true });
  const file = resolve(out, "SLV-Invoice.html");
  writeFileSync(file, html, "utf8");
  console.log(`dist/SLV-Invoice.html written - ${(html.length / 1024 / 1024).toFixed(2)} MB`);
}
