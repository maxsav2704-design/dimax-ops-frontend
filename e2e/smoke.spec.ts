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
      response.url().includes("/api/v1/auth/login") && response.request().method() === "POST",
    { timeout: 60_000 }
  );
  await page.locator('button[type="submit"]').click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  const loginBody = (await loginResponse.json()) as { access_token?: string };
  expect(loginBody.access_token).toBeTruthy();
  await page.waitForFunction(
    () => Boolean(window.sessionStorage.getItem("dimax_refresh_token")),
    undefined,
    { timeout: 60_000 }
  );
  if (/\/login(?:\?|$)/.test(page.url())) {
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
    } catch {
      // Client-side redirect can race with manual navigation in Next.js.
    }
  }
  await expect(page).toHaveURL(/\/$/, { timeout: 60_000 });
  await expect(page.getByText("Dispatcher Board")).toBeVisible({ timeout: 60_000 });
  return loginBody.access_token as string;
}

async function createProject(request, token: string, suffix: string) {
  const response = await request.post(`${API_BASE_URL}/api/v1/admin/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      code: `E2E-${suffix.slice(-6)}`,
      name: `E2E Smoke ${suffix}`,
      address: `Herzl 14 Ashdod ${suffix}`,
      address_street: "Herzl",
      address_building: "14",
      address_city: "Ashdod",
      address_entrance: "B",
      address_lat: 31.801,
      address_lng: 34.643,
      developer_company: "DIMAX E2E",
      contact_name: "E2E Admin",
      contact_phone: "+972500000999",
      developer_whatsapp: "+972500000999",
      contact_email: "e2e@dimax.dev",
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return {
    id: String(body.id),
    code: `E2E-${suffix.slice(-6)}`,
    name: `E2E Smoke ${suffix}`,
  };
}

test.describe("Public entry smoke", () => {
  test("welcome preserves locale into secure login routes", async ({ page }) => {
    await page.goto("/welcome", { waitUntil: "networkidle" });

    await expect(page.locator("a[href=\"/login\"]").first()).toBeVisible();
    await expect(page.locator("a[href=\"/login?next=/installer\"]").first()).toBeVisible();

    const localeButtons = page.locator("button[title]");
    await expect(localeButtons).toHaveCount(3);

    await localeButtons.nth(1).click();
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("ru");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.lang))
      .toBe("ru");

    await page.locator("a[href=\"/login\"]").first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("ru");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.lang))
      .toBe("ru");

    await page.goto("/welcome", { waitUntil: "networkidle" });
    await page.locator("button[title]").nth(2).click();
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("he");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.lang))
      .toBe("he");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dir))
      .toBe("rtl");

    await page.locator("a[href=\"/login?next=/installer\"]").first().click();
    await expect(page).toHaveURL(/\/login\?next=(%2Finstaller|\/installer)$/);
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("he");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.lang))
      .toBe("he");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dir))
      .toBe("rtl");

    await page.locator('button[title="English"]:visible').first().click();
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("en");
    await page.reload({ waitUntil: "networkidle" });
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("en");
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.lang))
      .toBe("en");
  });
});

test.describe.serial("Admin web smoke", () => {
  test("login, project import analyze, calendar create event, reports open", async ({
    page,
    request,
  }) => {
    test.setTimeout(300_000);

    const suffix = String(Date.now());
    const token = await login(page);
    await page.evaluate(() => window.localStorage.setItem("dimax_locale", "en"));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("en");
    const project = await createProject(request, token, suffix);

    await test.step("Projects import analyze", async () => {
      await page.getByRole("link", { name: "Projects" }).click();
      await expect(page).toHaveURL(/\/projects$/, { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({
        timeout: 45_000,
      });

      await page.getByPlaceholder("Search project...").fill(project.name);
      await page.locator("button").filter({ hasText: project.name }).first().click();
      await expect(page.getByRole("heading", { name: "Project Financial Screen" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Waze" })).toHaveAttribute(
        "href",
        /https:\/\/waze\.com\/ul\?ll=31\.8010*,34\.6430*&navigate=yes/
      );
      await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
        "href",
        new RegExp(`^https://wa\\.me/972500000999\\?text=.*${project.code}`)
      );
      await expect(page.getByRole("link", { name: "Call" })).toHaveAttribute(
        "href",
        "tel:+972500000999"
      );
      await expect(page.getByText("Contact: E2E Admin")).toBeVisible();

      const csv = [
        "\uFEFF\u05de\u05e1\u05e4\u05e8 \u05d4\u05d6\u05de\u05e0\u05d4,\u05d1\u05e0\u05d9\u05d9\u05df,\u05e7\u05d5\u05de\u05d4,\u05d3\u05d9\u05e8\u05d4,\u05d3\u05d2\u05dd \u05db\u05e0\u05e3,door_type,qty",
        `AZ-${suffix},A,9,905,D-905,entrance,1`,
      ].join("\n");

      await page.locator('input[type="file"]').setInputFiles({
        name: "factory_manifest_he.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv, "utf-8"),
      });
      const mappingProfileSelect = page.getByLabel("Mapping profile: auto_v1");
      await expect(
        mappingProfileSelect.locator('option[value="factory_he_v1"]')
      ).toHaveCount(1, { timeout: 30_000 });
      await mappingProfileSelect.selectOption("factory_he_v1");
      await page.getByLabel("Delimiter: auto").selectOption(",");

      await page.getByRole("button", { name: "Analyze" }).click();
      await expect(page.getByText("Import data summary:")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Project structure preview:")).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole("cell", { name: `AZ-${suffix}`, exact: true })
      ).toBeVisible();
    });

    await test.step("Calendar create event", async () => {
      const eventTitle = `E2E Calendar ${suffix}`;

      await page.getByRole("link", { name: "Calendar" }).click();
      await expect(
        page.getByRole("heading", { name: "Calendar", exact: true })
      ).toBeVisible();
      await page.getByRole("button", { name: "Add Event" }).click();
      await page.getByLabel("Title", { exact: true }).fill(eventTitle);
      await page.getByLabel("Location", { exact: true }).fill("Ashdod Tower A");
      await page
        .getByLabel("Project", { exact: true })
        .selectOption({ label: project.name });
      await page.getByLabel("Description", { exact: true }).fill("E2E smoke event");
      const createEventResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/admin/calendar/events") &&
          response.request().method() === "POST",
        { timeout: 30_000 }
      );
      await page.getByRole("button", { name: "Create Event" }).click();
      const createEventResponse = await createEventResponsePromise;
      expect(createEventResponse.ok()).toBeTruthy();

      const weekStart = new Date();
      const dayOfWeek = weekStart.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const refreshedCalendarResponse = await request.get(
        `${API_BASE_URL}/api/v1/admin/calendar/events?starts_at=${encodeURIComponent(weekStart.toISOString())}&ends_at=${encodeURIComponent(weekEnd.toISOString())}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      expect(refreshedCalendarResponse.ok()).toBeTruthy();
      const refreshedCalendarBody = (await refreshedCalendarResponse.json()) as {
        items?: Array<{ title?: string }>;
      };
      expect(refreshedCalendarBody.items?.some((event) => event.title === eventTitle)).toBeTruthy();

      await page.goto("/calendar", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Calendar", exact: true })
      ).toBeVisible({ timeout: 30_000 });
    });

    await test.step("Reports open", async () => {
      await page.getByRole("link", { name: "Reports" }).click();
      await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
      await expect(page.getByText("Project Plan vs Fact", { exact: true })).toBeVisible();
      await expect(page.getByText("Risk Concentration", { exact: true })).toBeVisible();
    });

    await test.step("Operations center opens", async () => {
      await page.getByRole("link", { name: "Operations" }).click();
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
      const actionableToggle = page.getByRole("button", {
        name: /Only actionable|Только действия|רק פעולות/,
      });
      await expect(page.locator("h1").first()).toBeVisible();
      await actionableToggle.click();
      await expect(actionableToggle).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(/\/operations\?actionable=1$/, { timeout: 30_000 });

      await page.reload({ waitUntil: "networkidle" });
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(actionableToggle).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(/\/operations\?actionable=1$/, { timeout: 30_000 });

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

      await page.locator('a[href="/reports"]').first().click();
      await expect(page).toHaveURL(/\/reports$/, { timeout: 30_000 });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => page.locator("main").innerText())
        .not.toContain("Top Failing Projects");
      await expect
        .poll(async () => page.locator("main").innerText())
        .not.toContain("Operations SLA");

      await page.locator('a[href="/operations"]').first().click();
      await expect(page).toHaveURL(/\/operations(?:\?actionable=1)?$/, {
        timeout: 30_000,
      });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => page.locator("main").innerText())
        .not.toContain("Webhook Signals");
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
        .toBe("ru");
      await expect
        .poll(async () => page.evaluate(() => document.documentElement.lang))
        .toBe("ru");
    });
  });
});
