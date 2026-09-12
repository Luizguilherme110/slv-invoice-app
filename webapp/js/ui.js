(function () {
  const SLV = (globalThis.SLV = globalThis.SLV || {});
  const { formatDateDigits } = SLV.dateInput;
  const storage = SLV.storage;

  const DEFAULT_FROM = {
    name: "SLV Cleaning Services",
    phone: "508-901-1384",
    address: "69, Cato lane",
  };

  const DATE_PLACEHOLDER = "dd/mm/yyyy";

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "hidden") node.hidden = value;
      else node.setAttribute(key, value);
    });
    children.filter(Boolean).forEach((child) => node.appendChild(child));
    return node;
  }

  const formatMoney = (value) =>
    `$${Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  /** Matches Python's "%g": 5 renders as "5", 5.5 as "5.5". */
  const formatHours = (value) => String(Number(Number(value).toPrecision(6)));

  const parseOrZero = (value) => {
    const number = Number(String(value).trim());
    return String(value).trim() && Number.isFinite(number) ? number : 0;
  };

  function today() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  }

  /** Rewrites a date field to dd/mm/yyyy on every keystroke, caret kept at the end. */
  function bindDateAutoformat(input) {
    input.addEventListener("input", () => {
      const formatted = formatDateDigits(input.value);
      if (formatted !== input.value) {
        input.value = formatted;
        input.setSelectionRange(formatted.length, formatted.length);
      }
    });
  }

  function field(name, { value = "", placeholder = "", date = false } = {}) {
    const input = el("input", {
      type: "text",
      class: "field-input",
      "data-field": name,
      placeholder,
    });
    input.value = value;
    if (date) bindDateAutoformat(input);
    return input;
  }

  function labeledRow(label, ...inputs) {
    return el("label", { class: "field" }, [
      el("span", { class: "field-label", text: label }),
      el("span", { class: "field-inputs" }, inputs),
    ]);
  }

  function card(title, children) {
    return el("section", { class: "card" }, [
      el("h2", { class: "card-title", text: title }),
      ...children,
    ]);
  }

  function mount(root, { store } = {}) {
    const invoiceStore = store === undefined ? undefined : store;
    const peek = () =>
      invoiceStore === undefined
        ? storage.peekNextInvoiceNumber()
        : storage.peekNextInvoiceNumber(invoiceStore);

    root.innerHTML = "";
    root.classList.add("app");

    const errors = el("div", { class: "errors", "data-errors": "", role: "alert" });
    errors.hidden = true;

    // Bill to
    const billToName = field("billToName", { placeholder: "Client name" });
    const billToPhone = field("billToPhone");
    const billToAddress = field("billToAddress");
    const billToCard = card("Bill to", [
      labeledRow("Name", billToName),
      labeledRow("Phone", billToPhone),
      labeledRow("Address", billToAddress),
    ]);

    // Invoice details
    const invoiceNo = field("invoiceNo", { value: String(peek()) });
    const dateFrom = field("dateFrom", {
      value: today(),
      placeholder: DATE_PLACEHOLDER,
      date: true,
    });
    const dateTo = field("dateTo", { placeholder: DATE_PLACEHOLDER, date: true });
    const weekFrom = field("weekFrom", { placeholder: DATE_PLACEHOLDER, date: true });
    const weekTo = field("weekTo", { placeholder: DATE_PLACEHOLDER, date: true });
    const paymentMethod = field("paymentMethod", { value: "Cash" });
    const hourlyRate = field("hourlyRate", { value: "35" });
    const metaCard = card("Invoice details", [
      labeledRow("Invoice no.", invoiceNo),
      labeledRow("Date", dateFrom, dateTo),
      labeledRow("Week", weekFrom, weekTo),
      labeledRow("Payment", paymentMethod),
      labeledRow("Hourly rate", hourlyRate),
    ]);

    // From
    const fromName = field("fromName", { value: DEFAULT_FROM.name });
    const fromPhone = field("fromPhone", { value: DEFAULT_FROM.phone });
    const fromAddress = field("fromAddress", { value: DEFAULT_FROM.address });
    const fromCard = card("From", [
      labeledRow("Name", fromName),
      labeledRow("Phone", fromPhone),
      labeledRow("Address", fromAddress),
    ]);

    // Items
    const itemsBody = el("div", { class: "items-body" });
    const addItemButton = el("button", {
      type: "button",
      class: "button button-ghost",
      "data-add-item": "",
      text: "+  Add item",
    });
    const itemsCard = card("Items", [
      el("div", { class: "items-head" }, [
        el("span", { text: "Date" }),
        el("span", { text: "Client" }),
        el("span", { text: "Amount" }),
        el("span", {}),
      ]),
      itemsBody,
      addItemButton,
    ]);

    const totalHoursLabel = el("span", {
      class: "total-hours",
      "data-total-hours": "",
      text: "Total hours: 0",
    });
    const totalLabel = el("span", { class: "total", "data-total": "", text: "Total: $0.00" });
    const exportPdf = el("button", {
      type: "button",
      class: "button button-primary",
      "data-export": "pdf",
      text: "Export PDF",
    });
    const exportExcel = el("button", {
      type: "button",
      class: "button button-success",
      "data-export": "xlsx",
      text: "Export Excel",
    });

    const footer = el("div", { class: "footer" }, [
      el("div", { class: "totals" }, [totalHoursLabel, totalLabel]),
      el("div", { class: "actions" }, [exportPdf, exportExcel]),
    ]);

    root.append(
      errors,
      el("div", { class: "columns" }, [billToCard, metaCard]),
      fromCard,
      itemsCard,
      footer
    );

    const itemRows = [];

    function recalculate() {
      const rate = parseOrZero(hourlyRate.value);
      const hours = itemRows.reduce(
        (sum, row) => sum + parseOrZero(row.hours.value),
        0
      );
      totalHoursLabel.textContent = `Total hours: ${formatHours(hours)}`;
      totalLabel.textContent = `Total: ${formatMoney(hours * rate)}`;
    }

    function addItemRow() {
      const date = field("date", { placeholder: DATE_PLACEHOLDER, date: true });
      const client = field("client", { placeholder: "Client / property" });
      const hours = field("hours", { placeholder: "0" });
      const remove = el("button", {
        type: "button",
        class: "button button-danger",
        "data-remove-item": "",
        text: "Remove",
      });

      const row = el("div", { class: "items-row", "data-item-row": "" }, [
        date,
        client,
        hours,
        remove,
      ]);
      const entry = { row, date, client, hours };

      remove.addEventListener("click", () => removeItemRow(entry));
      hours.addEventListener("input", recalculate);

      itemRows.push(entry);
      itemsBody.appendChild(row);
      recalculate();
      return entry;
    }

    function removeItemRow(entry) {
      // The desktop app always keeps one row on screen; so does this one.
      if (itemRows.length === 1) return;
      const index = itemRows.indexOf(entry);
      if (index === -1) return;
      itemRows.splice(index, 1);
      entry.row.remove();
      recalculate();
    }

    function getForm() {
      return {
        fromName: fromName.value,
        fromPhone: fromPhone.value,
        fromAddress: fromAddress.value,
        billToName: billToName.value,
        billToPhone: billToPhone.value,
        billToAddress: billToAddress.value,
        invoiceNo: invoiceNo.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        weekFrom: weekFrom.value,
        weekTo: weekTo.value,
        paymentMethod: paymentMethod.value,
        hourlyRate: hourlyRate.value,
        items: itemRows.map((entry) => ({
          date: entry.date.value,
          client: entry.client.value,
          hours: entry.hours.value,
        })),
      };
    }

    function showErrors(messages) {
      errors.innerHTML = "";
      if (!messages || messages.length === 0) {
        errors.hidden = true;
        return;
      }
      errors.appendChild(
        el("p", { class: "errors-title", text: "Please fix the fields below" })
      );
      const list = el("ul");
      messages.forEach((message) => list.appendChild(el("li", { text: message })));
      errors.appendChild(list);
      errors.hidden = false;
      if (errors.scrollIntoView) errors.scrollIntoView({ block: "nearest" });
    }

    // Continue from whatever number the user actually exported: if they typed 22
    // by hand, the next invoice is 23, not the stored sequence.
    function registerExport(exportedNumber) {
      const trimmed = String(exportedNumber).trim();
      if (/^-?\d+$/.test(trimmed)) {
        storage.setNextInvoiceNumber(invoiceStore, Number.parseInt(trimmed, 10) + 1);
      } else if (invoiceStore === undefined) {
        storage.advanceInvoiceNumber();
      } else {
        storage.advanceInvoiceNumber(invoiceStore);
      }
      invoiceNo.value = String(peek());
    }

    hourlyRate.addEventListener("input", recalculate);
    addItemButton.addEventListener("click", () => addItemRow());

    addItemRow();
    recalculate();

    return {
      root,
      elements: { exportPdf, exportExcel },
      addItemRow,
      getForm,
      showErrors,
      registerExport,
      recalculate,
    };
  }

  SLV.ui = { mount, formatMoney, formatHours, DEFAULT_FROM };
})();
