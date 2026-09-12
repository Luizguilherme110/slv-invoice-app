// Dev helper: renders a sample invoice to out/ so the layout can be eyeballed
// against the PDFs the desktop app produced. Not shipped to the client.
import { JSDOM } from "jsdom";
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const index = resolve(root, "index.html");

const dom = new JSDOM(readFileSync(index, "utf8"), {
  url: pathToFileURL(index).href,
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
});
await new Promise((done) => dom.window.addEventListener("load", done));

const { SLV } = dom.window;
const { InvoiceData, LineItem } = SLV.models;

const invoice = new InvoiceData({
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
    new LineItem({ date: "03/04/2026", client: "Sharon - 2nd floor", hours: 2.5 }),
  ],
});

const out = resolve(root, "out");
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, "sample-invoice.pdf"), SLV.pdfGenerator.generatePdf(invoice));
writeFileSync(resolve(out, "sample-invoice.xlsx"), await SLV.excelGenerator.generateExcel(invoice));
console.log("wrote out/sample-invoice.pdf and out/sample-invoice.xlsx");
dom.window.close();
