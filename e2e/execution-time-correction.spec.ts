import { expect, test } from "@playwright/test";

// Browser contract only. Real authorization, transactions and price selection are backend integration tests.
const languages = [
  { locale: "en", width: 1280, open: "Review price", date: "Date and time", offset: "UTC offset at execution",
    evidence: "Evidence reference", check: "Check corrected date", reason: "Decision reason", accrue: "Record work: 250.00 ILS",
    success: "Work recorded", close: "Close review" },
  { locale: "ru", width: 390, open: "Разобрать цену", date: "Дата и время", offset: "Смещение UTC на дату работы",
    evidence: "Подтверждающий документ / запись", check: "Проверить исправленную дату", reason: "Причина решения", accrue: "Учесть работу: 250.00 ILS",
    success: "Работа учтена", close: "Закрыть проверку" },
  { locale: "he", width: 390, open: "בדיקת מחיר", date: "תאריך ושעה", offset: "הפרש UTC במועד הביצוע",
    evidence: "אסמכתא לראיות", check: "בדיקת המועד המתוקן", reason: "נימוק להחלטה", accrue: "רישום עבודה: 250.00 ILS",
    success: "העבודה נרשמה", close: "סגירת הבדיקה" },
];

for (const t of languages) {
  test(`execution time correction ${t.locale} ${t.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);
    let accruals = 0;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const original = { id: "qa-time", project_name: "QA project", installer_name: "QA Installer", work_label: "A-101",
      performed_at: null, received_at: "2026-10-12T09:00:00Z", quantity: "1", seen_price_list_id: null,
      seen_version: null, seen_version_status: "MISSING", analysis_code: "MISSING_EXECUTION_TIME",
      preview_amount: null, applicable_quote: null, resolution_available: false, time_correction_available: true, review_token: null };
    const correction = { performed_at: "2026-10-12T08:00:00.000Z", evidence_reference: "QA site work record 2026-42" };
    await page.setViewportSize({ width: t.width, height: 900 });
    await page.addInitScript((locale) => localStorage.setItem("dimax_locale", locale), t.locale);
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const headers = { "access-control-allow-origin": request.headers().origin || "*",
        "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
        "access-control-allow-methods": "GET,POST,OPTIONS" };
      const reply = (json: unknown) => route.fulfill({ headers, json });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (path.endsWith("/auth/me")) return reply({ id: "qa-owner", company_id: "qa-company", role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
      if (path.endsWith("/sync/health/summary")) return reply({ max_cursor: 0,
        counts: { ok: 0, warn: 0, danger: 1, total: 1, dead: 0, never_seen: 0, danger_pct: 100, problem_total: accruals ? 0 : 1 },
        alerts_sent: 0, top_laggers: [], top_offline: [] });
      if (path.endsWith("/sync/problems")) return reply({ total: accruals ? 0 : 1, items: accruals ? [] : [{
        source: "sync_queue", id: original.id, status: "CONFLICT", installer_id: "qa-installer", installer_name: "QA Installer",
        user_id: "qa-user", problem_code: "CONFLICT_FACTORY_PRICE", error: "CONFLICT_FACTORY_PRICE",
        retry_allowed: false, manual_review_required: true, payload: {}, created_at: original.received_at,
      }] });
      if (path.endsWith("/execution-review")) {
        expect(request.method()).toBe("POST"); expect(request.postDataJSON()).toEqual(correction);
        return reply({ ...original, analysis_code: "EXECUTION_TIME_CORRECTION", execution_correction: correction,
          resolution_available: true, requires_execution_evidence: true, review_token: "a".repeat(64), preview_amount: "250.00",
          applicable_quote: { version: 1, rate: "250.00", currency: "ILS", unit: "pcs",
            effective_from: "2026-10-10T00:00:00Z", selection: "AT_EXECUTION" } });
      }
      if (path.endsWith("/resolve")) {
        expect(request.method()).toBe("POST");
        expect(request.postDataJSON()).toEqual({ request_id: expect.any(String), review_token: "a".repeat(64),
          execution_correction: correction, confirm_execution_evidence: true, reason: "Verified execution and assignment in site record" });
        accruals++;
        return reply({ id: "qa-decision", completed_work_id: "qa-work", amount: "250.00", resolved_at: "2026-10-12T10:00:00Z" });
      }
      if (path.includes("/price-conflicts/")) return reply(original);
      if (path.endsWith("/outbox/summary")) return reply({ failed_total: 0, pending_overdue_15m: 0, by_channel: {}, by_delivery_status: {} });
      expect(request.method()).toBe("GET");
      return reply({ items: [], total: 0, unread_count: 0 });
    });
    await page.goto("/operations");
    await page.getByRole("button", { name: t.open, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: t.check })).toBeDisabled();
    await dialog.getByLabel(t.date, { exact: true }).fill("2026-10-12T11:00");
    await dialog.getByLabel(t.offset, { exact: true }).selectOption("+03:00");
    await dialog.getByLabel(t.evidence, { exact: true }).fill(correction.evidence_reference);
    await dialog.getByRole("button", { name: t.check }).click();
    const submit = dialog.getByRole("button", { name: t.accrue, exact: true });
    await expect(submit).toBeDisabled();
    expect(accruals).toBe(0);
    if (t.locale === "he") await expect(dialog).toHaveAttribute("dir", "rtl");
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(t.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    await page.screenshot({ path: testInfo.outputPath(`correction-${t.locale}-top.png`) });
    await dialog.getByLabel(t.reason, { exact: true }).fill("Verified execution and assignment in site record");
    await dialog.getByRole("checkbox").check();
    await submit.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`correction-${t.locale}-decision.png`) });
    await submit.click();
    await expect(dialog.getByRole("heading", { name: t.success, exact: true })).toBeVisible();
    expect(accruals).toBe(1); expect(errors).toEqual([]);
    await dialog.getByRole("button", { name: t.close, exact: true }).click();
    await expect(dialog).toBeHidden();
  });
}
