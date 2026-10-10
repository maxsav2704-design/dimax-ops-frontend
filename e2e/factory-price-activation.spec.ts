import { expect, test } from "@playwright/test";
import { activationCopy } from "../src/components/prices/activation-copy";

// UI contract and layout only. Real JWT/DB transitions are covered by backend integration tests.
for (const [locale, width] of [["en", 1280], ["ru", 390], ["he", 390]] as const) {
  test(`reviewed activation ${locale} ${width}px`, async ({ page }, testInfo) => {
    const t = activationCopy[locale];
    const version = { id: "qa-list", version: 1, status: "CONFIRMED", currency: "ILS", reason: "QA factory offer",
      agreement_reference: "QA agreement 42", created_at: "2026-10-10T08:00:00Z", created_by: "qa-owner",
      cancelled_at: null, cancellation_reason: null,
      items: [{ kind: "DOOR", target_id: "qa-door", name: "Entrance / Входная дверь / דלת כניסה", unit: "pcs", installer_price: "250.00" }] };
    let writes = 0;
    let effective = false;
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((value) => localStorage.setItem("dimax_locale", value), locale);
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const headers = { "access-control-allow-origin": request.headers().origin || "*",
        "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
        "access-control-allow-methods": "GET,POST,OPTIONS" };
      const reply = (json: unknown) => route.fulfill({ headers, json });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (path.endsWith("/auth/me")) return reply({ id: "qa-owner", company_id: "qa-company", role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
      if (path === "/api/v1/admin/price-lists") return reply({ items: [version], total: 1, latest_version: 1 });
      if (path.endsWith("/price-lists/state")) return reply({ mode: effective ? "FACTORY" : "LEGACY", active_price: effective ? {
        price_list_id: version.id, version: 1, currency: "ILS", effective_from: "2026-10-10T12:00:00Z", items: [],
      } : null });
      if (path.endsWith("/qa-list")) return reply(version);
      if (path.endsWith("/approvals")) return reply({ items: [], total: 0 });
      if (path.endsWith("/reconciliation")) return reply({ price_list_id: version.id, version: 1,
        application_check: { status: "REVIEW_REQUIRED", affects_earnings: false, confirmed_at: "2026-10-10T09:00:00Z",
          blockers: [], review: [{ code: "LEGACY_DIFFERENCES", count: 3 }, { code: "UNACCRUED_WORK", count: 1 }] } });
      if (path.endsWith("/activate")) {
        expect(request.method()).toBe("POST");
        const body = request.postDataJSON();
        expect(body).toEqual({ request_id: expect.any(String), expected_active_price_list_id: null,
          reason: "Reviewed factory transition", reviewed_transition: true });
        writes++; effective = true;
        return reply({ id: "qa-activation", price_list_id: version.id, approval_id: "qa-approval",
          effective_from: "2026-10-10T12:00:00Z", created_by: "qa-owner", reason: body.reason });
      }
      expect(request.method()).toBe("GET");
      return reply({ unread_count: 0 });
    });
    await page.goto("/price-lists");
    await page.getByRole("button", { name: t.open, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(t.legacy)).toBeVisible();
    await expect(dialog.getByRole("button", { name: t.submit, exact: true })).toBeDisabled();
    await expect(dialog.getByLabel(t.reason)).toBeEnabled();
    if (locale === "he") await expect(dialog).toHaveAttribute("dir", "rtl");
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`activation-${locale}.png`), fullPage: true });
    await dialog.getByLabel(t.reason).fill("Reviewed factory transition");
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: t.submit, exact: true }).click();
    await expect(dialog.getByRole("heading", { name: t.success, exact: true })).toBeVisible();
    expect(writes).toBe(1);
    await dialog.getByRole("button", { name: t.close, exact: true }).first().click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: t.open, exact: true })).toHaveCount(0);
  });
}
