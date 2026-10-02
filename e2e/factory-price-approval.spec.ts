import { expect, test } from "@playwright/test";

const token = "A".repeat(43);
const payload = {
  company_name: "DIMAX QA", factory_name: "QA Factory", recipient_name: "QA Representative", version: 3,
  currency: "ILS", reason: "Factory offer / Предложение завода", agreement_reference: "QA-2026-10-02",
  items: [
    { kind: "DOOR", name: "Входная дверь / Entrance door", unit: "pcs", installer_price: "250.00" },
    { kind: "ADDON", name: "Регулировка / Adjustment", unit: "hour", installer_price: "9.00" },
  ],
  status: "PENDING", snapshot_hash: "f".repeat(64), expires_at: "2026-12-01T10:00:00Z",
  confirmed_at: null, confirmed_name: null, affects_earnings: false,
};

for (const [locale, width, title, button, confirmation] of [
  ["en", 1280, "Price confirmation", "Confirm prices", "Factory confirmation recorded"],
  ["ru", 360, "Согласование прайса", "Подтвердить расценки", "Подтверждение завода сохранено"],
  ["he", 360, "אישור מחירון", "אישור התעריפים", "אישור המפעל נשמר"],
] as const) {
  test(`factory approval ${locale} ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((value) => window.localStorage.setItem("dimax_locale", value), locale);
    let confirmations = 0;
    await page.route("**/api/v1/public/price-approvals/**", async (route) => {
      const request = route.request();
      const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "Content-Type" };
      if (request.method() === "OPTIONS") { await route.fulfill({ status: 204, headers }); return; }
      const body = request.postDataJSON();
      expect(body.token).toBe(token);
      if (request.url().endsWith("/confirm")) {
        confirmations++;
        expect(body).toEqual({ token, expected_version: 3, snapshot_hash: payload.snapshot_hash,
          signer_name: "QA Representative", accepted: true });
        await route.fulfill({ headers, json: { ...payload, status: "CONFIRMED", confirmed_name: body.signer_name,
          confirmed_at: "2026-10-02T12:00:00Z" } });
      } else { await route.fulfill({ headers, json: payload }); }
    });
    await page.goto(`/price-approval#${token}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText("Входная дверь / Entrance door")).toBeVisible();
    expect(new URL(page.url()).hash).toBe("");
    expect(confirmations).toBe(0);
    await expect(page.getByRole("button", { name: button, exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    if (locale === "he") await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: testInfo.outputPath(`price-${locale}.png`), fullPage: true });
    await page.locator("#factory-signer").fill("QA Representative");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.getByRole("heading", { name: confirmation, exact: true })).toBeVisible();
    expect(confirmations).toBe(1);
  });
}
