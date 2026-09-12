import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { JSDOM } from "jsdom";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// End-to-end check of what Chrome actually does with index.html on a file:// URL:
// the vendor UMD bundles, the plain (non-module) script tags and their load order.
// The other suites exercise the modules directly; this one proves the page wires
// itself together at all.
const INDEX = resolve(import.meta.dirname, "../index.html");

let dom;
let window;

beforeAll(async () => {
  dom = new JSDOM(readFileSync(INDEX, "utf8"), {
    url: pathToFileURL(INDEX).href,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });
  window = dom.window;
  await new Promise((done) => {
    if (window.document.readyState === "complete") done();
    else window.addEventListener("load", done);
  });
}, 60000);

afterAll(() => dom && dom.window.close());

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

describe("index.html", () => {
  test("loads the vendored libraries onto the page", () => {
    expect(typeof window.jspdf.jsPDF).toBe("function");
    expect(typeof window.autoTable).toBe("function");
    expect(typeof window.ExcelJS.Workbook).toBe("function");
  });

  test("loads every app module onto the SLV namespace", () => {
    const SLV = window.SLV;
    expect(Object.keys(SLV).sort()).toEqual(
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

  test("renders the form with one item row and a live total", () => {
    const { document } = window;
    expect(document.querySelectorAll("[data-item-row]")).toHaveLength(1);
    expect(document.querySelector("[data-total]").textContent).toBe("Total: $0.00");
  });

  test("recalculates the total from the rendered form", () => {
    fillValidForm();
    expect(window.document.querySelector("[data-total]").textContent).toBe("Total: $140.00");
  });

  test("exports a real PDF through the vendored jsPDF", async () => {
    fillValidForm();
    const downloads = [];

    await window.SLV.app.exportInvoice(window.SLV.app.controller, "pdf", {
      download: (bytes, filename) => downloads.push({ bytes, filename }),
    });

    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toBe("Invoice_1_Kristin_Paton.pdf");
    expect(Buffer.from(downloads[0].bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  test("exports a real xlsx through the vendored ExcelJS", async () => {
    fillValidForm();
    const downloads = [];

    await window.SLV.app.exportInvoice(window.SLV.app.controller, "xlsx", {
      download: (bytes, filename) => downloads.push({ bytes, filename }),
    });

    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toMatch(/^Invoice_\d+_Kristin_Paton\.xlsx$/);
    expect(downloads[0].bytes[0]).toBe(0x50);
    expect(downloads[0].bytes[1]).toBe(0x4b);
  });
});
