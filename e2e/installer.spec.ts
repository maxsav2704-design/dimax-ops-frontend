import { expect, test } from "@playwright/test";

import { fillReadyLoginForm, LOGIN_RESPONSE_TIMEOUT } from "./login-helpers";

const COMPANY_ID =
  process.env.E2E_COMPANY_ID || "1f16d537-5617-4c4b-a944-dafba2bcead9";
const INSTALLER_EMAIL = process.env.E2E_INSTALLER_EMAIL || "";
const INSTALLER_PASSWORD = process.env.E2E_INSTALLER_PASSWORD || "";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const HAS_INSTALLER_CREDENTIALS = Boolean(INSTALLER_EMAIL && INSTALLER_PASSWORD);
const REQUIRE_INSTALLER_CREDENTIALS_IN_CI = process.env.CI === "true";

async function loginInstaller(page) {
  await page.goto("/login");
  const submit = await fillReadyLoginForm(page, {
    companyId: COMPANY_ID,
    email: INSTALLER_EMAIL,
    password: INSTALLER_PASSWORD,
  });

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/login") &&
      response.request().method() === "POST",
    { timeout: LOGIN_RESPONSE_TIMEOUT }
  );

  await submit.click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  const loginBody = (await loginResponse.json()) as { access_token?: string };

  await expect(page).toHaveURL(/\/installer(?:\/)?$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Installer Workspace" })).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => Boolean(window.sessionStorage.getItem("dimax_refresh_token")),
    undefined,
    { timeout: 30_000 }
  );

  expect(loginBody.access_token).toBeTruthy();
  return loginBody.access_token as string;
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
    const exportButton = page.getByRole("button", { name: "Export CSV" });
    await expect(exportButton).toBeVisible({
      timeout: 30_000,
    });
    if (await exportButton.isEnabled()) {
      await exportButton.click();
    }
    await page.getByRole("button", { name: "Today" }).click();
    await page.getByRole("button", { name: "Next 30 days" }).click();

    await page
      .getByRole("link", { name: "Workspace", exact: true })
      .click();
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
    await page
      .getByRole("link", { name: "Workspace", exact: true })
      .click();

    const projectsResponse = await request.get(`${API_BASE_URL}/api/v1/installer/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(projectsResponse.ok()).toBeTruthy();
    const projectsBody = (await projectsResponse.json()) as {
      items: Array<{ id: string; name: string; status: string; waze_url: string | null }>;
    };

    if (!projectsBody.items.length) {
      await expect(page.getByText("No assigned projects yet.")).toBeVisible();
      return;
    }

    const targetProject = projectsBody.items[0];

    const cardScheduleLink = page.locator(
      `a[href="/installer/calendar?project_id=${targetProject.id}"]`
    );
    await expect(cardScheduleLink).toBeVisible({ timeout: 30_000 });
    await cardScheduleLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/installer/calendar\\?project_id=${targetProject.id}$`),
      { timeout: 30_000 }
    );
    await expect(page.getByRole("heading", { name: "My Schedule" })).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole("link", { name: "Workspace", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Installer Workspace" })).toBeVisible({
      timeout: 30_000,
    });

    const projectEarningsLink = page.locator(
      `a[href="/installer/earnings?project_id=${targetProject.id}"]`
    );
    await expect(projectEarningsLink).toBeVisible({ timeout: 30_000 });
    await projectEarningsLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/installer/earnings\\?project_id=${targetProject.id}$`)
    );
    await expect(page.getByRole("heading", { name: "Installer earnings" })).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole("link", { name: "Workspace", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Installer Workspace" })).toBeVisible({
      timeout: 30_000,
    });

    const projectLink = page
      .locator(`a[href="/installer/projects/${targetProject.id}"]`)
      .first();
    await expect(projectLink).toBeVisible({ timeout: 60_000 });
    await expect(projectLink).toHaveAccessibleName(/Open project/i);
    await projectLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/installer/projects/${targetProject.id}$`)
    );
    await expect(
      page.getByRole("heading", { name: "Door filters", exact: true })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#project-doors")).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole("heading", { name: "Add-on fact", exact: true })
    ).toBeVisible({ timeout: 30_000 });
    const projectAction = (name: string) =>
      page
        .getByRole("link", { name, exact: true })
        .or(page.getByRole("button", { name, exact: true }))
        .first();
    await expect(projectAction("Open Waze")).toBeVisible({ timeout: 30_000 });
    await expect(projectAction("Open WhatsApp")).toBeVisible({ timeout: 30_000 });
    await expect(projectAction("Call contact")).toBeVisible({ timeout: 30_000 });

    const problemProject = projectsBody.items.find((project) => project.status === "PROBLEM");
    if (problemProject) {
      await page.goto("/installer");
      const openIssuesLink = page.locator(
        `a[href="/installer/projects/${problemProject.id}?door_filter=WITH_ISSUES&issue_status=BLOCKED#project-open-issues"]`
      );
      if (await openIssuesLink.count()) {
        await openIssuesLink.first().click();
        await expect(page).toHaveURL(
          new RegExp(
            `/installer/projects/${problemProject.id}\\?door_filter=WITH_ISSUES&issue_status=BLOCKED#project-open-issues$`
          )
        );
        await expect(page.locator("#project-open-issues")).toBeVisible({ timeout: 30_000 });
        await expect(page).toHaveURL(/door_filter=WITH_ISSUES/);
        await expect(page).toHaveURL(/issue_status=BLOCKED/);
      }
    }
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
    await expect(page.getByRole("button", { name: "Next 7 days" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByLabel("Event type")).toHaveValue("ALL");
    await expect(page.getByLabel("Project")).toHaveValue("ALL");
  });

  test("supports deep-link workspace filters", async ({ page }) => {
    await loginInstaller(page);

    await page.goto("/installer?project_filter=problem");
    await expect(page.getByRole("heading", { name: "Installer Workspace" })).toBeVisible({
      timeout: 30_000,
    });
    const problemButton = page.getByRole("button", { name: /Only problem \(/ });
    await expect(problemButton).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page).toHaveURL(/project_filter=problem/);

    const activeButton = page.getByRole("button", { name: /Only active \(/ });
    await activeButton.click();
    await expect(page).toHaveURL(/project_filter=active/);
    await expect(activeButton).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await page.getByRole("button", { name: /All \(/ }).click();
    await expect(page).toHaveURL(/\/installer$/);
    await expect(page.getByRole("button", { name: /All \(/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("persists installer locale across navigation and reload", async ({ page }) => {
    await loginInstaller(page);

    await page.getByRole("button", { name: "עב" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("he");

    await page.goto("/installer/calendar");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("dimax_locale")))
      .toBe("he");
  });
});
