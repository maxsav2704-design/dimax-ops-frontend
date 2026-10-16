import { describe, expect, it } from "vitest";

import {
  authMeSchema,
  companyPricingStateSchema,
  earningsLedgerResponseSchema,
  priceDetailSchema,
  pricePageSchema,
} from "@/lib/api-schemas";

const draft = {
  id: "list-1", version: 1, status: "DRAFT", currency: "ILS", reason: "Factory request", agreement_reference: "Agreement 42",
  created_at: "2026-10-02T08:00:00Z", created_by: "owner", cancelled_at: null, cancellation_reason: null,
  items: [{ kind: "DOOR", target_id: "door-1", name: "Entrance", unit: "pcs", installer_price: "250.00" }],
};

describe("api-schemas", () => {
  it("accepts the auth/me payload and keeps unknown fields", () => {
    const parsed = authMeSchema.parse({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: true, extra: 1 });
    expect(parsed.role).toBe("ADMIN");
    expect((parsed as Record<string, unknown>).extra).toBe(1);
    expect(() => authMeSchema.parse({ admin_scope: "OWNER" })).toThrow();
    expect(() => authMeSchema.parse("<html>")).toThrow();
  });

  it("accepts price list pages and details as the price page tests send them", () => {
    expect(pricePageSchema.parse({ items: [draft], total: 1, latest_version: 1 }).items[0].version).toBe(1);
    expect(priceDetailSchema.parse(draft).items[0].installer_price).toBe("250.00");
    expect(() => priceDetailSchema.parse({ ...draft, items: [{ kind: "WINDOW" }] })).toThrow();
    expect(() => priceDetailSchema.parse({ ...draft, currency: "USD" })).toThrow();
  });

  it("accepts both pricing modes", () => {
    expect(companyPricingStateSchema.parse({ mode: "LEGACY", active_price: null }).active_price).toBeNull();
    const factory = companyPricingStateSchema.parse({
      mode: "FACTORY",
      active_price: {
        price_list_id: "price-v1", version: 1, currency: "ILS", effective_from: "2026-10-01T00:00:00Z",
        items: [{ kind: "ADDON", target_id: "addon-1", rate: "9", unit: "pcs" }],
      },
    });
    expect(factory.active_price?.items).toHaveLength(1);
    expect(() => companyPricingStateSchema.parse({ mode: "MANUAL", active_price: null })).toThrow();
  });

  it("accepts ledger rows with string or numeric money and rejects missing amounts", () => {
    const row = {
      id: "work-1", entry_type: "ORIGINAL", correction_ref_id: null, completed_at: "2026-05-07T08:00:00Z",
      quantity: "1.00", rate_snapshot: 120, amount_snapshot: "120.00", reason: null, work_kind: "DOOR",
      project_id: "project-1", project_name: "Ashdod Tower", door_id: "door-1", door_label: "A-101", door_code: "D-101",
      addon_fact_id: null, installer_id: "installer-1", installer_name: "Installer Alpha", can_correct: true,
    };
    const parsed = earningsLedgerResponseSchema.parse({ items: [row], total: 1, limit: 50, offset: 0 });
    expect(parsed.items[0].rate_snapshot).toBe(120);
    const { amount_snapshot: _dropped, ...broken } = row;
    expect(() => earningsLedgerResponseSchema.parse({ items: [broken], total: 1, limit: 50, offset: 0 })).toThrow();
  });
});
