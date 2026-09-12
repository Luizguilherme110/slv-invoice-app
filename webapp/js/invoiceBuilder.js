(function () {
  const SLV = (globalThis.SLV = globalThis.SLV || {});
  const { LineItem, InvoiceData } = SLV.models;

  const text = (value) => (value === undefined || value === null ? "" : String(value));

  /** Parses like Python's float(): blank and non-numeric input are rejected. */
  function parseNumber(value) {
    const trimmed = text(value).trim();
    if (!trimmed) return NaN;
    return Number(trimmed);
  }

  function isBlankRow(row) {
    return (
      !text(row.date).trim() && !text(row.client).trim() && !text(row.hours).trim()
    );
  }

  function validate(form) {
    const errors = [];

    if (!text(form.billToName).trim()) {
      errors.push("Enter the client's name.");
    }

    const hourlyRate = parseNumber(form.hourlyRate);
    if (Number.isNaN(hourlyRate)) {
      errors.push("Invalid hourly rate.");
    } else if (hourlyRate <= 0) {
      errors.push("Hourly rate must be greater than zero.");
    }

    const rows = (form.items || []).filter((row) => !isBlankRow(row));
    if (rows.length === 0) {
      errors.push("Add at least one item.");
    }

    rows.forEach((row, index) => {
      const position = index + 1;

      if (!text(row.client).trim()) {
        errors.push(`Item ${position}: client is required.`);
      }

      const hours = parseNumber(row.hours);
      if (Number.isNaN(hours)) {
        errors.push(`Item ${position}: Invalid amount.`);
      } else if (hours <= 0) {
        errors.push(`Item ${position}: Amount must be greater than zero.`);
      }
    });

    return errors;
  }

  function buildInvoiceData(form) {
    const items = (form.items || [])
      .filter((row) => !isBlankRow(row))
      .map(
        (row) =>
          new LineItem({
            date: text(row.date).trim(),
            client: text(row.client).trim(),
            hours: parseNumber(row.hours),
          })
      );

    return new InvoiceData({
      fromName: text(form.fromName),
      fromPhone: text(form.fromPhone),
      fromAddress: text(form.fromAddress),
      billToName: text(form.billToName).trim(),
      billToPhone: text(form.billToPhone),
      billToAddress: text(form.billToAddress),
      invoiceNo: text(form.invoiceNo),
      dateFrom: text(form.dateFrom),
      dateTo: text(form.dateTo),
      weekFrom: text(form.weekFrom),
      weekTo: text(form.weekTo),
      paymentMethod: text(form.paymentMethod),
      hourlyRate: parseNumber(form.hourlyRate),
      items,
    });
  }

  function suggestedFilename(invoiceNo, billToName, ext) {
    const safeName = text(billToName).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return `Invoice_${invoiceNo}_${safeName}.${ext}`;
  }

  SLV.invoiceBuilder = { validate, buildInvoiceData, suggestedFilename };
})();
