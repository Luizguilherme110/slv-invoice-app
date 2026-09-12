(function () {
  const SLV = (globalThis.SLV = globalThis.SLV || {});
  const { validate, buildInvoiceData, suggestedFilename } = SLV.invoiceBuilder;

  const MIME_TYPES = {
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  /** Hands the bytes to the browser's own download, which lands in Downloads. */
  function downloadBytes(bytes, filename, mimeType) {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Give Chrome a moment to start the download before the blob is released.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  const defaultGenerator = (format) =>
    format === "pdf" ? SLV.pdfGenerator.generatePdf : SLV.excelGenerator.generateExcel;

  async function exportInvoice(controller, format, options = {}) {
    const generate = options.generate || defaultGenerator(format);
    const download = options.download || downloadBytes;

    const form = controller.getForm();
    const errors = validate(form);
    if (errors.length > 0) {
      controller.showErrors(errors);
      return false;
    }
    controller.showErrors([]);

    const invoice = buildInvoiceData(form);

    let bytes;
    try {
      bytes = await generate(invoice);
    } catch (error) {
      controller.showErrors([`Error generating file: ${error.message}`]);
      return false;
    }

    download(
      bytes,
      suggestedFilename(invoice.invoiceNo, invoice.billToName, format),
      MIME_TYPES[format]
    );

    controller.registerExport(invoice.invoiceNo);
    return true;
  }

  function start(root) {
    const controller = SLV.ui.mount(root);
    root.querySelectorAll("[data-export]").forEach((button) => {
      button.addEventListener("click", () => {
        exportInvoice(controller, button.getAttribute("data-export"));
      });
    });
    // Kept on the namespace so the page can be driven from the console (and from
    // the page-level test) without re-mounting the form.
    SLV.app.controller = controller;
    return controller;
  }

  SLV.app = { start, exportInvoice, downloadBytes, controller: null };

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      const root = document.getElementById("app");
      if (root) start(root);
    });
  }
})();
