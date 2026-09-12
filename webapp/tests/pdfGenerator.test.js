import { beforeAll, describe, expect, test } from "vitest";
import { jsPDF } from "jspdf";
import { applyPlugin, autoTable } from "jspdf-autotable";

// In Chrome the app loads vendor/jspdf.umd.min.js and vendor/jspdf.plugin.autotable.min.js,
// which publish these same builds on window. Here the npm packages - the very
// files scripts/vendor.mjs copies into vendor/ - are put on the global instead.
applyPlugin(jsPDF);
globalThis.jspdf = { jsPDF };
globalThis.autoTable = autoTable;

let models;
let generatePdf;

beforeAll(async () => {
  await import("../js/models.js");
  await import("../js/dateInput.js");
  await import("../js/logoData.js");
  await import("../js/pdfGenerator.js");
  models = globalThis.SLV.models;
  generatePdf = globalThis.SLV.pdfGenerator.generatePdf;
});

function sampleInvoice() {
  const { InvoiceData, LineItem } = models;
  return new InvoiceData({
    fromName: "SLV Cleaning Services",
    fromPhone: "508-901-1384",
    fromAddress: "69, Cato lane",
    billToName: "Kristin Paton",
    billToPhone: "555-1234",
    billToAddress: "1 Main St",
    invoiceNo: "3",
    dateFrom: "01/04/2026",
    dateTo: "07/04/2026",
    weekFrom: "08/04/2026",
    weekTo: "14/04/2026",
    paymentMethod: "Cash",
    hourlyRate: 35,
    items: [
      new LineItem({ date: "01/04/2026", client: "11 pleasant", hours: 4 }),
      new LineItem({ date: "02/04/2026", client: "Caren", hours: 1 }),
    ],
  });
}

const LITERAL = /\((?:\\.|[^\\()])*\)/g;
const ESCAPE = /\\([()\\])/g;

/** Every text literal the PDF draws, in page order. */
function pdfText(bytes) {
  const raw = Buffer.from(bytes).toString("latin1");
  const literals = raw.match(LITERAL) || [];
  return literals
    .map((literal) => literal.slice(1, -1).replace(ESCAPE, "$1"))
    .join("\n");
}

describe("generatePdf", () => {
  test("produces the bytes of a single-page PDF", () => {
    const bytes = generatePdf(sampleInvoice());

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(Buffer.from(bytes).toString("latin1")).toContain("/Count 1");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  test("includes the client and item data", () => {
    const text = pdfText(generatePdf(sampleInvoice()));

    expect(text).toContain("Kristin Paton");
    expect(text).toContain("11 pleasant");
    expect(text).toContain("175.00");
  });

  test("shows the date and week ranges", () => {
    const text = pdfText(generatePdf(sampleInvoice()));

    expect(text).toContain("Week");
    expect(text).toContain("01/04/2026 - 07/04/2026");
    expect(text).toContain("08/04/2026 - 14/04/2026");
  });

  test("shows the hourly rate and the total hours", () => {
    const text = pdfText(generatePdf(sampleInvoice()));

    expect(text).toContain("35.00");
    expect(text).toContain("Total hours");
    expect(text).toContain("5");
  });

  test("labels the item columns Date, Client and Amount", () => {
    const text = pdfText(generatePdf(sampleInvoice()));

    expect(text).toContain("Date");
    expect(text).toContain("Client");
    expect(text).toContain("Amount");
  });

  test("carries both parties' details", () => {
    const text = pdfText(generatePdf(sampleInvoice()));

    expect(text).toContain("Bill to:");
    expect(text).toContain("From:");
    expect(text).toContain("SLV Cleaning Services");
    expect(text).toContain("69, Cato lane");
    expect(text).toContain("555-1234");
  });

  test("renders fractional hours compactly, like the desktop app", () => {
    const invoice = sampleInvoice();
    invoice.items = [new models.LineItem({ date: "01/04/2026", client: "Caren", hours: 1.5 })];

    const text = pdfText(generatePdf(invoice));

    expect(text).toContain("1.5");
    expect(text).not.toContain("1.50000");
  });
});
