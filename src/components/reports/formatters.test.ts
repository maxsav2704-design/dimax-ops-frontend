import { describe, expect, it } from "vitest";

import { formatAmount, formatCount } from "./shared";

describe("report number formatters", () => {
  it("never show missing data (not loaded, failed) as zero", () => {
    expect(formatCount(undefined)).toBe("-");
    expect(formatCount(null)).toBe("-");
    expect(formatAmount(undefined)).toBe("-");
    expect(formatAmount(null)).toBe("-");
  });

  it("still show a real zero as zero", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatAmount(0)).toMatch(/^0[.,]00$/);
  });
});
