import { expect, test, type Page } from "@playwright/test";
import type { ReconciliationLine, ReconciliationPage } from "../src/lib/factory-prices";

// Mocked browser acceptance. Backend scoping/calculations are tested against PostgreSQL separately.
function fixture() {
  const list = { id: "list-1", version: 1, status: "DRAFT", currency: "ILS", reason: "QA factory offer",
    agreement_reference: "QA agreement", created_at: "2026-10-03T08:00:00Z", created_by: "qa-owner",
    cancelled_at: null, cancellation_reason: null,
    items: [{ kind: "DOOR", target_id: "type-1", name: "Entrance / Входная дверь", unit: "pcs", installer_price: "250.00" }] };
  const base: ReconciliationLine = { kind: "DOOR", target_id: "type-1", name: "Entrance / Входная дверь", unit: "pcs",
    proposed_name: "Entrance / Входная дверь", proposed_unit: "pcs", source_type: "DOOR", source_id: "door-1", source_name: "A-101",
    project_id: "project-1", project_name: "QA object", installer_id: "installer-1", installer_name: "QA Installer One",
    effective_from: null, quantity: null, legacy_price: "125.00", proposed_price: "250.00", delta: "125.00", legacy_variants: 2,
    uses_snapshot: true, uses_surcharge: true, catalog_changed: false, source_available: true, review_required: true, status: "DIFFERENT" };
  const addon = { ...base, kind: "ADDON" as const, target_id: "addon-1", name: "Adjustment / Регулировка",
    proposed_name: "Adjustment / Регулировка", legacy_price: "12.00", proposed_price: "9.00", delta: "-3.00", legacy_variants: 1, uses_snapshot: false, uses_surcharge: false };
  const rows: ReconciliationLine[] = [base,
    { ...base, source_type: "INSTALLER_RATE", source_id: "rate-1", source_name: "QA Installer Two", project_id: null, project_name: null,
      legacy_price: "250.00", delta: "0.00", status: "MATCH", uses_snapshot: false, uses_surcharge: false, review_required: true },
    { ...base, source_type: "SCHEDULED_RATE", source_id: "rate-2", source_name: "QA Installer One", project_id: null, project_name: null,
      legacy_price: "300.00", delta: "-50.00", effective_from: "2026-11-01T08:00:00Z", uses_snapshot: false, uses_surcharge: false },
    { ...addon, source_type: "ADDON_PLAN", source_id: "plan-1", source_name: "QA object" },
    { ...addon, source_type: "ADDON_DEFAULT", source_id: "addon-1", source_name: null, project_id: null, project_name: null,
      legacy_price: "9.00", delta: "0.00", status: "MATCH", review_required: false },
    { ...addon, source_type: "ADDON_FACT", source_id: "fact-1", source_name: null, quantity: "1.50", legacy_price: "9.00", delta: "0.00", status: "MATCH", effective_from: "2026-10-02T08:00:00Z" },
    { ...addon, target_id: "addon-2", source_type: "ADDON_PLAN", source_id: "plan-2", source_name: "QA object", unit: "hour",
      proposed_unit: "pcs", status: "UNIT_CHANGED", catalog_changed: true, delta: null },
    { ...base, target_id: "type-2", source_id: "door-2", source_name: "B-201", proposed_price: null, delta: null, status: "MISSING_PROPOSED", uses_snapshot: false, uses_surcharge: false },
    { ...base, target_id: "type-3", source_id: "door-3", source_name: "B-202", legacy_price: null, delta: null, status: "MISSING_LEGACY", uses_snapshot: false, uses_surcharge: false },
    { ...base, source_id: "door-4", source_name: "B-203", source_available: false, status: "UNAVAILABLE", uses_snapshot: false, uses_surcharge: false },
    ...Array.from({ length: 20 }, (_, index) => ({ ...base, source_id: `extra-${index}`, source_name: `C-${index + 101}`, uses_surcharge: false })),
  ];
  const requests: string[] = [], writes: string[] = [];
  let fail = false;
  return { requests, writes, setFailure: (value: boolean) => { fail = value; }, install: async (page: Page, empty = false) => {
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request(), url = new URL(request.url());
      const headers = { "access-control-allow-origin": request.headers().origin || "http://127.0.0.1:4175",
        "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
        "access-control-allow-methods": "GET,OPTIONS" };
      const reply = (json: unknown, status = 200) => route.fulfill({ status, headers, json });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (request.method() !== "GET") { writes.push(url.pathname); return reply({}, 405); }
      if (url.pathname.endsWith("/auth/me")) return reply({ id: "qa-owner", company_id: "qa-company", role: "ADMIN", admin_scope: "FINANCE", can_view_rates: true });
      if (url.pathname === "/api/v1/admin/price-lists") return reply({ items: empty ? [] : [list], total: empty ? 0 : 1, latest_version: empty ? 0 : 1 });
      if (url.pathname.endsWith("/approvals")) return reply({ items: [], total: 0 });
      if (url.pathname.endsWith("/reconciliation")) {
        requests.push(url.pathname + url.search);
        if (fail) return reply({ error: { code: "INTERNAL_ERROR" } }, 500);
        const sources = empty ? rows.map((row) => ({ ...row, proposed_name: null, proposed_unit: null, proposed_price: null, delta: null,
          catalog_changed: false, status: row.source_available ? "MISSING_PROPOSED" as const : "UNAVAILABLE" as const, review_required: true })) : rows;
        const count = (condition: (row: ReconciliationLine) => boolean) => sources.filter(condition).length;
        const filtered = sources.filter((row) => (url.searchParams.get("issues_only") !== "true" || row.review_required) &&
          (!url.searchParams.get("kind") || row.kind === url.searchParams.get("kind")));
        const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 20);
        const response: ReconciliationPage = { price_list_id: empty ? null : list.id, version: empty ? null : 1, currency: "ILS", generated_at: "2026-10-03T09:00:00Z",
          application_check: empty ? null : { status: "BLOCKED", affects_earnings: false, confirmed_at: null,
            blockers: [{ code: "NOT_CONFIRMED", count: 1 }, { code: "CATALOG_CHANGED", count: 1 }], review: [{ code: "UNACCRUED_WORK", count: 1 }] },
          total: filtered.length, items: filtered.slice(offset, offset + limit), summary: {
            total_sources: sources.length, review_sources: count((row) => row.review_required),
            matching: count((row) => row.status === "MATCH"), different: count((row) => row.status === "DIFFERENT"),
            missing_proposed: count((row) => row.status === "MISSING_PROPOSED"), missing_legacy: count((row) => row.status === "MISSING_LEGACY"),
            unavailable: count((row) => row.status === "UNAVAILABLE"), unit_changed: count((row) => row.status === "UNIT_CHANGED"),
            scheduled_rates: count((row) => row.source_type === "SCHEDULED_RATE"), door_snapshots: count((row) => row.uses_snapshot),
            door_surcharges: count((row) => row.uses_surcharge), catalog_changes: count((row) => row.catalog_changed),
            urgency_surcharges: 1, historical_entries: 11, pending_addon_facts: count((row) => row.source_type === "ADDON_FACT"), multiple_rate_types: 1,
          } };
        return reply(response);
      }
      if (url.pathname === "/api/v1/admin/price-lists/list-1") return reply(list);
      return reply({ unread_count: 0 });
    });
  } };
}

for (const [locale, open, filter, addon, only, refresh, close] of [
  ["en", "Compare current rates", "Work type", "Additional work", "Only items requiring review", "Refresh reconciliation", "Close"],
  ["ru", "Сверить текущие ставки", "Вид работ", "Допработы", "Только требующие сверки", "Обновить сверку", "Закрыть"],
  ["he", "השוואת תעריפים קיימים", "סוג עבודה", "עבודה נוספת", "רק פריטים הדורשים בדיקה", "רענון הבדיקה", "סגירה"],
] as const) {
  test(`reconciliation ${locale}: filters, pagination, retry and modal closing`, async ({ page }, info) => {
    const sample = fixture(); await sample.install(page);
    await page.setViewportSize({ width: locale === "en" ? 1366 : 390, height: locale === "en" ? 960 : 900 });
    await page.addInitScript((value) => localStorage.setItem("dimax_locale", value), locale);
    await page.goto("/price-lists");
    await page.getByRole("button", { name: open, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("A-101", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("table")).toBeVisible();
    await expect(dialog.getByRole("region", { name: locale === "en" ? "Check before applying prices" : locale === "ru" ? "Проверка перед применением цен" : "בדיקה לפני החלת מחירים" })).toBeVisible();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const next = dialog.getByRole("button", { name: locale === "en" ? "Next page" : locale === "ru" ? "Следующая страница" : "עמוד הבא", exact: true });
    await next.click(); await expect(dialog.getByText("C-112", { exact: true })).toBeVisible();
    await dialog.getByRole("combobox", { name: filter }).selectOption({ label: addon });
    await expect(dialog.getByText("Quantity", { exact: false })).toHaveCount(locale === "en" ? 1 : 0);
    await expect.poll(() => sample.requests.at(-1)).toContain("offset=0&issues_only=true&kind=ADDON");
    await expect(next).toBeDisabled();
    await dialog.getByRole("checkbox", { name: only }).uncheck();
    await expect.poll(() => sample.requests.at(-1)).toContain("issues_only=false&kind=ADDON");
    await page.screenshot({ path: info.outputPath(`reconciliation-${locale}.png`), fullPage: true });
    await dialog.getByRole("table").scrollIntoViewIfNeeded();
    await expect(dialog.getByRole("table")).toBeInViewport();
    await expect(dialog.getByRole("button", { name: close, exact: true }).first()).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`reconciliation-rows-${locale}.png`), fullPage: true });
    sample.setFailure(true);
    await dialog.getByRole("button", { name: refresh, exact: true }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("table")).toHaveCount(0);
    sample.setFailure(false);
    await dialog.getByRole("button", { name: refresh, exact: true }).click();
    await expect(dialog.getByRole("table")).toBeVisible();
    await dialog.getByRole("button", { name: close, exact: true }).first().click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
    await page.getByRole("button", { name: open, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(sample.writes).toEqual([]);
  });
}

test("company inventory is available before the first draft", async ({ page }) => {
  const sample = fixture(); await sample.install(page, true);
  await page.addInitScript(() => localStorage.setItem("dimax_locale", "en"));
  await page.goto("/price-lists");
  await expect(page.getByText("No price-list versions yet")).toBeVisible();
  await page.getByRole("button", { name: "Compare current rates", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText("Rate reconciliation · Current company prices");
  await expect(page.getByRole("dialog").getByText("A-101", { exact: true })).toBeVisible();
  expect(sample.requests[0]).toContain("/admin/price-lists/reconciliation?");
  expect(sample.writes).toEqual([]);
});
