import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { JSDOM } from "jsdom";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { bundle } from "../scripts/bundle.mjs";

// The single-file build is what the client actually receives. It is written into
// an otherwise empty directory here: anything it still expects to find next to
// itself would simply be missing, so the page could not work.
let html;
let dir;
let dom;
let window;

beforeAll(async () => {
  html = await bundle();
  dir = mkdtempSync(join(tmpdir(), "slv-bundle-"));
  const file = join(dir, "SLV-Invoice.html");
  writeFileSync(file, html, "utf8");

  dom = new JSDOM(html, {
    url: pathToFileURL(file).href,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });
  window = dom.window;
  await new Promise((done) => {
    if (window.document.readyState === "complete") done();
    else window.addEventListener("load", done);
  });
}, 120000);

afterAll(() => {
  if (dom) dom.window.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

function typeInto(input, value) {
  input.value = value;
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function fillValidForm() {
  const { document } = window;
  typeInto(document.querySelector("[data-field=billToName]"), "Kristin Paton");
  typeInto(document.querySelector("[data-field=hourlyRate]"), "35");
  typeInto(document.querySelector("[data-field=client]"), "11 pleasant");
  typeInto(document.querySelector("[data-field=hours]"), "4");
}

describe("bundle", () => {
  test("references no sibling file at all", () => {
    expect(html).not.toMatch(/src="(?!data:)[^"]+"/);
    expect(html).not.toMatch(/href="(?!data:)[^"]+"/);
  });

  test("neutralises any closing script tag inside the inlined libraries", () => {
    // A literal </script> inside a library's source would end its block early and
    // spill the rest of the bundle into the page as text. Only a closer does that
    // - a literal "<script>" in a string is inert - so every </script> left in the
    // file must be one this bundler wrote.
    const closers = html.match(/<\/script/g) || [];
    expect(closers).toHaveLength(window.document.querySelectorAll("script").length);
  });

  test("carries the logo as a data URI", () => {
    expect(html).toContain("data:image/png;base64,");
  });

  test("uses the SLV logo as the favicon, which is what Chrome puts on the shortcut", () => {
    const icon = window.document.querySelector("link[rel=icon]");
    expect(icon.getAttribute("type")).toBe("image/png");
    expect(icon.getAttribute("href")).toMatch(/^data:image\/png;base64,/);
    expect(html).not.toContain("image/x-icon");
  });

  test("embeds the logo bytes once, shared by the header and the favicon", () => {
    const logo = readFileSync(resolve(import.meta.dirname, "../js/logoData.js"), "utf8").match(
      /"(data:image\/png;base64,[^"]+)"/
    )[1];
    expect(html.split(logo)).toHaveLength(5); // logoData.js, the header img, both icon links
  });

  test("loads the libraries and the app modules with no network and no siblings", () => {
    expect(typeof window.jspdf.jsPDF).toBe("function");
    expect(typeof window.autoTable).toBe("function");
    expect(typeof window.ExcelJS.Workbook).toBe("function");
    expect(Object.keys(window.SLV).sort()).toEqual(
      [
        "LOGO_PNG_DATA_URI",
        "app",
        "dateInput",
        "excelGenerator",
        "invoiceBuilder",
        "models",
        "pdfGenerator",
        "storage",
        "ui",
      ].sort()
    );
  });

  test("renders the styled form", () => {
    const { document } = window;
    expect(document.querySelectorAll("[data-item-row]")).toHaveLength(1);
    expect(document.querySelector("style").textContent).toContain("--navy");
    expect(document.querySelector(".topbar-logo").src).toMatch(/^data:image\/png;base64,/);
  });

  test("recalculates the live total", () => {
    fillValidForm();
    expect(window.document.querySelector("[data-total]").textContent).toBe("Total: $140.00");
  });

  test("exports a real PDF", async () => {
    fillValidForm();
    const downloads = [];

    await window.SLV.app.exportInvoice(window.SLV.app.controller, "pdf", {
      download: (bytes, filename) => downloads.push({ bytes, filename }),
    });

    expect(downloads[0].filename).toMatch(/^Invoice_\d+_Kristin_Paton\.pdf$/);
    expect(Buffer.from(downloads[0].bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  test("exports a real xlsx", async () => {
    fillValidForm();
    const downloads = [];

    await window.SLV.app.exportInvoice(window.SLV.app.controller, "xlsx", {
      download: (bytes, filename) => downloads.push({ bytes, filename }),
    });

    expect(downloads[0].filename).toMatch(/^Invoice_\d+_Kristin_Paton\.xlsx$/);
    expect(downloads[0].bytes[0]).toBe(0x50);
    expect(downloads[0].bytes[1]).toBe(0x4b);
  });
});
