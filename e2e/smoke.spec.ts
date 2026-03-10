import { expect, test } from "@playwright/test";

const COMPANY_ID = process.env.E2E_COMPANY_ID || "";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@dimax.dev";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin12345";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

async function login(page) {
  await page.goto("/login");
  await page.evaluate(() => window.localStorage.setItem("dimax_locale", "en"));
  await page.reload({ waitUntil: "networkidle" });
  const inputs = page.locator("input");
  await inputs.nth(0).click();
  await inputs.nth(0).pressSequentially(COMPANY_ID);
  await inputs.nth(1).click();
  await inputs.nth(1).pressSequentially(ADMIN_EMAIL);
  await inputs.nth(2).click();
  await inputs.nth(2).pressSequentially(ADMIN_PASSWORD);
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/login") &&
      response.request().method() === "POST",
    { timeout: 30_000 }
  );
  await page
    .locator("button")
    .filter({ hasText: /Sign In|Signing In|Войти|Вход|התחבר|מתחבר/ })
    .first()
    .click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  await page.waitForFunction(
    () => Boolean(window.localStorage.getItem("dimax_access_token")),
    undefined,
    { timeout: 30_000 }
  );
  if (/\/login(?:\?|$)/.test(page.url())) {
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
    } catch {
      // Client-side redirect can race with manual navigation in Next.js.
    }
  }
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(page.getByText("Dispatcher Board")).toBeVisible({ timeout: 30_000 });

  const token = await page.evaluate(() => window.localStorage.getItem("dimax_access_token"));
  expect(token).toBeTruthy();
  return token as string;
}

async function createProject(request, token: string, suffix: string) {
  const response = await request.post(`${API_BASE_URL}/api/v1/admin/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      name: `E2E Smoke ${suffix}`,
      address: `Ashdod Site ${suffix}`,
      developer_company: "DIMAX E2E",
      contact_name: "E2E Admin",
      contact_phone: "+972500000999",
      contact_email: "e2e@dimax.dev",
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return {
    id: String(body.id),
    name: `E2E Smoke ${suffix}`,
  };
}

test.describe.serial("Admin web smoke", () => {
  test("login, project import analyze, calendar create event, reports open", async ({
    page,
    request,
  }) => {
    const suffix = String(Date.now());
    const token = await login(page);
    await page.evaluate(() => window.localStorage.setItem("dimax_locale", "en"));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("en");
    const project = await createProject(request, token, suffix);

    await test.step("Projects import analyze", async () => {
      await page.goto("/projects");
      await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

      await page.getByPlaceholder("Search project...").fill(project.name);
      await page.locator("button").filter({ hasText: project.name }).first().click();
      await expect(page.getByRole("heading", { name: "Project Financial Screen" })).toBeVisible();

      const csv = [
        "\uFEFF\u05de\u05e1\u05e4\u05e8 \u05d4\u05d6\u05de\u05e0\u05d4,\u05d1\u05e0\u05d9\u05d9\u05df,\u05e7\u05d5\u05de\u05d4,\u05d3\u05d9\u05e8\u05d4,\u05d3\u05d2\u05dd \u05db\u05e0\u05e3,qty",
        `AZ-${suffix},A,1,11,D-11,1`,
      ].join("\n");

      await page.locator('input[type="file"]').setInputFiles({
        name: "factory_manifest_he.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv, "utf-8"),
      });
      await page.locator("select").nth(2).selectOption("factory_he_v1");
      await page.locator("select").nth(3).selectOption(",");

      await page.getByRole("button", { name: "Analyze" }).click();
      await expect(page.getByText("Import data summary:")).toBeVisible();
      await expect(page.getByText("Project structure preview:")).toBeVisible();
      await expect(page.getByText(`AZ-${suffix}`)).toBeVisible();
    });

    await test.step("Calendar create event", async () => {
      const eventTitle = `E2E Calendar ${suffix}`;

      await page.goto("/calendar");
      await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
      await page.getByRole("button", { name: "Add Event" }).click();
      await page.getByLabel("Title").fill(eventTitle);
      await page.getByLabel("Location").fill("Ashdod Tower A");
      await page.getByLabel("Project").selectOption({ label: project.name });
      await page.getByLabel("Description").fill("E2E smoke event");
      const createEventResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/admin/calendar/events") &&
          response.request().method() === "POST",
        { timeout: 30_000 }
      );
      await page.getByRole("button", { name: "Create Event" }).click();
      const createEventResponse = await createEventResponsePromise;
      expect(createEventResponse.ok()).toBeTruthy();
      await page.goto("/calendar");
      await expect(page.getByText(eventTitle)).toBeVisible({ timeout: 30_000 });
    });

    await test.step("Reports open", async () => {
      await page.goto("/reports");
      await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
      await expect(page.getByText("Project Plan vs Fact", { exact: true })).toBeVisible();
      await expect(page.getByText("Risk Concentration", { exact: true })).toBeVisible();
    });

    await test.step("Operations center opens", async () => {
      await page.goto("/operations");
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: /Only actionable|Только действия|רק פעולות/,
        })
      ).toBeVisible();
      await expect(page.locator('a[href="/projects?only_failed_runs=1"]').first()).toBeVisible();
      await expect(
        page.locator('a[href="/reports?focus=operations&ops_preset=failed-imports"]').first()
      ).toBeVisible();
      await expect(
        page.locator('a[href="/reports?focus=delivery&ops_preset=delivery-risk"]').first()
      ).toBeVisible();
      await expect(
        page.locator('a[href="/reports?focus=issues&ops_preset=issue-pressure"]').first()
      ).toBeVisible();
      await expect(page.locator('a[href="/journal"]').first()).toBeVisible();
      await expect(page.locator('a[href="/installers"]').first()).toBeVisible();
    });

    await test.step("Operations center deep-link actionable filter", async () => {
      await page.goto("/operations?actionable=1");
      const actionableToggle = page.getByRole("button", {
        name: /Only actionable|Только действия|רק פעולות/,
      });
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(actionableToggle).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(/\/operations\?actionable=1$/);

      await actionableToggle.click();
      await expect(actionableToggle).toHaveAttribute("aria-pressed", "false");
      await expect(page).toHaveURL(/\/operations$/);
    });

    await test.step("Admin locale persists across reports and operations", async () => {
      await page.getByRole("button", { name: /RU|Русский/ }).click();
      await expect
        .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
        .toBe("ru");
      await expect
        .poll(async () => page.evaluate(() => document.documentElement.lang))
        .toBe("ru");

      await page.goto("/reports", { waitUntil: "networkidle" });
      await expect
        .poll(async () => page.locator("body").innerText())
        .not.toContain("Top Failing Projects");
      await expect
        .poll(async () => page.locator("body").innerText())
        .not.toContain("Operations SLA");

      await page.goto("/operations", { waitUntil: "networkidle" });
      await expect
        .poll(async () => page.locator("body").innerText())
        .not.toContain("Webhook Signals");
      await page.reload({ waitUntil: "networkidle" });
      await expect
        .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
        .toBe("ru");
      await expect
        .poll(async () => page.evaluate(() => document.documentElement.lang))
        .toBe("ru");
    });
  });
});
