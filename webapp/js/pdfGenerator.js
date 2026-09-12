(function () {
  const SLV = (globalThis.SLV = globalThis.SLV || {});
  const { formatRange } = SLV.dateInput;

  const INCH = 72; // jsPDF works in points here, reportlab worked in inches.
  const SLV_BLUE = [109, 158, 235]; // #6D9EEB
  const BLACK = [0, 0, 0];

  const PAGE_WIDTH = 8.5 * INCH;
  const MARGIN_X = 0.6 * INCH;
  const MARGIN_Y = 0.5 * INCH;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

  const LOGO_SIZE = 0.9 * INCH;
  const HEADER_WIDTH = 6.9 * INCH; // 1.2in logo cell + 5.7in title cell
  const TOP_WIDTH = 7.0 * INCH; // 3.6in left column + 3.4in meta column
  const PARTY_LABEL_WIDTH = 1.1 * INCH;
  const PARTY_VALUE_WIDTH = 2.2 * INCH;
  const META_COLUMN_WIDTH = 1.7 * INCH;
  const ITEM_WIDTHS = [1.5 * INCH, 3.2 * INCH, 1.5 * INCH];

  // reportlab centres a table that is narrower than the frame; mirror that so the
  // exported PDF keeps the same margins as the ones the client already receives.
  const centeredX = (tableWidth) => MARGIN_X + (CONTENT_WIDTH - tableWidth) / 2;

  const BASE_STYLES = {
    font: "helvetica",
    fontSize: 10,
    textColor: BLACK,
    lineColor: BLACK,
    lineWidth: 0.75,
    valign: "middle",
    cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
  };

  const currency = (value) =>
    `$${Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  /** Matches Python's "%g": 5 renders as "5", 5.5 as "5.5". */
  const compactNumber = (value) => String(Number(Number(value).toPrecision(6)));

  function requireLibraries() {
    const jsPDFConstructor = globalThis.jspdf && globalThis.jspdf.jsPDF;
    const autoTable =
      globalThis.autoTable || (globalThis.jspdf && globalThis.jspdf.autoTable);
    if (!jsPDFConstructor || !autoTable) {
      throw new Error("jsPDF and jspdf-autotable must be loaded before exporting a PDF.");
    }
    return { jsPDFConstructor, autoTable };
  }

  function drawParty(doc, autoTable, { title, name, phone, address, x, startY }) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, x, startY + 15);

    autoTable(doc, {
      startY: startY + 15 + 4,
      margin: { left: x, right: 0 },
      tableWidth: PARTY_LABEL_WIDTH + PARTY_VALUE_WIDTH,
      theme: "grid",
      styles: BASE_STYLES,
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: PARTY_LABEL_WIDTH },
        1: { cellWidth: PARTY_VALUE_WIDTH },
      },
      body: [
        ["Name", name],
        ["Cellphone", phone],
        ["Address", address],
      ],
    });

    return doc.lastAutoTable.finalY;
  }

  function drawMeta(doc, autoTable, invoice, { x, startY }) {
    autoTable(doc, {
      startY,
      margin: { left: x, right: 0 },
      tableWidth: META_COLUMN_WIDTH * 2,
      theme: "grid",
      styles: BASE_STYLES,
      columnStyles: {
        0: { fontStyle: "bold", fillColor: SLV_BLUE, cellWidth: META_COLUMN_WIDTH },
        1: { cellWidth: META_COLUMN_WIDTH },
      },
      body: [
        ["Invoice no.", String(invoice.invoiceNo)],
        ["Date", formatRange(invoice.dateFrom, invoice.dateTo)],
        ["Week", formatRange(invoice.weekFrom, invoice.weekTo)],
        ["Payment Method", invoice.paymentMethod],
        ["Hourly rate", currency(invoice.hourlyRate)],
        ["Total hours", compactNumber(invoice.totalHours)],
        ["Amount", currency(invoice.total)],
      ],
    });

    return doc.lastAutoTable.finalY;
  }

  function drawItems(doc, autoTable, invoice, startY) {
    autoTable(doc, {
      startY,
      margin: { left: centeredX(ITEM_WIDTHS[0] + ITEM_WIDTHS[1] + ITEM_WIDTHS[2]), right: 0 },
      tableWidth: ITEM_WIDTHS[0] + ITEM_WIDTHS[1] + ITEM_WIDTHS[2],
      theme: "grid",
      styles: BASE_STYLES,
      headStyles: { fillColor: SLV_BLUE, textColor: BLACK, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: ITEM_WIDTHS[0] },
        1: { cellWidth: ITEM_WIDTHS[1], halign: "center" },
        2: { cellWidth: ITEM_WIDTHS[2], halign: "center" },
      },
      head: [["Date", "Client", "Amount"]],
      body: invoice.items.map((item) => [
        item.date,
        item.client,
        compactNumber(item.hours),
      ]),
    });
  }

  function generatePdf(invoice) {
    const { jsPDFConstructor, autoTable } = requireLibraries();
    const doc = new jsPDFConstructor({ unit: "pt", format: "letter" });

    const headerX = centeredX(HEADER_WIDTH);
    if (SLV.LOGO_PNG_DATA_URI) {
      doc.addImage(SLV.LOGO_PNG_DATA_URI, "PNG", headerX, MARGIN_Y, LOGO_SIZE, LOGO_SIZE);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("Invoice", headerX + HEADER_WIDTH, MARGIN_Y + LOGO_SIZE / 2 + 10, {
      align: "right",
    });

    const topY = MARGIN_Y + LOGO_SIZE + 20;
    const leftX = centeredX(TOP_WIDTH);

    const billToEnd = drawParty(doc, autoTable, {
      title: "Bill to:",
      name: invoice.billToName,
      phone: invoice.billToPhone,
      address: invoice.billToAddress,
      x: leftX,
      startY: topY,
    });
    const fromEnd = drawParty(doc, autoTable, {
      title: "From:",
      name: invoice.fromName,
      phone: invoice.fromPhone,
      address: invoice.fromAddress,
      x: leftX,
      startY: billToEnd + 14,
    });
    const metaEnd = drawMeta(doc, autoTable, invoice, {
      x: leftX + 3.6 * INCH,
      startY: topY,
    });

    drawItems(doc, autoTable, invoice, Math.max(fromEnd, metaEnd) + 24);

    return new Uint8Array(doc.output("arraybuffer"));
  }

  SLV.pdfGenerator = { generatePdf };
})();
