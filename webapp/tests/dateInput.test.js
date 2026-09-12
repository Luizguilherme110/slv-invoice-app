import { describe, expect, test } from "vitest";

import "../js/dateInput.js";

const { formatRange, formatDateDigits } = globalThis.SLV.dateInput;

describe("formatRange", () => {
  test("joins both dates with a hyphen", () => {
    expect(formatRange("01/04/2026", "07/04/2026")).toBe("01/04/2026 - 07/04/2026");
  });

  test("with only the start date shows just that date", () => {
    expect(formatRange("01/04/2026", "")).toBe("01/04/2026");
  });

  test("with only the end date shows just that date", () => {
    expect(formatRange("", "07/04/2026")).toBe("07/04/2026");
  });

  test("empty range is empty", () => {
    expect(formatRange("", "")).toBe("");
  });

  test("ignores surrounding whitespace", () => {
    expect(formatRange("  01/04/2026 ", " 07/04/2026")).toBe("01/04/2026 - 07/04/2026");
  });
});

describe("formatDateDigits", () => {
  test("empty stays empty", () => {
    expect(formatDateDigits("")).toBe("");
  });

  test("single digit has no slash yet", () => {
    expect(formatDateDigits("0")).toBe("0");
  });

  test("two digits have no slash yet", () => {
    expect(formatDateDigits("01")).toBe("01");
  });

  test("third digit inserts the first slash", () => {
    expect(formatDateDigits("013")).toBe("01/3");
  });

  test("four digits format as dd/mm", () => {
    expect(formatDateDigits("0104")).toBe("01/04");
  });

  test("fifth digit inserts the second slash", () => {
    expect(formatDateDigits("01042")).toBe("01/04/2");
  });

  test("eight digits format as dd/mm/yyyy", () => {
    expect(formatDateDigits("01042026")).toBe("01/04/2026");
  });

  test("extra digits beyond eight are dropped", () => {
    expect(formatDateDigits("0104202699")).toBe("01/04/2026");
  });

  test("non-digit characters are stripped", () => {
    expect(formatDateDigits("ab01cd04ef2026")).toBe("01/04/2026");
  });

  test("already formatted input is idempotent", () => {
    expect(formatDateDigits("01/04/2026")).toBe("01/04/2026");
  });
});
