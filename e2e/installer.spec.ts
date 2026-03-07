import { expect, test } from "@playwright/test";

const COMPANY_ID =
  process.env.E2E_COMPANY_ID || "1f16d537-5617-4c4b-a944-dafba2bcead9";
const INSTALLER_EMAIL = process.env.E2E_INSTALLER_EMAIL || "";
const INSTALLER_PASSWORD = process.env.E2E_INSTALLER_PASSWORD || "";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const HAS_INSTALLER_CREDENTIALS = Boolean(INSTALLER_EMAIL && INSTALLER_PASSWORD);
const REQUIRE_INSTALLER_CREDENTIALS_IN_CI = process.env.CI === "true";

async function loginInstaller(page) {
  await page.goto("/login");
  await page.getByLabel("Company ID").fill(COMPANY_ID);
  await page.getByLabel("Email").fill(INSTALLER_EMAIL);
  await page.getByLabel("Password").fill(INSTALLER_PASSWORD);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/login") &&
      response.request().method() === "POST",
    { timeout: 30_000 }
  );

  await page.getByRole("button", { name: "Sign In" }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();

  await page.waitForFunction(
    () => Boolean(window.localStorage.getItem("dimax_access_token")),
    undefined,
    { timeout: 30_000 }
  );

  await expect(page).toHaveURL(/\/installer(?:\/)?$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Installer Workspace" })).toBeVisible({
    timeout: 30_000,
  });

  const token = await page.evaluate(() => window.localStorage.getItem("dimax_access_token"));
  expect(token).toBeTruthy();
  return token as string;
}

test.describe.serial("Installer web smoke", () => {
  test.beforeAll(() => {
    if (!HAS_INSTALLER_CREDENTIALS && REQUIRE_INSTALLER_CREDENTIALS_IN_CI) {
      throw new Error(
        "Missing E2E_INSTALLER_EMAIL/E2E_INSTALLER_PASSWORD in CI for installer smoke."
      );
    }
  });

  test.skip(
    !HAS_INSTALLER_CREDENTIALS,
    "Set E2E_INSTALLER_EMAIL and E2E_INSTALLER_PASSWORD to run installer smoke."
  );

  test("login and open installer workspace", async ({ page, request }) => {
    const token = await loginInstaller(page);

    await page.getByRole("link", { name: "Schedule" }).click();
    await expect(page.getByRole("heading", { name: "My Schedule" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "Export CSV" }).click();
    await page.getByRole("button", { name: "Today" }).click();
    await page.getByRole("button", { name: "Next 30 days" }).click();

    await page.getByRole("link", { name: "Workspace" }).click();
    await expect(page.getByRole("heading", { name: "Installer Workspace" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "Today tasks" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("link", { name: "Open overdue tasks" }).click();
    await expect(page).toHaveURL(/\/installer\/calendar(?:\?.*)?$/, {
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/overdue=1/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "My Schedule" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("link", { name: "Workspace" }).click();

    const projectsResponse = await request.get(`${API_BASE_URL}/api/v1/installer/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(projectsResponse.ok()).toBeTruthy();
    const projectsBody = (await projectsResponse.json()) as {
      items: Array<{ id: string; name: string }>;
    };

    if (!projectsBody.items.length) {
      await expect(page.getByText("No assigned projects yet.")).toBeVisible();
      return;
    }

    const targetProject = projectsBody.items[0];

    const cardScheduleLink = page.locator('a[href^="/installer/calendar?project_id="]').first();
    await expect(cardScheduleLink).toBeVisible({ timeout: 30_000 });
    await cardScheduleLink.click();
    await expect(page).toHaveURL(/\/installer\/calendar\?project_id=/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "My Schedule" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("link", { name: "Workspace" }).click();
    await expect(page.getByRole("heading", { name: "Installer Workspace" })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(`/installer/projects/${targetProject.id}`);
    await expect(page.getByText("Door filters")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Add-on fact")).toBeVisible({ timeout: 30_000 });
  });

  test("supports deep-link schedule filters", async ({ page }) => {
    await loginInstaller(page);

    await page.goto(
      "/installer/calendar?preset=today&project_id=none&overdue=1&event_type=unknown_ci_probe"
    );
    await expect(page.getByRole("heading", { name: "My Schedule" })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByRole("button", { name: "Today" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByRole("button", { name: "Overdue only" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByLabel("Project")).toHaveValue("NONE");
    await expect(page.getByLabel("Event type")).toHaveValue("unknown_ci_probe");
    await expect(page).toHaveURL(/project_id=none/);
    await expect(page).toHaveURL(/overdue=1/);
    await expect(page).toHaveURL(/preset=today/);
    await expect(page).toHaveURL(/event_type=unknown_ci_probe/);

    await page.getByRole("button", { name: "Overdue only" }).click();
    await expect(page.getByRole("button", { name: "Overdue only" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await expect(page).not.toHaveURL(/overdue=1/);

    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(page).toHaveURL(/\/installer\/calendar$/);
    await expect(page.getByLabel("Range", { exact: true })).toHaveValue("7d");
    await expect(page.getByLabel("Event type")).toHaveValue("ALL");
    await expect(page.getByLabel("Project")).toHaveValue("ALL");
  });
});
