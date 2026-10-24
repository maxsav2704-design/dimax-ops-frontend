import { expect, test } from "@playwright/test";
import { fillReadyLoginForm } from "../e2e/login-helpers";

const api = "http://127.0.0.1:18089";
const base = "/api/v1/admin/outbox/recovery";
const password = "Synthetic-CI-only-42!";
const locales = [
  { locale: "en", title: "Mail reconciliation", open: "Open review", reason: "Reason", confirm: "Confirm", commandCheck: "I confirm this recovery action.",
    release: "Resume queue", review: "Review", decision: "Decision", evidence: "Evidence reference", check: "I checked the message, recipient and evidence.",
    save: "Record decision", time: "Provider acceptance time", offset: "UTC offset", history: "Decision history", close: "Close", released: "Queue released" },
  { locale: "ru", title: "Сверка писем", open: "Открыть сверку", reason: "Основание решения", confirm: "Подтвердить", commandCheck: "Подтверждаю это действие восстановления.",
    release: "Возобновить очередь", review: "Проверить", decision: "Решение", evidence: "Ссылка на подтверждение", check: "Я проверил письмо, получателя и подтверждение.",
    save: "Зафиксировать решение", time: "Время принятия провайдером", offset: "Смещение UTC", history: "Журнал решений", close: "Закрыть", released: "Очередь возобновлена" },
  { locale: "he", title: "בדיקת הודעות", open: "פתיחת בדיקה", reason: "נימוק", confirm: "אישור", commandCheck: "אני מאשר את פעולת השחזור.",
    release: "חידוש התור", review: "בדיקה", decision: "החלטה", evidence: "אסמכתה", check: "בדקתי את ההודעה, הנמען והאסמכתה.",
    save: "שמירת החלטה", time: "מועד הקבלה אצל הספק", offset: "הפרש מ-UTC", history: "יומן החלטות", close: "סגירה", released: "התור חודש" },
] as const;

for (const [index, labels] of locales.entries()) {
  test(`real recovery ${labels.locale}: owner, decisions, release, history and layout`, async ({ page, request }, info) => {
    expect(process.env.DIMAX_RECOVERY_UI_TEST).toBe("synthetic-only");
    const companyId = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const errors: string[] = [], businessWrites: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", req => {
      const path = new URL(req.url()).pathname;
      if (req.method() === "POST" && path.startsWith("/api/v1/") && !path.startsWith(base) && !path.startsWith("/api/v1/auth/")) businessWrites.push(path);
    });
    await page.setViewportSize({ width: labels.locale === "en" ? 1366 : 390, height: 900 });
    await page.addInitScript(locale => localStorage.setItem("dimax_locale", locale), labels.locale);
    await page.goto("/login?next=%2Foperations%2Frecovery");
    const login = await fillReadyLoginForm(page, { companyId, email: "owner@example.com", password });
    await login.click();
    await expect(page.getByRole("heading", { name: labels.title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: labels.open, exact: true }).click();
    let dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: labels.confirm, exact: true })).toBeDisabled();
    await dialog.getByLabel(labels.reason, { exact: true }).fill("Synthetic restore: provider logs checked");
    await dialog.getByLabel(labels.commandCheck, { exact: true }).check();
    await dialog.getByRole("button", { name: labels.confirm, exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: labels.release, exact: true })).toBeDisabled();

    const opsLogin = await request.post(api + "/api/v1/auth/login", { data: { company_id: companyId, email: "operations@example.com", password, device_id: `synthetic-ops-${index}` } });
    expect(opsLogin.status()).toBe(200);
    const opsHeaders = { Authorization: `Bearer ${(await opsLogin.json()).access_token}` };
    expect((await request.post(api + base + "/release", { headers: opsHeaders, data: { reason: "Forbidden synthetic release" } })).status()).toBe(403);
    const foreignLogin = await request.post(api + "/api/v1/auth/login", { data: { company_id: `00000000-0000-4000-8000-${String(index === 0 ? 2 : 1).padStart(12, "0")}`, email: "owner@example.com", password, device_id: `synthetic-foreign-${index}` } });
    expect(foreignLogin.status()).toBe(200);
    const foreignHeaders = { Authorization: `Bearer ${(await foreignLogin.json()).access_token}` };
    const itemsResponse = await request.get(api + base + "/items", { headers: opsHeaders });
    expect(itemsResponse.status()).toBe(200);
    const items: { id: string; outbox_id: string }[] = await itemsResponse.json();
    expect(items).toHaveLength(3);
    expect((await request.get(api + `/api/v1/admin/outbox/${items[0].outbox_id}`, { headers: foreignHeaders })).status()).toBe(404);

    for (const action of ["HOLD", "RETRY", "ACCEPTED"]) {
      const row = page.getByRole("row").filter({ hasText: `Synthetic ${action}` });
      await row.getByRole("button", { name: labels.review, exact: true }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByRole("combobox", { name: labels.decision, exact: true }).selectOption(action);
      await dialog.getByLabel(labels.reason, { exact: true }).fill(`Synthetic evidence checked: ${action}`);
      await dialog.getByLabel(labels.evidence, { exact: true }).fill(`TRACE-${action}`);
      if (action === "ACCEPTED") {
        await dialog.getByLabel(labels.time, { exact: true }).fill("2020-01-01T10:30");
        await dialog.getByRole("combobox", { name: labels.offset, exact: true }).selectOption("+02:00");
      }
      await dialog.getByLabel(labels.check, { exact: true }).check();
      await expect(dialog.getByRole("button", { name: labels.close, exact: true })).toBeInViewport();
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      if (action === "ACCEPTED") await page.screenshot({ path: info.outputPath(`decision-${labels.locale}.png`), fullPage: true });
      const response = page.waitForResponse(res => res.url().includes(base + "/items/") && res.request().method() === "POST");
      await dialog.getByRole("button", { name: labels.save, exact: true }).click();
      expect((await response).status()).toBe(200);
      await expect(dialog).toBeHidden();
      await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
    }
    await expect(page.getByRole("button", { name: labels.release, exact: true })).toBeEnabled();
    await page.getByRole("button", { name: labels.release, exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(labels.reason, { exact: true }).fill("Synthetic reconciliation complete; HOLD remains blocked");
    await dialog.getByLabel(labels.commandCheck, { exact: true }).check();
    await dialog.getByRole("button", { name: labels.confirm, exact: true }).click();
    await expect(page.getByRole("heading", { name: labels.released, exact: true })).toBeVisible();
    const status = await request.get(api + base, { headers: opsHeaders });
    expect(await status.json()).toMatchObject({ state: "RELEASED", unresolved: 0, held: 1 });
    expect(await page.getByRole("table").evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
    await expect(page.getByText("Synthetic HOLD", { exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`queue-${labels.locale}.png`), fullPage: true });

    await page.getByRole("row").filter({ hasText: "Synthetic ACCEPTED" }).getByRole("button", { name: labels.review, exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: labels.save, exact: true })).toHaveCount(0);
    await page.getByRole("dialog").getByRole("button", { name: labels.close, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("tab", { name: labels.history, exact: true }).click();
    await expect(page.getByRole("tabpanel").getByRole("article")).toHaveCount(3);
    await page.getByRole("tab", { name: labels.history, exact: true }).press("Home");
    await expect(page.getByRole("table")).toBeVisible();
    if (labels.locale === "he") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(businessWrites).toEqual([]);
    expect(errors).toEqual([]);
  });
}
