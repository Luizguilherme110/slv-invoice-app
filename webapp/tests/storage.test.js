import { beforeEach, describe, expect, test } from "vitest";

import "../js/storage.js";

const { STORAGE_KEY, peekNextInvoiceNumber, setNextInvoiceNumber, advanceInvoiceNumber } =
  globalThis.SLV.storage;

/** Stand-in for window.localStorage, so tests never touch a shared store. */
function memoryStore(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

let store;

beforeEach(() => {
  store = memoryStore();
});

describe("peekNextInvoiceNumber", () => {
  test("returns 1 when nothing has been stored yet", () => {
    expect(peekNextInvoiceNumber(store)).toBe(1);
  });

  test("does not mutate the counter", () => {
    peekNextInvoiceNumber(store);
    peekNextInvoiceNumber(store);
    expect(peekNextInvoiceNumber(store)).toBe(1);
  });

  test("falls back to 1 when the stored value is corrupt", () => {
    const corrupt = memoryStore({ [STORAGE_KEY]: "not a number" });
    expect(peekNextInvoiceNumber(corrupt)).toBe(1);
  });

  test("falls back to 1 when storage is unavailable", () => {
    const blocked = {
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {},
    };
    expect(peekNextInvoiceNumber(blocked)).toBe(1);
  });
});

describe("advanceInvoiceNumber", () => {
  test("increments the stored counter", () => {
    advanceInvoiceNumber(store);
    expect(peekNextInvoiceNumber(store)).toBe(2);
  });
});

describe("setNextInvoiceNumber", () => {
  test("stores the given number", () => {
    setNextInvoiceNumber(store, 23);
    expect(peekNextInvoiceNumber(store)).toBe(23);
  });

  test("overrides a previously stored sequence", () => {
    advanceInvoiceNumber(store);
    advanceInvoiceNumber(store);
    expect(peekNextInvoiceNumber(store)).toBe(3);

    // user typed 22 by hand on the invoice they just exported
    setNextInvoiceNumber(store, 23);
    expect(peekNextInvoiceNumber(store)).toBe(23);
  });

  test("swallows a write failure instead of breaking the export", () => {
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(() => setNextInvoiceNumber(blocked, 5)).not.toThrow();
  });
});
