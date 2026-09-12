// Plain script, not an ES module: Chrome blocks `type="module"` on file:// URLs
// (opaque "null" origin), and this app is opened as a local file. Every module
// hangs itself off the shared SLV namespace instead.
(function () {
  const SLV = (globalThis.SLV = globalThis.SLV || {});

  class LineItem {
    constructor({ date, client, hours }) {
      this.date = date;
      this.client = client;
      this.hours = hours;
    }

    amount(hourlyRate) {
      return this.hours * hourlyRate;
    }
  }

  class InvoiceData {
    constructor({
      fromName,
      fromPhone,
      fromAddress,
      billToName,
      billToPhone,
      billToAddress,
      invoiceNo,
      dateFrom,
      dateTo,
      weekFrom,
      weekTo,
      paymentMethod,
      hourlyRate,
      items = [],
    }) {
      this.fromName = fromName;
      this.fromPhone = fromPhone;
      this.fromAddress = fromAddress;
      this.billToName = billToName;
      this.billToPhone = billToPhone;
      this.billToAddress = billToAddress;
      this.invoiceNo = invoiceNo;
      this.dateFrom = dateFrom;
      this.dateTo = dateTo;
      this.weekFrom = weekFrom;
      this.weekTo = weekTo;
      this.paymentMethod = paymentMethod;
      this.hourlyRate = hourlyRate;
      this.items = items;
    }

    get totalHours() {
      return this.items.reduce((sum, item) => sum + item.hours, 0);
    }

    get total() {
      return this.items.reduce((sum, item) => sum + item.amount(this.hourlyRate), 0);
    }
  }

  SLV.models = { LineItem, InvoiceData };
})();
