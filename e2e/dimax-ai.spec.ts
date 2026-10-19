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
    await expect(page.getByLabel(locale === "ru" ? "Диалог" : "שיחה", { exact: true })).toHaveValue("qa-conversation");
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

// Agent step 3 (2026-10-19): a proposal card is confirmed once; the deep-link context reaches the request.
for (const [locale, width] of [["ru", 1280], ["he", 390]] as const) {
  test(`DIMAX AI proposal card confirmed once ${locale} at ${width}px`, async ({ page }, testInfo) => {
    const PROJECT = "1f16d537-5617-4c4b-a944-dafba2bcead9";
    const confirms: { request_id: string }[] = [];
    let sentBody: Record<string, unknown> | null = null;
    const proposal = {
      id: "qa-proposal", task_id: "qa-run", conversation_id: "qa-conversation", tool_name: "propose_issue_report", status: "PROPOSED",
      arguments: { door_id: "d1", title: "Нет доступа", details: null, priority: "P2" },
      preview: { entity: { kind: "door", id: "d1", label: "B-3-800", path: `/projects?project_id=${PROJECT}&focus_section=doors` },
        summary: { project: "DIMAX / בניין 3", door: "B-3-800", mode: "new" },
        before: { door_status: "NOT_INSTALLED", issue_status: null, issue_title: null },
        after: { door_status: "ISSUE_OPEN", issue_status: "OPEN", title: "Нет доступа", details: null, priority: "P2", workflow_state: "NEW" } },
      expected: { door_version: 3, issue_id: null }, result: null, error_code: null,
      expires_at: "2026-10-19T10:00:00Z", decided_at: null, executed_at: null, created_at: "2026-10-19T09:00:00Z", updated_at: "2026-10-19T09:00:00Z",
    };
    let savedTask: Record<string, unknown> | null = null;
    await page.setViewportSize({ width, height: 1200 });
    if (locale === "he") await page.emulateMedia({ reducedMotion: "reduce" });
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
      if (path.endsWith("/ai/status")) return reply({ ready: true, reason: "ready", tools: ["project_summary", "propose_issue_report"], read_only: true,
        provider: "mock", actions_enabled: true, real_model_verified: false });
      if (path.endsWith("/ai/conversations")) return reply({ items: savedTask ? [{ id: "qa-conversation", title: "Нет доступа", created_at: "2026-10-19T09:00:00Z", updated_at: "2026-10-19T09:00:00Z" }] : [], has_more: false });
      if (path.endsWith("/ai/conversations/qa-conversation/tasks")) return reply({ items: savedTask ? [savedTask] : [], has_more: false });
      if (path.endsWith("/ai/proposals/qa-proposal/confirm")) {
        confirms.push(request.postDataJSON());
        return reply({ ...proposal, status: "EXECUTED", executed_at: "2026-10-19T09:05:00Z",
          result: { result: { issue_id: "i1", issue_status: "OPEN", workflow_state: "NEW", priority: "P2", door_status: "ISSUE_OPEN", door_version: 4 },
            sources: [{ kind: "issue", id: "i1", label: "Нет доступа", path: "/issues?issue_id=i1" }] } });
      }
      if (path.endsWith("/ai/tasks")) {
        sentBody = request.postDataJSON();
        savedTask = { ...sentBody, id: "qa-run", conversation_id: "qa-conversation", status: "COMPLETED", attempt_count: 1, error_code: null,
          created_at: "2026-10-19T09:00:00Z", updated_at: "2026-10-19T09:00:01Z", proposals: [proposal],
          reply: { run_id: "qa-run", answer: locale === "ru" ? "Подготовлено предложение; ничего не сохранено." : "הוכנה הצעה; דבר לא נשמר.",
            sources: [{ kind: "project", id: PROJECT, label: "DIMAX / בניין 3", path: `/projects?project_id=${PROJECT}` }],
            tools_used: ["project_summary", "list_project_doors", "propose_issue_report"], provider_requests: 3, read_only: true, provider: "mock",
            steps: [{ tool: "project_summary", ok: true, ms: 9 }, { tool: "list_project_doors", ok: true, ms: 14 }, { tool: "propose_issue_report", ok: true, ms: 11 }],
            proposal_ids: ["qa-proposal"] } };
        return reply(savedTask);
      }
      return reply({ items: [], unread_count: 0 });
    });
    await page.goto(`/ai?context=project:${PROJECT}&q=${encodeURIComponent(locale === "ru" ? "Нет доступа на B-3-800, поставь замечание" : "אין גישה ל-B-3-800, רשום ליקוי")}`);
    await expect(page.getByTestId("dimax-ai-context")).toBeVisible();
    await page.getByRole("button", { name: locale === "ru" ? "Спросить DIMAX AI" : "שאל את DIMAX AI", exact: true }).click();
    const card = page.getByTestId("dimax-ai-proposal");
    await expect(card).toHaveAttribute("data-status", "PROPOSED");
    expect(sentBody).toMatchObject({ locale, context: { kind: "project", id: PROJECT } });
    await page.screenshot({ path: testInfo.outputPath(`dimax-ai-proposal-${locale}.png`), fullPage: true });
    await page.getByTestId("dimax-ai-proposal-review").click();
    const dialog = page.getByTestId("dimax-ai-confirm");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: locale === "ru" ? "Подтвердить" : "אשר", exact: true }).click();
    await expect(card).toHaveAttribute("data-status", "EXECUTED");
    await expect(card.getByRole("link", { name: "Нет доступа", exact: true })).toHaveAttribute("href", "/issues?issue_id=i1");
    expect(confirms).toHaveLength(1);
    expect(confirms[0].request_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    if (locale === "he") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: testInfo.outputPath(`dimax-ai-executed-${locale}.png`), fullPage: true });
  });
}

// Installer cabinet (2026-10-19): the same workspace on /installer/ai through the installer API; admins are refused there.
test("DIMAX AI installer cabinet workspace he at 390px", async ({ page }, testInfo) => {
  const PROJECT = "1f16d537-5617-4c4b-a944-dafba2bcead9";
  const calls: string[] = [];
  let savedTask: Record<string, unknown> | null = null;
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.addInitScript(() => window.localStorage.setItem("dimax_locale", "he"));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = { "access-control-allow-origin": request.headers().origin || "http://127.0.0.1:4191",
      "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
      "access-control-allow-methods": "GET,POST,OPTIONS" };
    const reply = (json: unknown) => route.fulfill({ headers, json });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path.includes("/ai/")) calls.push(path);
    if (path.endsWith("/auth/me")) return reply({ role: "INSTALLER", admin_scope: null });
    if (path.endsWith("/installer/ai/status")) return reply({ ready: true, reason: "ready", tools: ["my_projects"], read_only: true, provider: "mock", actions_enabled: true, real_model_verified: false });
    if (path.endsWith("/installer/ai/conversations")) return reply({ items: savedTask ? [{ id: "inst-conv", title: "x", created_at: "2026-10-19T09:00:00Z", updated_at: "2026-10-19T09:00:00Z" }] : [], has_more: false });
    if (path.endsWith("/installer/ai/conversations/inst-conv/tasks")) return reply({ items: savedTask ? [savedTask] : [], has_more: false });
    if (path.endsWith("/installer/ai/tasks")) {
      const body = request.postDataJSON();
      savedTask = { ...body, id: "inst-run", conversation_id: "inst-conv", status: "COMPLETED", attempt_count: 1, error_code: null,
        created_at: "2026-10-19T09:00:00Z", updated_at: "2026-10-19T09:00:01Z", proposals: [],
        reply: { run_id: "inst-run", answer: "לפי הרשומות שלך: 3 פריטים לא הושלמו.", sources: [{ kind: "project", id: PROJECT, label: "בניין 1", path: `/installer/projects/${PROJECT}` }],
          tools_used: ["my_project_summary", "my_project_doors"], provider_requests: 2, read_only: true, provider: "mock",
          steps: [{ tool: "my_project_summary", ok: true, ms: 4 }, { tool: "my_project_doors", ok: true, ms: 9 }], proposal_ids: [] } };
      return reply(savedTask);
    }
    return reply({ items: [], unread_count: 0 });
  });
  await page.goto(`/installer/ai?context=project:${PROJECT}`);
  await expect(page.getByRole("heading", { name: "DIMAX AI", exact: true })).toBeVisible();
  await expect(page.getByTestId("dimax-ai-context")).toBeVisible();
  // The client-side status text proves hydration; the pre-rendered HTML alone would drop the typed text.
  await expect(page.getByText("ספק הדגמה", { exact: false }).first()).toBeVisible();
  await page.getByLabel("משימה או שאלה").fill("אילו מהפריטים שלי לא הושלמו?");
  await page.getByRole("button", { name: "שאל את DIMAX AI", exact: true }).click();
  await expect(page.getByRole("link", { name: "בניין 1", exact: true })).toHaveAttribute("href", `/installer/projects/${PROJECT}`);
  expect(calls.every((path) => path.includes("/installer/ai/"))).toBeTruthy();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("dimax-ai-installer-he.png"), fullPage: true });
});
