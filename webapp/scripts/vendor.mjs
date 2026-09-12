// Copies the pinned library bundles out of node_modules into vendor/ so the app
// runs from file:// with no CDN and no network. Re-run after changing versions.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const BUNDLES = [
  ["node_modules/jspdf/dist/jspdf.umd.min.js", "vendor/jspdf.umd.min.js"],
  [
    "node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js",
    "vendor/jspdf.plugin.autotable.min.js",
  ],
  ["node_modules/exceljs/dist/exceljs.min.js", "vendor/exceljs.min.js"],
];

mkdirSync(resolve(root, "vendor"), { recursive: true });
for (const [from, to] of BUNDLES) {
  copyFileSync(resolve(root, from), resolve(root, to));
  console.log(`${from} -> ${to}`);
}
