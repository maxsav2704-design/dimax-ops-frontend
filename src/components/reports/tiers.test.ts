import { describe, expect, it } from "vitest";

import { parseReportsTier, reportsFocusTier, REPORTS_TIERS } from "./shared";

describe("reports tiers", () => {
  it("parses the tier from a link and ignores anything else", () => {
    for (const tier of REPORTS_TIERS) expect(parseReportsTier(tier)).toBe(tier);
    expect(parseReportsTier("finance")).toBeNull();
    expect(parseReportsTier(null)).toBeNull();
  });

  it("keeps a focus deep link visible under any tier through its own tier", () => {
    expect(reportsFocusTier("operations")).toBe("operations");
    expect(reportsFocusTier("delivery")).toBe("operations");
    expect(reportsFocusTier("issues")).toBe("operations");
    expect(reportsFocusTier(null)).toBeNull();
  });
});
