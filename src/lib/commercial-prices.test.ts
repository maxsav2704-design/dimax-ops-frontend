import { describe, expect, it } from "vitest";
import { commercialDetailSchema, commercialLineKey, normalizeCommercialPrice } from "./commercial-prices";

describe("commercial prices", () => {
  it.each([["0", "0.00"], ["00,00", "0.00"], ["12,5", "12.50"], [" 00400.01 ", "400.01"],
    ["9999999999.99", "9999999999.99"]])("preserves decimal input %s", (input, expected) => {
    expect(normalizeCommercialPrice(input)).toBe(expected);
  });
  it.each(["", "-1", "NaN", "Infinity", "1e2", "1.001", "10000000000", "1,2,3"])("rejects %s", (input) => {
    expect(normalizeCommercialPrice(input)).toBeNull();
  });
  it("distinguishes full work from multiple stages", () => {
    const target_id = "f58a8a1d-d80a-458f-9263-b035f135c529";
    const keys = [
      commercialLineKey({ kind: "INSTALLATION", target_id, stage_code: "" }),
      commercialLineKey({ kind: "STAGE", target_id, stage_code: "FRAME" }),
      commercialLineKey({ kind: "STAGE", target_id, stage_code: "LEAF" }),
    ];
    expect(new Set(keys).size).toBe(3);
  });
  it("never treats an approved or billable response as a supported draft", () => {
    const base = {
      id: "f58a8a1d-d80a-458f-9263-b035f135c529", contract_id: "63982c70-23a7-4ae7-9a23-9c661372c4be",
      created_by: "1cac48c4-1b12-43fd-a02e-cab93c669e24", version: 1, status: "DRAFT",
      created_at: "2026-10-20T10:00:00Z", proposed_from: "2026-11-10",
      reason: "Test", agreement_reference: "Test", currency: "ILS", vat_basis: "EXCLUSIVE",
      factory_confirmed: false, usable_for_billing: false, is_demo: true, items: [],
    };
    expect(commercialDetailSchema.safeParse(base).success).toBe(true);
    for (const changes of [{ status: "CONFIRMED" }, { factory_confirmed: true }, { usable_for_billing: true },
      { currency: "USD" }, { proposed_from: "2026-02-30" }, { is_demo: undefined }]) {
      expect(commercialDetailSchema.safeParse({ ...base, ...changes }).success).toBe(false);
    }
  });
});
