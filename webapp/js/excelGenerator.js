(function () {
  const SLV = (globalThis.SLV = globalThis.SLV || {});
  const { formatRange } = SLV.dateInput;

  const SLV_BLUE = "FF6D9EEB";
  const CURRENCY_FORMAT = '"$"#,##0.00';
  const THIN = { style: "thin", color: { argb: "FF000000" } };
  const BORDER = { left: THIN, right: THIN, top: THIN, bottom: THIN };

  const COLUMN_WIDTHS = { A: 4, B: 14, C: 20, D: 14, E: 10, F: 14 };
  const HEADER_ROW = 21;

  function labelCell(sheet, address, text) {
    const cell = sheet.getCell(address);
    cell.value = text;
    cell.font = { bold: true };
    cell.border = BORDER;
    return cell;
  }

  function valueCell(sheet, address, value, numberFormat) {
    const cell = sheet.getCell(address);
    cell.value = value;
    cell.border = BORDER;
    if (numberFormat) cell.numFmt = numberFormat;
    return cell;
  }

  function blueLabelCell(sheet, address, text) {
    const cell = labelCell(sheet, address, text);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SLV_BLUE } };
    return cell;
  }

  function sectionTitle(sheet, address, text) {
    const cell = sheet.getCell(address);
    cell.value = text;
    cell.font = { bold: true, size: 15 };
    return cell;
  }

  function addLogo(workbook, sheet) {
    if (!SLV.LOGO_PNG_DATA_URI) return;
    const imageId = workbook.addImage({
      base64: SLV.LOGO_PNG_DATA_URI,
      extension: "png",
    });
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 90, height: 90 },
    });
  }

  async function generateExcel(invoice) {
    const ExcelJS = globalThis.ExcelJS;
    if (!ExcelJS) {
      throw new Error("ExcelJS must be loaded before exporting a spreadsheet.");
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Invoice");

    Object.entries(COLUMN_WIDTHS).forEach(([column, width]) => {
      sheet.getColumn(column).width = width;
    });

    addLogo(workbook, sheet);

    sheet.mergeCells("C1:F2");
    const title = sheet.getCell("C1");
    title.value = "Invoice";
    title.font = { bold: true, size: 28 };
    title.alignment = { horizontal: "center", vertical: "middle" };

    sectionTitle(sheet, "B5", "Bill to:");
    labelCell(sheet, "B6", "Name");
    valueCell(sheet, "C6", invoice.billToName);
    labelCell(sheet, "B7", "Cellphone");
    valueCell(sheet, "C7", invoice.billToPhone);
    labelCell(sheet, "B8", "Address");
    valueCell(sheet, "C8", invoice.billToAddress);

    sectionTitle(sheet, "B11", "From:");
    labelCell(sheet, "B12", "Name");
    valueCell(sheet, "C12", invoice.fromName);
    labelCell(sheet, "B13", "Cellphone");
    valueCell(sheet, "C13", invoice.fromPhone);
    labelCell(sheet, "B14", "Address");
    valueCell(sheet, "C14", invoice.fromAddress);

    const metaRows = [
      ["Invoice no.", invoice.invoiceNo, null],
      ["Date", formatRange(invoice.dateFrom, invoice.dateTo), null],
      ["Week", formatRange(invoice.weekFrom, invoice.weekTo), null],
      ["Payment Method", invoice.paymentMethod, null],
      ["Hourly rate", invoice.hourlyRate, CURRENCY_FORMAT],
      ["Total hours", invoice.totalHours, null],
      ["Amount", invoice.total, CURRENCY_FORMAT],
    ];
    metaRows.forEach(([label, value, format], offset) => {
      const row = 5 + offset * 2;
      blueLabelCell(sheet, `D${row}`, label);
      valueCell(sheet, `E${row}`, value, format);
    });

    ["C", "D", "E"].forEach((column, index) => {
      blueLabelCell(sheet, `${column}${HEADER_ROW}`, ["Date", "Client", "Amount"][index]);
    });

    invoice.items.forEach((item, offset) => {
      const row = HEADER_ROW + 1 + offset;
      valueCell(sheet, `C${row}`, item.date);
      valueCell(sheet, `D${row}`, item.client);
      valueCell(sheet, `E${row}`, item.hours);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buffer);
  }

  SLV.excelGenerator = { generateExcel };
})();
