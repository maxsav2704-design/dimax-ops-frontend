import { describe, expect, it, vi } from "vitest";
import { invitationStatus, loadPriceCatalog, normalizeInstallerPrice, type Invitation, type PriceSummary } from "./factory-prices";
import { apiFetch } from "./api";
vi.mock("./api", () => ({ apiFetch: vi.fn() }));

describe("factory price inputs", () => {
  it.each([["250,50", "250.50"], [" 9 ", "9.00"], ["0.01", "0.01"], ["0009.1", "9.10"], ["9999999999.99", "9999999999.99"]])("normalizes %s without rounding", (value, expected) => {
    expect(normalizeInstallerPrice(value)).toBe(expected);
  });
  it.each(["0", "0,00", "-1", "1e3", "NaN", "Infinity", "1.234", "1,000.00", "1,2,3", "10000000000", "", ".5"])("rejects %s", (value) => {
    expect(normalizeInstallerPrice(value)).toBeNull();
  });
  it("loads all door catalog pages without importing unapproved default add-on prices", async () => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockResolvedValueOnce(Array.from({ length: 200 }, (_, index) => ({ id: `d-${index}`, name: "Door" })))
      .mockResolvedValueOnce([{ id: "d-200", name: "Last door" }])
      .mockResolvedValueOnce({ items: [{ id: "a", name: "Adjustment", unit: "hour", is_active: true, default_installer_price: "999" }] });
    const rows = await loadPriceCatalog(new AbortController().signal);
    expect(rows).toHaveLength(202);
    expect(vi.mocked(apiFetch).mock.calls[1][0]).toContain("offset=200");
    expect(rows.at(-1)).not.toHaveProperty("installer_price");
  });
  it("keeps a recorded decision confirmed after expiry or newer versions", () => {
    const row = { confirmed_at: "2026-10-01T10:00:00Z", revoked_at: null, expires_at: "2026-10-01T11:00:00Z" } as Invitation;
    const list = { status: "CONFIRMED", version: 1 } as PriceSummary;
    expect(invitationStatus(row, list, 2, Date.parse("2026-10-02"))).toBe("CONFIRMED");
    expect(invitationStatus({ ...row, confirmed_at: null }, { ...list, status: "DRAFT" }, 2)).toBe("SUPERSEDED");
    expect(invitationStatus({ ...row, confirmed_at: null }, { ...list, status: "DRAFT" }, 1, Date.parse("2026-10-02"))).toBe("EXPIRED");
  });
});
