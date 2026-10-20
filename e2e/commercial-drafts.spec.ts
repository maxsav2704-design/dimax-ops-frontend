import { expect, test, type Page } from "@playwright/test";

const API = "/api/v1/admin/accounting/contracts";
const contractId = "63982c70-23a7-4ae7-9a23-9c661372c4be";
const owner = "1cac48c4-1b12-43fd-a02e-cab93c669e24";
const door = "f58a8a1d-d80a-458f-9263-b035f135c529";
const ids = ["ccf5a0c4-3142-4826-9c34-9a595b42bcf6", "2f2a3712-5060-485a-bd83-35c750249dc0"];
const baseContract = {
  id: contractId, factory_name: "DIMAX Demo Factory", reference: "DEMO-2026-11",
  reason: "Synthetic acceptance terms", currency: "ILS", status: "DRAFT", is_demo: true,
  created_by: owner, created_at: "2026-10-20T10:00:00Z",
};
const basePrice = {
  id: ids[0], contract_id: contractId, version: 1, status: "DRAFT", proposed_from: "2026-11-10",
  reason: "Test commercial offer", agreement_reference: "DEMO only",
  created_by: owner, created_at: baseContract.created_at, currency: "ILS", vat_basis: "EXCLUSIVE",
  factory_confirmed: false, usable_for_billing: false, is_demo: true,
  items: [{ kind: "INSTALLATION", target_id: door, stage_code: "", name: "Entrance / כניסה / Входная", unit: "pcs", unit_price_ex_vat: "400.00" }],
};
async function fixture(page: Page, { empty = false, scope = "OWNER", unavailable = false } = {}) {
  const contracts = empty ? [] : [structuredClone(baseContract)];
  const versions = empty ? [] : [structuredClone(basePrice)];
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = {
      "access-control-allow-origin": request.headers().origin ?? new URL(page.url()).origin,
      "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    };
    const reply = (json: unknown, status = 200) => route.fulfill({ status, headers, json });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path.endsWith("/auth/me")) return reply({ id: owner, role: "ADMIN", admin_scope: scope, can_view_rates: true });
    if (path.startsWith(API) && unavailable) return reply({ detail: "Not deployed" }, 503);
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      writes.push({ path, body });
      if (path === API) {
        const row = { ...baseContract, factory_name: body.factory_name, reference: body.reference, reason: body.reason };
        contracts.unshift(row); return reply(row);
      }
      if (path === API + "/" + contractId + "/prices") {
        expect(body.expected_latest_version).toBe(versions.length);
        expect(body).not.toHaveProperty("status");
        expect(body).not.toHaveProperty("is_demo");
        const row = { ...basePrice, ...body, id: ids[versions.length], version: versions.length + 1,
          items: body.items.map((line: Record<string, string>) => ({ ...line, name: basePrice.items[0].name, unit: "pcs" })) };
        versions.unshift(row); return reply(row);
      }
      return reply({ detail: "Unexpected write blocked by fixture" }, 500);
    }
    if (path === API) return reply({ items: contracts, total: contracts.length });
    if (path === API + "/" + contractId + "/prices") return reply({ items: versions, total: versions.length, latest_version: versions.length });
    if (path.startsWith(API + "/" + contractId + "/prices/")) return reply(versions.find((item) => path.endsWith("/" + item.id)));
    if (path.endsWith("/door-types")) return reply([{ id: door, name: basePrice.items[0].name }]);
    if (path.endsWith("/addons/types")) return reply({ items: [] });
    return reply({ unread_count: 0 });
  });
  return { writes, versions, contracts };
}

for (const [locale, title, width] of [
  ["ru", "Расчёты с заводом", 1440], ["he", "התחשבנות עם המפעל", 768], ["en", "Factory settlements", 390],
] as const) {
  test("commercial layout " + locale, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await fixture(page);
    await page.addInitScript((language) => localStorage.setItem("dimax_locale", language), locale);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/factory-accounting");
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Entrance/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath("commercial-" + locale + ".png"), fullPage: true });
    if (width < 600) {
      await page.getByRole("cell", { name: /Entrance/ }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("cell", { name: /Entrance/ })).toBeInViewport();
      await page.screenshot({ path: info.outputPath("commercial-table-" + locale + ".png") });
    }
    const newVersion = locale === "ru" ? "Новая версия прайса" : locale === "he" ? "גרסת מחירון חדשה" : "New price version";
    await page.getByRole("button", { name: newVersion }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath("editor-" + locale + ".png") });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator("[data-dimax-overlay]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("empty contract to two immutable commercial price drafts", async ({ page }) => {
  const state = await fixture(page, { empty: true });
  await page.addInitScript(() => localStorage.setItem("dimax_locale", "en"));
  await page.goto("/factory-accounting");
  await page.getByRole("button", { name: "New contract" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Factory", { exact: true }).fill("DIMAX Demo Factory");
  await dialog.getByLabel("Contract reference").fill("DEMO-2026-11");
  await dialog.getByLabel("Preparation reason").fill("Synthetic terms");
  await dialog.getByRole("button", { name: "Save draft" }).click();
  await expect(dialog).toBeHidden();
  for (const amount of ["400,50", "410"]) {
    await page.getByRole("button", { name: "New price version" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Proposed start date").fill("2026-11-10");
    await dialog.getByLabel("Agreement reference").fill("DEMO only");
    await dialog.getByLabel("Change reason").fill("Test offer " + amount);
    if (state.versions.length === 0) {
      await dialog.getByLabel("Select work").selectOption(door);
      await dialog.getByRole("button", { name: "Add line" }).click();
    }
    await dialog.getByLabel("DIMAX price, ILS excl. VAT: " + basePrice.items[0].name).fill(amount);
    await dialog.getByRole("button", { name: "Save draft" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("combobox", { name: "Price versions" })).toHaveValue(ids[state.versions.length - 1]);
  }
  await page.getByRole("combobox", { name: "Price versions" }).selectOption(ids[0]);
  await expect(page.getByRole("cell", { name: "400.50 ILS", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(3);
  expect(state.versions[0].items[0].unit_price_ex_vat).toBe("410.00");
  expect(state.versions[1].items[0].unit_price_ex_vat).toBe("400.50");
});

test("unavailable backend never offers draft creation", async ({ page }) => {
  const state = await fixture(page, { unavailable: true });
  await page.addInitScript(() => localStorage.setItem("dimax_locale", "en"));
  await page.goto("/factory-accounting");
  await expect(page.getByRole("alert").filter({ hasText: "service is unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New contract" })).toBeDisabled();
  expect(state.writes).toEqual([]);
});
