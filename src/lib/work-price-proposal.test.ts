import { describe, expect, it } from "vitest";
import { proposalAmount, proposalRate } from "./work-price-proposal";

describe("one-work proposal preview", () => {
  it.each([["9,01", "9.01"], ["9", "9.00"], [" 0.01 ", "0.01"], ["0009.1", "9.10"]])("normalizes %s", (value, expected) => {
    expect(proposalRate(value)).toBe(expected);
  });
  it.each(["", "0", "-1", "NaN", "Infinity", "1e3", "1.001", "1,000.00", "10000000000", ".1"])("rejects %s", (value) => {
    expect(proposalRate(value)).toBeNull();
    expect(proposalAmount(value, "1")).toBeNull();
  });
  it("uses exact half-up cents and enforces server amount limits", () => {
    expect(proposalAmount("9.01", "1.50")).toBe("13.52");
    expect(proposalAmount("0.01", "0.50")).toBe("0.01");
    expect(proposalAmount("0.01", "0.49")).toBeNull();
    expect(proposalAmount("9999999999.99", "1")).toBe("9999999999.99");
    expect(proposalAmount("9999999999.99", "2")).toBeNull();
    expect(proposalAmount("9.01", "invalid")).toBeNull();
  });
});
