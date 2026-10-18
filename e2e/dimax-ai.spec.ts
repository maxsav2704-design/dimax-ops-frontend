import { expect, test } from "@playwright/test";

// Browser contract/visual checks with mocked HTTP only; no real provider/company writes.
for (const locale of ["ru", "he"] as const) {
  test(`DIMAX AI question and sources ${locale} at 390px`, async ({ page }, testInfo) => {
    const queries: unknown[] = [];
    let savedTask: Record<string, unknown> | null = null;
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.addInitScript((value) => window.localStorage.setItem("dimax_locale", value), locale);
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const headers = { "access-control-allow-origin": request.headers().origin || "http://127.0.0.1:4191",
        "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
        "access-control-allow-methods": "GET,POST,OPTIONS" };
      const reply = (json: unknown) => route.fulfill({ headers, json });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (path.endsWith("/auth/me")) return reply({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
      if (path.endsWith("/ai/status")) return reply({ ready: true, reason: "ready", tools: ["project_summary"], read_only: true });
      if (path.endsWith("/ai/conversations")) return reply({ items: savedTask ? [
        { id: "qa-conversation", title: savedTask.message, created_at: savedTask.created_at, updated_at: savedTask.updated_at },
      ] : [], has_more: false });
      if (path.endsWith("/ai/conversations/qa-conversation/tasks")) return reply({ items: savedTask ? [savedTask] : [], has_more: false });
      if (path.endsWith("/ai/tasks")) {
        queries.push(request.postDataJSON());
        savedTask = { ...request.postDataJSON(), id: "qa-run", conversation_id: "qa-conversation", status: "COMPLETED",
          attempt_count: 1, error_code: null, created_at: "2026-10-09T09:00:00Z", updated_at: "2026-10-09T09:00:01Z",
          reply: { run_id: "qa-run", answer: locale === "ru" ? "По записям системы: 12 позиций, 2 открытых замечания." : "לפי רשומות המערכת: 12 פריטים ו-2 ליקויים פתוחים.",
          sources: [{ kind: "project", id: "qa-project", label: "DIMAX / בניין 3", path: "/projects?project_id=qa-project" }],
          tools_used: ["project_summary"], provider_requests: 2, read_only: true } };
        return reply(savedTask);
      }
      return reply({ items: [], unread_count: 0 });
    });
    await page.goto("/ai");
    await expect(page.getByRole("heading", { name: "DIMAX AI", exact: true })).toBeVisible();
    await page.getByLabel(locale === "ru" ? "Задача или вопрос" : "משימה או שאלה").fill(locale === "ru" ? "Что осталось на объекте?" : "מה נותר בפרויקט?");
    await page.getByRole("button", { name: locale === "ru" ? "Спросить DIMAX AI" : "שאל את DIMAX AI", exact: true }).click();
    await expect(page.getByRole("link", { name: "DIMAX / בניין 3", exact: true })).toHaveAttribute("href", "/projects?project_id=qa-project");
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({ locale });
    await page.reload();
    await expect(page.getByRole("link", { name: "DIMAX / בניין 3", exact: true })).toBeVisible();
    await expect(page.getByLabel(locale === "ru" ? "Диалог" : "שיחה")).toHaveValue("qa-conversation");
    expect(queries).toHaveLength(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect(await page.locator("[data-admin-scroll]").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    if (locale === "he") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: testInfo.outputPath(`dimax-ai-${locale}.png`), fullPage: true });
  });
}

test("DIMAX AI recovers a lost acknowledgement with the same request", async ({ page }) => {
  const sent: { request_id: string; message: string }[] = [];
  let saved: Record<string, unknown> | null = null;
  await page.addInitScript(() => localStorage.setItem("dimax_locale", "ru"));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = { "access-control-allow-origin": request.headers().origin || "http://127.0.0.1:4191",
      "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
      "access-control-allow-methods": "GET,POST,OPTIONS" };
    const reply = (json: unknown) => route.fulfill({ headers, json });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path.endsWith("/auth/me")) return reply({ role: "ADMIN", admin_scope: "OWNER" });
    if (path.endsWith("/ai/status")) return reply({ ready: true, reason: "ready", tools: [], read_only: true });
    if (path.endsWith("/ai/conversations")) return reply({ items: saved ? [{ id: "recovered-chat", title: "Состояние объекта" }] : [], has_more: false });
    if (path.endsWith("/ai/conversations/recovered-chat/tasks")) return reply({ items: saved ? [saved] : [], has_more: false });
    if (path.endsWith("/ai/tasks")) {
      sent.push(request.postDataJSON());
      saved = { ...request.postDataJSON(), id: "saved-run", conversation_id: "recovered-chat", status: "COMPLETED",
        attempt_count: 1, error_code: null, created_at: "2026-10-09T09:00:00Z", updated_at: "2026-10-09T09:00:01Z",
        reply: { run_id: "saved-run", answer: "Сохранённый результат восстановлен", sources: [], tools_used: [], provider_requests: 1, read_only: true } };
      if (sent.length === 1) return route.abort("failed");
      return reply(saved);
    }
    return reply({ items: [], unread_count: 0 });
  });
  await page.goto("/ai");
  await page.getByLabel("Задача или вопрос").fill("Состояние объекта");
  await page.getByRole("button", { name: "Спросить DIMAX AI", exact: true }).click();
  await page.getByRole("button", { name: "Проверить тот же запрос", exact: true }).click();
  await expect(page.getByText("Сохранённый результат восстановлен", { exact: true })).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[0]).toEqual(sent[1]);
});
