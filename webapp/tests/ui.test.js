import { beforeAll, beforeEach, describe, expect, test } from "vitest";

let ui;
let root;

beforeAll(async () => {
  await import("../js/models.js");
  await import("../js/dateInput.js");
  await import("../js/invoiceBuilder.js");
  await import("../js/storage.js");
  await import("../js/ui.js");
  ui = globalThis.SLV.ui;
});

function memoryStore(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

function mount(store = memoryStore()) {
  root = document.createElement("div");
  document.body.appendChild(root);
  return ui.mount(root, { store });
}

function typeInto(input, value) {
  input.value = value;
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("formatMoney", () => {
  test("renders two decimals with thousand separators", () => {
    expect(ui.formatMoney(1234.5)).toBe("$1,234.50");
    expect(ui.formatMoney(0)).toBe("$0.00");
  });
});

describe("formatHours", () => {
  test("drops the decimals of a whole number", () => {
    expect(ui.formatHours(5)).toBe("5");
    expect(ui.formatHours(5.5)).toBe("5.5");
    expect(ui.formatHours(0)).toBe("0");
  });
});

describe("mount", () => {
  test("starts with a single empty item row", () => {
    const app = mount();
    expect(root.querySelectorAll("[data-item-row]")).toHaveLength(1);
    expect(app.getForm().items).toHaveLength(1);
  });

  test("prefills the From party with the SLV details", () => {
    const app = mount();
    const form = app.getForm();
    expect(form.fromName).toBe("SLV Cleaning Services");
    expect(form.fromPhone).toBe("508-901-1384");
    expect(form.fromAddress).toBe("69, Cato lane");
  });

  test("reads the next invoice number out of storage", () => {
    const app = mount(memoryStore({ slv_invoice_next_no: "7" }));
    expect(app.getForm().invoiceNo).toBe("7");
  });

  test("adds and removes item rows", () => {
    const app = mount();

    root.querySelector("[data-add-item]").click();
    expect(root.querySelectorAll("[data-item-row]")).toHaveLength(2);

    root.querySelectorAll("[data-remove-item]")[1].click();
    expect(root.querySelectorAll("[data-item-row]")).toHaveLength(1);
  });

  test("keeps the last item row when remove is clicked", () => {
    mount();
    root.querySelector("[data-remove-item]").click();
    expect(root.querySelectorAll("[data-item-row]")).toHaveLength(1);
  });

  test("recalculates the live total as hours are typed", () => {
    mount();

    typeInto(root.querySelector("[data-field=hourlyRate]"), "35");
    typeInto(root.querySelector("[data-field=hours]"), "4");

    expect(root.querySelector("[data-total]").textContent).toBe("Total: $140.00");
    expect(root.querySelector("[data-total-hours]").textContent).toBe("Total hours: 4");
  });

  test("treats an unparseable hourly rate as zero in the live total", () => {
    mount();

    typeInto(root.querySelector("[data-field=hourlyRate]"), "abc");
    typeInto(root.querySelector("[data-field=hours]"), "4");

    expect(root.querySelector("[data-total]").textContent).toBe("Total: $0.00");
    expect(root.querySelector("[data-total-hours]").textContent).toBe("Total hours: 4");
  });

  test("auto-formats a date field as dd/mm/yyyy while typing", () => {
    mount();
    const field = root.querySelector("[data-field=dateFrom]");

    typeInto(field, "01042026");

    expect(field.value).toBe("01/04/2026");
  });

  test("collects the whole form, items included", () => {
    const app = mount();

    typeInto(root.querySelector("[data-field=billToName]"), "Kristin Paton");
    typeInto(root.querySelector("[data-field=hourlyRate]"), "35");
    typeInto(root.querySelector("[data-field=date]"), "01042026");
    typeInto(root.querySelector("[data-field=client]"), "11 pleasant");
    typeInto(root.querySelector("[data-field=hours]"), "4");

    expect(app.getForm()).toMatchObject({
      billToName: "Kristin Paton",
      hourlyRate: "35",
      items: [{ date: "01/04/2026", client: "11 pleasant", hours: "4" }],
    });
  });
});

describe("showErrors", () => {
  test("lists every message in the banner", () => {
    const app = mount();

    app.showErrors(["Enter the client's name.", "Add at least one item."]);

    const banner = root.querySelector("[data-errors]");
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toContain("Enter the client's name.");
    expect(banner.textContent).toContain("Add at least one item.");
  });

  test("hides the banner again when there is nothing to report", () => {
    const app = mount();

    app.showErrors(["Add at least one item."]);
    app.showErrors([]);

    expect(root.querySelector("[data-errors]").hidden).toBe(true);
  });
});

describe("registerExport", () => {
  test("continues from the number the user actually exported", () => {
    const store = memoryStore({ slv_invoice_next_no: "3" });
    const app = mount(store);

    app.registerExport("22");

    expect(store.getItem("slv_invoice_next_no")).toBe("23");
    expect(root.querySelector("[data-field=invoiceNo]").value).toBe("23");
  });

  test("falls back to advancing the stored sequence for a non-numeric number", () => {
    const store = memoryStore({ slv_invoice_next_no: "3" });
    const app = mount(store);

    app.registerExport("2026-A");

    expect(store.getItem("slv_invoice_next_no")).toBe("4");
    expect(root.querySelector("[data-field=invoiceNo]").value).toBe("4");
  });
});
