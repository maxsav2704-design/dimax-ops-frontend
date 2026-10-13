import { expect, test } from "@playwright/test";

const languages = [
  { locale: "en", width: 1280, open: "Review price", heading: "Separate factory approval required",
    selection: "First factory-confirmed list (legacy work)", close: "Close review", prepare: "Prepare a price proposal",
    rate: "Proposed rate (ILS / pcs)", reason: "Reason", agreement: "Factory request / agreement reference",
    evidence: "Execution and assignment evidence", save: "Save proposal, without accrual", saved: "Proposed terms saved",
    factory: "Factory confirmation", send: "Send invitation by email", reasonRevoke: "Reason for revocation", revoke: "Revoke invitation", revoked: "Invitation revoked" },
  { locale: "ru", width: 390, open: "Разобрать цену", heading: "Нужно отдельное подтверждение завода",
    selection: "Первый подтверждённый прайс (старая очередь)", close: "Закрыть проверку", prepare: "Подготовить предложение цены",
    rate: "Предлагаемая ставка (ILS / pcs)", reason: "Причина", agreement: "Запрос / договорённость с заводом",
    evidence: "Подтверждение выполнения и назначения", save: "Сохранить предложение без начисления", saved: "Предложенные условия сохранены",
    factory: "Согласование с заводом", send: "Отправить приглашение на почту", reasonRevoke: "Причина отзыва", revoke: "Отозвать приглашение", revoked: "Приглашение отозвано" },
  { locale: "he", width: 390, open: "בדיקת מחיר", heading: "נדרש אישור נפרד מהמפעל",
    selection: "המחירון המאושר הראשון (תור ישן)", close: "סגירת הבדיקה", prepare: "הכנת הצעת מחיר",
    rate: "תעריף מוצע (ILS / pcs)", reason: "נימוק", agreement: "אסמכתא לבקשה / להסכמה עם המפעל",
    evidence: "ראיות לביצוע ולשיוך המתקין", save: "שמירת הצעה ללא זקיפת שכר", saved: "התנאים המוצעים נשמרו",
    factory: "אישור המפעל", send: "שליחת הזמנה בדוא״ל", reasonRevoke: "סיבת הביטול", revoke: "ביטול הזמנה", revoked: "ההזמנה בוטלה" },
];

for (const t of languages) {
  test(`missing rate requires factory approval and separate accrual ${t.locale} ${t.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    page.setDefaultTimeout(15_000);
    const errors: string[] = [], writes: string[] = [];
    let savedBody: Record<string, unknown> | undefined;
    let invitation: Record<string, unknown> | null = null;
    let accrued = false;
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
      if (path.endsWith("/work-price-approvals/qa-invite/accrual")) {
        const receipt = { id: "qa-decision", completed_work_id: "qa-work", amount: "13.52", accrued_at: "2026-10-14T08:00:00Z", reason: "Independent factory decision checked" };
        if (request.method() === "POST") {
          expect(request.postDataJSON()).toMatchObject({ approval_hash: "b".repeat(64), confirm_accrual: true, reason: receipt.reason });
          expect(request.postDataJSON()).not.toHaveProperty("rate");
          expect(request.postDataJSON()).not.toHaveProperty("amount");
          accrued = true; return reply(receipt);
        }
        return reply({ approval_hash: "b".repeat(64), reference: "QA-101 / floor 2", rate: "9.01", amount: "13.52", currency: "ILS",
          confirmed_name: "QA Representative", confirmed_at: "2026-10-13T10:00:00Z", accrual: accrued ? receipt : null,
          scope: { project_name: "QA project", installer_name: "QA Installer", work_label: "Door adjustment", quantity: "1.50", unit: "pcs",
            missing_price: { performed_at: "2026-10-01T08:00:00Z" } } });
      }
      if (path.endsWith("/factory/contact")) return reply({ id: "approved-contact", factory_name: "QA Factory",
        recipient_name: "QA Representative", recipient_email: "factory@example.org" });
      if (path.endsWith("/invitations/qa-invite/revoke")) { invitation = { ...invitation, revoked_at: "2026-10-13T10:00:00Z" }; return reply(invitation); }
      if (path.endsWith("/invitations")) {
        if (request.method() === "POST") {
          expect(request.postDataJSON()).toMatchObject({ factory_contact_id: "approved-contact", proposal_hash: "f".repeat(64), expires_in_hours: 72 });
          invitation = { id: "qa-invite", recipient_name: "QA Representative", recipient_email: "factory@example.org",
            expires_at: "2099-10-13T10:00:00Z", revoked_at: null, confirmed_at: null, confirmed_name: null, email_outbox_id: "qa-email" };
          return reply(invitation);
        }
        return reply({ total: invitation ? 1 : 0, items: invitation ? [invitation] : [] });
      }
      if (path.endsWith("/work-price-proposals/review")) return reply({ review_token: "a".repeat(64), latest: null,
        scope: { project_name: "QA project", installer_name: "QA Installer", work_label: "Door adjustment",
          quantity: "1.50", unit: "pcs", missing_price: { performed_at: "2026-10-01T08:00:00Z" } } });
      if (path.endsWith("/work-price-proposals")) {
        savedBody = request.postDataJSON();
        return reply({ id: "qa-proposal", version: 1, rate: "9.01", amount: "13.52", created_at: "2026-10-12T09:00:00Z", snapshot_hash: "f".repeat(64) });
      }
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
    await expect(dialog.getByRole("button")).toHaveCount(3); // Close controls and explicit proposal preparation.
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
    expect(writes).toEqual([]);
    await dialog.getByRole("button", { name: t.prepare, exact: true }).click();
    await dialog.getByLabel(t.rate, { exact: true }).fill("9,01");
    await dialog.getByLabel(t.reason, { exact: true }).fill("Missing historical factory price");
    await dialog.getByLabel(t.agreement, { exact: true }).fill("Factory request QA-2026");
    await dialog.getByLabel(t.evidence, { exact: true }).fill("Independent site record QA-100");
    await dialog.getByRole("checkbox").check();
    await expect(dialog.getByText("1.50 × 9.01 = 13.52 ILS", { exact: true })).toBeVisible();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`work-proposal-${t.locale}-form.png`) });
    await dialog.getByRole("button", { name: t.save, exact: true }).click();
    await expect(dialog.getByText(t.saved, { exact: false })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`work-proposal-${t.locale}-saved.png`) });
    expect(savedBody).toMatchObject({ rate: "9.01", confirm_execution_evidence: true });
    expect(savedBody).not.toHaveProperty("amount");
    expect(writes).toEqual(["/api/v1/admin/sync/price-conflicts/sync_queue/qa-unpriced/work-price-proposals/review",
      "/api/v1/admin/sync/price-conflicts/sync_queue/qa-unpriced/work-price-proposals"]);
    await dialog.getByRole("button", { name: t.factory, exact: true }).click();
    await expect(dialog.getByText("factory@example.org", { exact: true })).toBeVisible();
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: t.send, exact: true }).click();
    await expect(dialog.getByRole("button", { name: t.revoke, exact: true })).toBeVisible();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`work-invitation-${t.locale}.png`) });
    await dialog.getByLabel(t.reasonRevoke, { exact: true }).fill("Factory request withdrawn");
    await dialog.getByRole("button", { name: t.revoke, exact: true }).click();
    await expect(dialog.getByText(t.revoked, { exact: true })).toBeVisible();
    expect(writes.slice(2)).toEqual(["/api/v1/admin/sync/work-price-proposals/qa-proposal/invitations",
      "/api/v1/admin/sync/work-price-proposals/qa-proposal/invitations/qa-invite/revoke"]);
    invitation = { id: "qa-invite", recipient_name: "QA Representative", recipient_email: "factory@example.org",
      expires_at: "2099-10-13T10:00:00Z", email_outbox_id: "qa-email", revoked_at: null,
      confirmed_at: "2026-10-13T10:00:00Z", confirmed_name: "QA Representative" };
    const label = (en: string, ru: string, he: string) => t.locale === "ru" ? ru : t.locale === "he" ? he : en;
    await dialog.getByRole("button", { name: label("Check status", "Проверить статус", "בדיקת מצב"), exact: true }).click();
    await dialog.getByRole("button", { name: label("Review accrual", "Проверить начисление", "בדיקת זקיפת שכר"), exact: true }).click();
    const accrual = dialog.getByRole("region", { name: label("Accrual", "Начисление", "זקיפת שכר"), exact: true });
    await accrual.getByLabel(label("Accrual reason", "Основание начисления", "נימוק לזקיפת השכר"), { exact: true }).fill("Independent factory decision checked");
    await expect(accrual.getByRole("checkbox")).not.toBeChecked();
    await accrual.getByRole("checkbox").check();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`work-accrual-${t.locale}.png`) });
    await accrual.getByRole("button", { name: label("Confirm accrual", "Подтвердить начисление", "אישור זקיפת השכר"), exact: true }).click();
    await expect(accrual.getByText(label("Accrual recorded", "Начисление записано", "זקיפת השכר נרשמה"), { exact: true })).toBeVisible();
    await expect(accrual.getByRole("checkbox")).toHaveCount(0);
    expect(writes.filter(path => path.endsWith("/accrual"))).toHaveLength(1);
    await dialog.getByRole("button", { name: t.close, exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
  });
}
