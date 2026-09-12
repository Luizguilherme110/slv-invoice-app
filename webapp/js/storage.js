(function () {
  const SLV = (globalThis.SLV = globalThis.SLV || {});

  // Replaces %APPDATA%/SLVInvoice/config.json from the desktop version.
  // localStorage is per Chrome profile and scoped to the file:// origin, so the
  // counter only survives while she keeps opening the same index.html.
  const STORAGE_KEY = "slv_invoice_next_no";

  const defaultStore = () => {
    try {
      return globalThis.localStorage || null;
    } catch (error) {
      // Chrome throws when site data is blocked for the origin.
      return null;
    }
  };

  function peekNextInvoiceNumber(store = defaultStore()) {
    if (!store) return 1;
    try {
      const raw = store.getItem(STORAGE_KEY);
      const value = Number.parseInt(raw, 10);
      return Number.isFinite(value) ? value : 1;
    } catch (error) {
      return 1;
    }
  }

  function setNextInvoiceNumber(store, value) {
    const target = store === undefined ? defaultStore() : store;
    if (!target) return;
    try {
      target.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      // A failed write must never block the export the user just asked for.
    }
  }

  function advanceInvoiceNumber(store = defaultStore()) {
    setNextInvoiceNumber(store, peekNextInvoiceNumber(store) + 1);
  }

  SLV.storage = {
    STORAGE_KEY,
    peekNextInvoiceNumber,
    setNextInvoiceNumber,
    advanceInvoiceNumber,
  };
})();
