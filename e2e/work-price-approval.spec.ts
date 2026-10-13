import { expect, test } from "@playwright/test";

const token = "A".repeat(43);
const proposal = { company_name: "DIMAX QA", factory_name: "QA Factory", recipient_name: "QA Representative", version: 1,
  currency: "ILS", reason: "Missing historical rate", agreement_reference: "Factory request QA-100", snapshot_hash: "f".repeat(64),
  expires_at: "2099-10-13T10:00:00Z", status: "PENDING", confirmed_at: null, confirmed_name: null, affects_earnings: false,
  items: [{ kind: "ADDON", name: "Door adjustment / Регулировка", unit: "pcs", installer_price: "9.01" }],
  work: { proposal_id: "qa-proposal", project_name: "QA project / Объект", installer_name: "QA Installer", reference: "B-2-201",
    performed_at: "2026-10-01T08:00:00Z", quantity: "1.50", amount: "13.52" } };

for (const [locale, width, title, confirm, recorded] of [
  ["en", 1280, "Price approval for one work", "Confirm this work and price", "Factory confirmation recorded"],
  ["ru", 390, "Согласование цены одной работы", "Подтвердить работу и цену", "Подтверждение завода сохранено"],
  ["he", 390, "אישור מחיר לעבודה אחת", "אישור העבודה והמחיר", "אישור המפעל נשמר"],
] as const) {
  test(`factory confirms one work ${locale} ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("dimax_locale", value), locale);
    const writes: string[] = [], errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/v1/public/price-approvals/**", async route => {
      const request = route.request();
      const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "Content-Type" };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      expect(new URL(request.url()).pathname).toContain("/price-approvals/work/");
      expect(request.postDataJSON().token).toBe(token);
      if (request.url().endsWith("/request-code")) {
        writes.push("code");
        return route.fulfill({ headers, json: { status: "QUEUED", expires_at: new Date(Date.now() + 600000).toISOString(),
          resend_after: new Date(Date.now() + 60000).toISOString() } });
      }
      if (request.url().endsWith("/confirm")) {
        writes.push("confirm");
        expect(request.postDataJSON()).toEqual({ token, expected_version: 1, snapshot_hash: proposal.snapshot_hash,
          signer_name: "QA Representative", accepted: true, verification_code: "123456" });
        return route.fulfill({ headers, json: { ...proposal, status: "CONFIRMED", confirmed_name: "QA Representative", confirmed_at: "2026-10-13T10:00:00Z" } });
      }
      return route.fulfill({ headers, json: proposal });
    });
    await page.goto(`/work-price-approval#${token}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText("B-2-201", { exact: true })).toBeVisible();
    expect(new URL(page.url()).hash).toBe("");
    expect(writes).toEqual([]);
    if (locale === "he") await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`work-approval-${locale}.png`), fullPage: true });
    await page.locator("#factory-signer").fill("QA Representative");
    await page.getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: confirm, exact: true })).toBeDisabled();
    await page.getByRole("button", { name: /Email verification code|Получить код на почту|שליחת קוד בדוא/ }).click();
    await page.locator("#factory-code").fill("123456");
    await page.getByRole("button", { name: confirm, exact: true }).click();
    await expect(page.getByRole("heading", { name: recorded, exact: true })).toBeVisible();
    expect(writes).toEqual(["code", "confirm"]);
    expect(errors).toEqual([]);
  });
}
