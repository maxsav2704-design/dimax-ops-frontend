import { expect, test, type Page } from "@playwright/test";

// Browser contract/visual test only: no operational company or real recipient is modified.
function scenario() {
  const lists = [{ id: "list-1", version: 1, status: "DRAFT", currency: "ILS", reason: "Factory proposal",
    agreement_reference: "QA agreement 42", created_at: "2026-10-02T08:00:00Z", created_by: "qa-owner",
    cancelled_at: null as string | null, cancellation_reason: null as string | null,
    items: [{ kind: "DOOR", target_id: "door-1", name: "Entrance door / Входная дверь", unit: "pcs", installer_price: "250.00" }] }];
  const invitations: Array<{ id: string; price_list_id: string; factory_name: string; recipient_name: string; recipient_email: string;
    created_at: string; expires_at: string; revoked_at: string | null; revocation_reason: string | null; confirmed_at: string | null; confirmed_name: string | null }> = [];
  let linkSequence = 0;
  const unknownWrites: string[] = [];
  const createdRequests = new Map<string, (typeof lists)[number]>();
  return { lists, invitations, unknownWrites, install: async (page: Page, scope = "OWNER") => {
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const headers = { "access-control-allow-origin": request.headers().origin || "http://127.0.0.1:4173",
        "access-control-allow-credentials": "true", "access-control-allow-headers": "Content-Type,Authorization,Accept-Language",
        "access-control-allow-methods": "GET,POST,OPTIONS" };
      const reply = (json: unknown, status = 200) => route.fulfill({ status, headers, json });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (path.endsWith("/auth/me")) return reply({ id: "qa-owner", company_id: "qa-company", role: "ADMIN", admin_scope: scope, can_view_rates: true });
      if (path.endsWith("/price-lists/state")) return reply({ mode: "LEGACY", active_price: null });
      if (path.endsWith("/door-types")) return reply([{ id: "door-1", name: lists[0].items[0].name }]);
      if (path.endsWith("/addons/types")) return reply({ items: [{ id: "addon-1", name: "Adjustment", unit: "hour", is_active: true }] });
      if (path === "/api/v1/admin/price-lists" && request.method() === "POST") {
        const body = request.postDataJSON();
        expect(body).not.toHaveProperty("company_id");
        expect(body).not.toHaveProperty("status");
        if (createdRequests.has(body.request_id)) return reply(createdRequests.get(body.request_id));
        expect(body.expected_latest_version).toBe(lists[0].version);
        const row = { ...lists[0], id: `list-${lists.length + 1}`, version: lists.length + 1, status: "DRAFT",
          reason: body.reason, agreement_reference: body.agreement_reference,
          items: body.items.map((item: { kind: string; target_id: string; installer_price: string }) => ({ ...item,
            name: item.kind === "DOOR" ? lists[0].items[0].name : "Adjustment", unit: item.kind === "DOOR" ? "pcs" : "hour" })) };
        lists.unshift(row); createdRequests.set(body.request_id, row); return reply(row);
      }
      if (path === "/api/v1/admin/price-lists") return reply({ items: lists, total: lists.length, latest_version: lists[0].version });
      const match = path.match(/\/admin\/price-lists\/(list-\d+)(.*)/);
      if (match) {
        const row = lists.find((item) => item.id === match[1])!;
        if (!match[2]) return reply(row);
        if (match[2] === "/approvals" && request.method() === "GET") return reply({ items: invitations.filter((item) => item.price_list_id === row.id), total: invitations.filter((item) => item.price_list_id === row.id).length });
        if (match[2] === "/approvals" && request.method() === "POST") {
          const body = request.postDataJSON();
          const invitation = { ...body, id: `invitation-${++linkSequence}`, price_list_id: row.id, created_at: "2026-10-02T10:00:00Z",
            expires_at: "2099-10-05T10:00:00Z", revoked_at: null, revocation_reason: null, confirmed_at: null, confirmed_name: null };
          invitations.unshift(invitation);
          return reply({ invitation, confirmation_url: `${new URL(page.url()).origin}/price-approval#${"A".repeat(43)}` });
        }
        if (match[2].endsWith("/revoke")) {
          const item = invitations.find((invitation) => match[2].includes(invitation.id))!;
          item.revoked_at = "2026-10-02T11:00:00Z"; item.revocation_reason = request.postDataJSON().reason; return reply(item);
        }
      }
      if (path.includes("/public/price-approvals/")) {
        const row = lists[0], invitation = invitations[0];
        if (path.endsWith("/request-code")) return reply({ status: "QUEUED",
          expires_at: new Date(Date.now() + 600000).toISOString(), resend_after: new Date(Date.now() + 60000).toISOString() });
        if (path.endsWith("/confirm")) {
          const body = request.postDataJSON();
          expect(body.expected_version).toBe(row.version); expect(body.accepted).toBe(true);
          expect(body.verification_code).toBe("123456");
          row.status = "CONFIRMED"; invitation.confirmed_name = body.signer_name; invitation.confirmed_at = "2026-10-02T12:00:00Z";
        }
        return reply({ company_name: "DIMAX QA", ...invitation, ...row, snapshot_hash: "f".repeat(64),
          status: invitation.confirmed_at ? "CONFIRMED" : "PENDING", affects_earnings: false });
      }
      if (request.method() !== "GET") unknownWrites.push(path);
      return reply({ unread_count: 0 });
    });
  } };
}

test("admin draft, revoke, reissue and factory decision", async ({ page, browser }, testInfo) => {
  const fixture = scenario(); await fixture.install(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("dimax_locale", "en");
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => undefined } });
  });
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.goto("/price-lists");
  await expect(page.getByText("Entrance door / Входная дверь")).toBeVisible();
  await page.getByRole("button", { name: "New version", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Change request / reason", { exact: true }).fill("Revised factory proposal");
  await dialog.getByLabel("Installer rate, ILS: Entrance door / Входная дверь", { exact: true }).fill("275,50");
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(fixture.lists[0].items[0].installer_price).toBe("275.50");
  let link = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Create factory link", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Factory", { exact: true }).fill("QA Factory");
    await dialog.getByLabel("Representative", { exact: true }).fill("QA Representative");
    await dialog.getByLabel("Representative email", { exact: true }).fill("factory@example.test");
    await dialog.getByRole("checkbox", { name: /The contact is correct/ }).check();
    await dialog.getByRole("button", { name: "Create link", exact: true }).click();
    await expect(dialog.getByText("Link created, not sent")).toBeVisible();
    link = await dialog.getByLabel("Personal confirmation link").inputValue();
    await dialog.getByRole("button", { name: "Copy link", exact: true }).click();
    await expect(dialog.getByRole("status")).toHaveText("Copied");
    await dialog.getByRole("button", { name: "Close", exact: true }).first().click();
    if (attempt === 0) {
      await page.getByRole("button", { name: "Revoke link: QA Representative", exact: true }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByLabel("Revocation reason").fill("QA contact correction");
      await dialog.getByRole("button", { name: "Confirm action" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
    }
  }
  const factoryContext = await browser.newContext();
  try {
    const factoryPage = await factoryContext.newPage(); await fixture.install(factoryPage);
    await factoryPage.goto(link);
    await factoryPage.getByLabel("Your full name").fill("QA Representative");
    await factoryPage.getByRole("checkbox").check();
    await factoryPage.getByRole("button", { name: "Email verification code", exact: true }).click();
    await expect(factoryPage.getByRole("status")).toBeVisible();
    await factoryPage.locator("#factory-code").fill("123456");
    await factoryPage.getByRole("button", { name: "Confirm prices", exact: true }).click();
    await expect(factoryPage.getByText("Factory confirmation recorded")).toBeVisible();
  } finally { await factoryContext.close(); }
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("Factory confirmed", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Create factory link", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel draft", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("prices-admin-en.png"), fullPage: true });
  expect(fixture.unknownWrites).toEqual([]);
});

for (const [locale, title] of [["ru", "Прайс завода"], ["he", "מחירון מפעל"]] as const) {
  test(`finance read-only ${locale} 390px`, async ({ page }, testInfo) => {
    const fixture = scenario(); await fixture.install(page, "FINANCE");
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.addInitScript((value) => window.localStorage.setItem("dimax_locale", value), locale);
    await page.goto("/price-lists");
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText("Entrance door / Входная дверь")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const content = page.locator("[data-admin-scroll]");
    expect(await content.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    if (locale === "he") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: testInfo.outputPath(`prices-admin-${locale}.png`), fullPage: true });
    expect(fixture.unknownWrites).toEqual([]);
  });
}
