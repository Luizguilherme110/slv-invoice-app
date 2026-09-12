import { describe, expect, test } from "vitest";

import "../js/models.js";
import "../js/invoiceBuilder.js";

const { validate, buildInvoiceData, suggestedFilename } = globalThis.SLV.invoiceBuilder;

function validForm() {
  return {
    fromName: "SLV Cleaning Services",
    fromPhone: "508-901-1384",
    fromAddress: "69, Cato lane",
    billToName: "Kristin Paton",
    billToPhone: "555-1234",
    billToAddress: "1 Main St",
    invoiceNo: "3",
    dateFrom: "01/04/2026",
    dateTo: "07/04/2026",
    weekFrom: "01/04/2026",
    weekTo: "07/04/2026",
    paymentMethod: "Cash",
    hourlyRate: "35",
    items: [{ date: "01/04/2026", client: "11 pleasant", hours: "4" }],
  };
}

const mentions = (errors, needle) =>
  errors.some((error) => error.toLowerCase().includes(needle));

describe("validate", () => {
  test("returns no errors for a valid form", () => {
    expect(validate(validForm())).toEqual([]);
  });

  test("requires the bill-to name", () => {
    const form = { ...validForm(), billToName: "  " };
    expect(mentions(validate(form), "client")).toBe(true);
  });

  test("requires at least one item", () => {
    const form = { ...validForm(), items: [] };
    expect(mentions(validate(form), "item")).toBe(true);
  });

  test("requires an hourly rate", () => {
    const form = { ...validForm(), hourlyRate: "" };
    expect(mentions(validate(form), "hourly rate")).toBe(true);
  });

  test("rejects a zero hourly rate", () => {
    const form = { ...validForm(), hourlyRate: "0" };
    expect(mentions(validate(form), "hourly rate")).toBe(true);
  });

  test("requires each item's client", () => {
    const form = { ...validForm(), items: [{ date: "01/04/2026", client: "", hours: "4" }] };
    expect(mentions(validate(form), "client")).toBe(true);
  });

  test("rejects zero hours", () => {
    const form = {
      ...validForm(),
      items: [{ date: "01/04/2026", client: "11 pleasant", hours: "0" }],
    };
    expect(mentions(validate(form), "amount")).toBe(true);
  });

  test("rejects non-numeric hours", () => {
    const form = {
      ...validForm(),
      items: [{ date: "01/04/2026", client: "11 pleasant", hours: "abc" }],
    };
    expect(mentions(validate(form), "amount")).toBe(true);
  });

  test("ignores blank trailing rows", () => {
    const form = validForm();
    form.items.push({ date: "", client: "", hours: "" });
    expect(validate(form)).toEqual([]);
  });

  test("numbers item errors by position among the non-blank rows", () => {
    const form = validForm();
    form.items = [
      { date: "", client: "", hours: "" },
      { date: "01/04/2026", client: "", hours: "4" },
    ];
    expect(validate(form)).toContain("Item 1: client is required.");
  });
});

describe("buildInvoiceData", () => {
  test("carries the date and week ranges", () => {
    const invoice = buildInvoiceData(validForm());
    expect(invoice.dateFrom).toBe("01/04/2026");
    expect(invoice.dateTo).toBe("07/04/2026");
    expect(invoice.weekFrom).toBe("01/04/2026");
    expect(invoice.weekTo).toBe("07/04/2026");
  });

  test("converts items and skips blank rows", () => {
    const form = validForm();
    form.items.push({ date: "", client: "", hours: "" });

    const invoice = buildInvoiceData(form);

    expect(invoice.billToName).toBe("Kristin Paton");
    expect(invoice.hourlyRate).toBe(35);
    expect(invoice.items).toHaveLength(1);
    expect(invoice.total).toBe(140);
    expect(invoice.totalHours).toBe(4);
  });

  test("trims the whitespace around item fields", () => {
    const form = validForm();
    form.items = [{ date: " 01/04/2026 ", client: " 11 pleasant ", hours: "4" }];

    const invoice = buildInvoiceData(form);

    expect(invoice.items[0].date).toBe("01/04/2026");
    expect(invoice.items[0].client).toBe("11 pleasant");
  });
});

describe("suggestedFilename", () => {
  test("sanitizes the client name", () => {
    expect(suggestedFilename("3", "Kristin/Paton?", "pdf")).toBe(
      "Invoice_3_Kristin_Paton.pdf"
    );
  });
});
