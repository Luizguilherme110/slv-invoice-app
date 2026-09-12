import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

let app;
let ui;
let root;
let downloads;

beforeAll(async () => {
  await import("../js/models.js");
  await import("../js/dateInput.js");
  await import("../js/invoiceBuilder.js");
  await import("../js/storage.js");
  await import("../js/ui.js");
  await import("../js/app.js");
  ui = globalThis.SLV.ui;
  app = globalThis.SLV.app;
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

function typeInto(input, value) {
  input.value = value;
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function mountWithValidForm(store = memoryStore({ slv_invoice_next_no: "3" })) {
  root = document.createElement("div");
  document.body.appendChild(root);
  const controller = ui.mount(root, { store });

  typeInto(root.querySelector("[data-field=billToName]"), "Kristin Paton");
  typeInto(root.querySelector("[data-field=hourlyRate]"), "35");
  typeInto(root.querySelector("[data-field=client]"), "11 pleasant");
  typeInto(root.querySelector("[data-field=hours]"), "4");

  return { controller, store };
}

beforeEach(() => {
  document.body.innerHTML = "";
  downloads = [];
});

const download = (bytes, filename, mimeType) =>
  downloads.push({ bytes, filename, mimeType });

describe("exportInvoice", () => {
  test("downloads a PDF named after the invoice and the client", async () => {
    const { controller } = mountWithValidForm();
    const generate = vi.fn(() => new Uint8Array([1, 2, 3]));

    await app.exportInvoice(controller, "pdf", { generate, download });

    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toBe("Invoice_3_Kristin_Paton.pdf");
    expect(downloads[0].mimeType).toBe("application/pdf");
    expect(generate).toHaveBeenCalledOnce();
  });

  test("hands the generator the built invoice, not the raw form", async () => {
    const { controller } = mountWithValidForm();
    const generate = vi.fn(() => new Uint8Array([1]));

    await app.exportInvoice(controller, "pdf", { generate, download });

    const invoice = generate.mock.calls[0][0];
    expect(invoice.billToName).toBe("Kristin Paton");
    expect(invoice.total).toBe(140);
    expect(invoice.items).toHaveLength(1);
  });

  test("awaits an async generator, as the Excel one is", async () => {
    const { controller } = mountWithValidForm();
    const generate = async () => new Uint8Array([1, 2]);

    await app.exportInvoice(controller, "xlsx", { generate, download });

    expect(downloads[0].filename).toBe("Invoice_3_Kristin_Paton.xlsx");
    expect(downloads[0].mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  test("advances the invoice number after a successful export", async () => {
    const { controller, store } = mountWithValidForm();

    await app.exportInvoice(controller, "pdf", {
      generate: () => new Uint8Array([1]),
      download,
    });

    expect(store.getItem("slv_invoice_next_no")).toBe("4");
    expect(root.querySelector("[data-field=invoiceNo]").value).toBe("4");
  });

  test("shows the validation errors and generates nothing when the form is invalid", async () => {
    root = document.createElement("div");
    document.body.appendChild(root);
    const controller = ui.mount(root, { store: memoryStore() });
    const generate = vi.fn();

    await app.exportInvoice(controller, "pdf", { generate, download });

    expect(generate).not.toHaveBeenCalled();
    expect(downloads).toHaveLength(0);
    const banner = root.querySelector("[data-errors]");
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toContain("Enter the client's name.");
  });

  test("clears an earlier error banner once the form is valid", async () => {
    const { controller } = mountWithValidForm();
    controller.showErrors(["Add at least one item."]);

    await app.exportInvoice(controller, "pdf", {
      generate: () => new Uint8Array([1]),
      download,
    });

    expect(root.querySelector("[data-errors]").hidden).toBe(true);
  });

  test("reports a generator failure in the banner instead of throwing", async () => {
    const { controller, store } = mountWithValidForm();
    const generate = () => {
      throw new Error("jsPDF exploded");
    };

    await app.exportInvoice(controller, "pdf", { generate, download });

    expect(root.querySelector("[data-errors]").textContent).toContain("jsPDF exploded");
    expect(downloads).toHaveLength(0);
    // A failed export must not burn an invoice number.
    expect(store.getItem("slv_invoice_next_no")).toBe("3");
  });
});
