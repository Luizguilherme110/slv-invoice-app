import { beforeAll, describe, expect, test } from "vitest";
import ExcelJS from "exceljs";

// In Chrome the app loads vendor/exceljs.min.js, which publishes this same build
// on window; here the npm package is put on the global instead.
globalThis.ExcelJS = ExcelJS;

let models;
let generateExcel;

beforeAll(async () => {
  await import("../js/models.js");
  await import("../js/dateInput.js");
  await import("../js/logoData.js");
  await import("../js/excelGenerator.js");
  models = globalThis.SLV.models;
  generateExcel = globalThis.SLV.excelGenerator.generateExcel;
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

async function readBack(invoice = sampleInvoice()) {
  const bytes = await generateExcel(invoice);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  return workbook.worksheets[0];
}

function findCell(sheet, value) {
  let found = null;
  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (found === null && cell.value === value) found = cell;
    });
  });
  return found;
}

describe("generateExcel", () => {
  test("produces the bytes of an xlsx file", async () => {
    const bytes = await generateExcel(sampleInvoice());

    expect(bytes).toBeInstanceOf(Uint8Array);
    // xlsx is a zip archive: "PK" magic number.
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  test("names the sheet Invoice", async () => {
    const sheet = await readBack();
    expect(sheet.name).toBe("Invoice");
  });

  test("writes the bill-to and from names", async () => {
    const sheet = await readBack();

    expect(findCell(sheet, "Kristin Paton")).not.toBeNull();
    expect(findCell(sheet, "SLV Cleaning Services")).not.toBeNull();
  });

  test("writes the item rows and the total", async () => {
    const sheet = await readBack();

    expect(findCell(sheet, "11 pleasant")).not.toBeNull();
    expect(findCell(sheet, 4)).not.toBeNull();
    expect(findCell(sheet, 175)).not.toBeNull();
  });

  test("writes the date and week as ranges", async () => {
    const sheet = await readBack();

    expect(findCell(sheet, "Week")).not.toBeNull();
    expect(findCell(sheet, "01/04/2026 - 07/04/2026")).not.toBeNull();
    expect(findCell(sheet, "08/04/2026 - 14/04/2026")).not.toBeNull();
  });

  test("writes the total hours", async () => {
    const sheet = await readBack();

    expect(findCell(sheet, "Total hours")).not.toBeNull();
    expect(findCell(sheet, 5)).not.toBeNull();
  });

  test("labels the item columns Date, Client and Amount", async () => {
    const sheet = await readBack();

    expect(findCell(sheet, "Date")).not.toBeNull();
    expect(findCell(sheet, "Client")).not.toBeNull();
    expect(findCell(sheet, "Amount")).not.toBeNull();
  });

  test("fills the label cells with SLV blue", async () => {
    const sheet = await readBack();

    const cell = findCell(sheet, "Invoice no.");
    expect(cell).not.toBeNull();
    expect(cell.fill.fgColor.argb).toBe("FF6D9EEB");
  });

  test("formats the hourly rate and the amount as currency", async () => {
    const sheet = await readBack();

    const hourlyRate = findCell(sheet, 35);
    expect(hourlyRate.numFmt).toBe('"$"#,##0.00');
    expect(findCell(sheet, 175).numFmt).toBe('"$"#,##0.00');
  });

  test("borders the value cells", async () => {
    const sheet = await readBack();

    const name = findCell(sheet, "Kristin Paton");
    expect(name.border.left.style).toBe("thin");
    expect(name.border.bottom.style).toBe("thin");
  });

  test("embeds the logo", async () => {
    const sheet = await readBack();

    expect(sheet.getImages()).toHaveLength(1);
  });
});
