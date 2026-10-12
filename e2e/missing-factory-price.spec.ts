import { expect, test } from "@playwright/test";

const languages = [
  { locale: "en", width: 1280, open: "Review price", heading: "Separate factory approval required",
    selection: "First factory-confirmed list (legacy work)", close: "Close review" },
  { locale: "ru", width: 390, open: "Разобрать цену", heading: "Нужно отдельное подтверждение завода",
    selection: "Первый подтверждённый прайс (старая очередь)", close: "Закрыть проверку" },
  { locale: "he", width: 390, open: "בדיקת מחיר", heading: "נדרש אישור נפרד מהמפעל",
    selection: "המחירון המאושר הראשון (תור ישן)", close: "סגירת הבדיקה" },
];

for (const t of languages) {
  test(`missing factory rate stays read-only ${t.locale} ${t.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);
    const errors: string[] = [], writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: t.width, height: 900 });
    await page.addInitScript((locale) => localStorage.setItem("dimax_locale", locale), t.locale);
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const headers = { "access-control-allow-origin": request.headers().origin || "*",
        "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
        "access-control-allow-methods": "GET,POST,OPTIONS" };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (request.method() !== "GET") writes.push(path);
      const reply = (json: unknown) => route.fulfill({ headers, json });
      if (path.endsWith("/auth/me")) return reply({ id: "qa-owner", company_id: "qa-company", role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
      if (path.endsWith("/sync/health/summary")) return reply({ max_cursor: 0,
        counts: { ok: 0, warn: 0, danger: 1, total: 1, dead: 0, never_seen: 0, danger_pct: 100, problem_total: 1 },
        alerts_sent: 0, top_laggers: [], top_offline: [] });
      if (path.endsWith("/sync/problems")) return reply({ total: 1, items: [{
        source: "sync_queue", id: "qa-unpriced", status: "CONFLICT", installer_id: "qa-installer", installer_name: "QA Installer",
        problem_code: "CONFLICT_FACTORY_PRICE", error: "CONFLICT_FACTORY_PRICE", retry_allowed: false,
        manual_review_required: true, payload: {}, created_at: "2026-10-12T09:00:00Z",
      }] });
      if (path.includes("/price-conflicts/")) return reply({ id: "qa-unpriced", project_name: "QA project",
        installer_name: "QA Installer", work_label: "Door adjustment", quantity: "1.50", performed_at: "2026-10-01T08:00:00Z",
        received_at: "2026-10-12T09:00:00Z", seen_price_list_id: null, seen_version: null, seen_version_status: "MISSING",
        analysis_code: "MISSING_FACTORY_PRICE", applicable_quote: null, preview_amount: null,
        resolution_available: false, review_token: null, missing_price: { price_list_id: "qa-first-list", version: 1,
          kind: "ADDON", target_id: "qa-addon", performed_at: "2026-10-01T08:00:00Z",
          effective_from: "2026-10-02T08:00:00Z", selection: "FIRST_CONFIRMED_LEGACY" } });
      if (path.endsWith("/outbox/summary")) return reply({ failed_total: 0, pending_overdue_15m: 0, by_channel: {}, by_delivery_status: {} });
      return reply({ items: [], total: 0, unread_count: 0 });
    });
    await page.goto("/operations");
    await page.getByRole("button", { name: t.open, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("v1", { exact: true })).toBeVisible();
    await dialog.getByRole("heading", { name: t.heading }).scrollIntoViewIfNeeded();
    await expect(dialog.getByText(t.selection, { exact: true })).toBeVisible();
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    await expect(dialog.getByRole("button")).toHaveCount(2); // Only the two close controls.
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(t.width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    if (t.locale === "he") await expect(dialog).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: testInfo.outputPath(`missing-price-${t.locale}.png`) });
    await dialog.getByRole("button", { name: t.close, exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`missing-price-${t.locale}-details.png`) });
    await dialog.getByRole("button", { name: t.close, exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}
