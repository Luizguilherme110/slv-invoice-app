import { describe, expect, test } from "vitest";

import "../js/models.js";

const { LineItem, InvoiceData } = globalThis.SLV.models;

function invoice(overrides = {}) {
  return new InvoiceData({
    fromName: "SLV Cleaning Services",
    fromPhone: "508-901-1384",
    fromAddress: "69, Cato lane",
    billToName: "Kristin Paton",
    billToPhone: "",
    billToAddress: "",
    invoiceNo: "1",
    dateFrom: "01/04/2026",
    dateTo: "07/04/2026",
    weekFrom: "01/04/2026",
    weekTo: "07/04/2026",
    paymentMethod: "Cash",
    hourlyRate: 35,
    items: [],
    ...overrides,
  });
}

describe("LineItem", () => {
  test("amount is hours times hourly rate", () => {
    const item = new LineItem({ date: "01/04/2026", client: "11 pleasant", hours: 3 });
    expect(item.amount(35)).toBe(105);
  });
});

describe("InvoiceData", () => {
  test("total sums all line item amounts at the invoice hourly rate", () => {
    const data = invoice({
      items: [
        new LineItem({ date: "01/04/2026", client: "11 pleasant", hours: 4 }),
        new LineItem({ date: "02/04/2026", client: "Caren", hours: 1 }),
      ],
    });
    expect(data.total).toBe(175);
  });

  test("totalHours sums hours across items", () => {
    const data = invoice({
      items: [
        new LineItem({ date: "01/04/2026", client: "11 pleasant", hours: 4 }),
        new LineItem({ date: "02/04/2026", client: "Caren", hours: 1.5 }),
      ],
    });
    expect(data.totalHours).toBe(5.5);
  });

  test("totals are zero with no items", () => {
    const data = invoice({ items: [] });
    expect(data.total).toBe(0);
    expect(data.totalHours).toBe(0);
  });

  test("keeps both ends of the date and week ranges", () => {
    const data = invoice({
      dateFrom: "01/04/2026",
      dateTo: "07/04/2026",
      weekFrom: "08/04/2026",
      weekTo: "14/04/2026",
    });
    expect(data.dateFrom).toBe("01/04/2026");
    expect(data.dateTo).toBe("07/04/2026");
    expect(data.weekFrom).toBe("08/04/2026");
    expect(data.weekTo).toBe("14/04/2026");
  });
});
