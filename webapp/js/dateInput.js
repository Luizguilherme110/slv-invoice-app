(function () {
  const SLV = (globalThis.SLV = globalThis.SLV || {});

  /** Renders a two-date period as "start - end", tolerating a missing end. */
  function formatRange(start, end) {
    const parts = [start, end]
      .filter((part) => part && part.trim())
      .map((part) => part.trim());
    return parts.join(" - ");
  }

  function formatDateDigits(raw) {
    const digits = String(raw).replace(/\D/g, "").slice(0, 8);

    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    let formatted = day;
    if (month) formatted += `/${month}`;
    if (year) formatted += `/${year}`;
    return formatted;
  }

  SLV.dateInput = { formatRange, formatDateDigits };
})();
