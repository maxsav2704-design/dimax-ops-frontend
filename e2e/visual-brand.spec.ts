import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

const COMPANY_ID = process.env.E2E_COMPANY_ID || "";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@dimax.dev";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin12345";
const INSTALLER_EMAIL = process.env.E2E_INSTALLER_EMAIL || "";
const INSTALLER_PASSWORD = process.env.E2E_INSTALLER_PASSWORD || "";
const ARTIFACT_DIR = process.env.VISUAL_BRAND_ARTIFACT_DIR || "";

type Credentials = {
  email: string;
  password: string;
  nextPath: string;
};

type VisualRoute = {
  name: string;
  path: string;
  marker: RegExp;
  shell: "admin" | "installer";
};

const adminRoutes: VisualRoute[] = [
  { name: "admin-dashboard", path: "/", marker: /Dispatcher Board/i, shell: "admin" },
  { name: "admin-projects", path: "/projects", marker: /Projects/i, shell: "admin" },
  { name: "admin-installers", path: "/installers", marker: /Installers/i, shell: "admin" },
  { name: "admin-documents", path: "/documents", marker: /Documents/i, shell: "admin" },
  { name: "admin-operations", path: "/operations", marker: /Operations Center/i, shell: "admin" },
  { name: "admin-reports", path: "/reports", marker: /Reports/i, shell: "admin" },
  { name: "admin-door-types", path: "/door-types", marker: /Door types/i, shell: "admin" },
  { name: "admin-reasons", path: "/reasons", marker: /Issue reasons/i, shell: "admin" },
];

const installerRoutes: VisualRoute[] = [
  { name: "installer-workspace", path: "/installer", marker: /Installer Workspace/i, shell: "installer" },
  { name: "installer-earnings", path: "/installer/earnings", marker: /Installer earnings/i, shell: "installer" },
  { name: "installer-issues", path: "/installer/issues", marker: /Installer issues/i, shell: "installer" },
  { name: "installer-sync-queue", path: "/installer/sync-queue", marker: /Installer sync queue/i, shell: "installer" },
];

function requireEnv(value: string, label: string) {
  test.skip(!value, `Missing ${label} for visual brand smoke.`);
}

async function setEnglishLocale(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("dimax_locale", "en"));
  await page.evaluate(() => window.localStorage.setItem("dimax_locale", "en"));
}

async function assertNoBlankOrRuntimeError(page: Page) {
  await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => (await page.locator("body").innerText({ timeout: 30_000 })).trim().length, {
      timeout: 60_000,
    })
    .toBeGreaterThan(20);
  const bodyText = (await page.locator("body").innerText({ timeout: 30_000 })).trim();
  expect(bodyText.length).toBeGreaterThan(20);
  expect(bodyText).not.toMatch(/Application error|Unhandled Runtime Error|Internal Server Error/i);
  expect(bodyText).not.toBe('{ "status": "ok" }');
  expect(bodyText).not.toBe('{"status":"ok"}');
}

async function waitForVisualIdle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

async function login(page: Page, credentials: Credentials) {
  await page.context().clearCookies();
  await page.goto(`/login?next=${encodeURIComponent(credentials.nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await setEnglishLocale(page);
  await expect(page.locator(".login-shell")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("DIMAX Admin")).toBeVisible({ timeout: 30_000 });

  await page.locator("#company-id").fill(COMPANY_ID);
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/login") && response.request().method() === "POST",
    { timeout: 120_000 }
  );
  await page.locator('button[type="submit"]').click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 60_000 }).toBe(credentials.nextPath);
}

function artifactPath(testInfo: TestInfo, name: string) {
  if (!ARTIFACT_DIR) {
    return testInfo.outputPath(`${name}.png`);
  }
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  return path.join(ARTIFACT_DIR, `${name}.png`);
}

async function captureFullPageScreenshot(page: Page, screenshotPath: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await page.waitForTimeout(attempt * 500);
      }
    }
  }
  throw lastError;
}

async function captureBrandRoute(page: Page, testInfo: TestInfo, route: VisualRoute) {
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  await waitForVisualIdle(page);
  await assertNoBlankOrRuntimeError(page);
  await expect(page.locator("body")).toContainText(route.marker, { timeout: 60_000 });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 60_000 });

  if (route.shell === "admin") {
    await expect(page.locator(".dmx-app-frame")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".dmx-brand-pill")).toHaveText("DIMAX", { timeout: 30_000 });
  } else {
    await expect(page.getByText("DIMAX Installer")).toBeVisible({ timeout: 30_000 });
  }

  await expect(page.locator(".surface-panel")).toHaveCount(0);
  await expect(page.locator("main .rounded-lg.border").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });

  const screenshotPath = artifactPath(testInfo, route.name);
  await captureFullPageScreenshot(page, screenshotPath);
  const screenshotSize = fs.statSync(screenshotPath).size;
  expect(screenshotSize).toBeGreaterThan(25_000);
}

test.describe.serial("DIMAX visual brand smoke", () => {
  test("login page uses the new brand shell", async ({ page }, testInfo) => {
    requireEnv(COMPANY_ID, "E2E_COMPANY_ID");

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await waitForVisualIdle(page);
    await setEnglishLocale(page);
    await assertNoBlankOrRuntimeError(page);
    await expect(page.locator(".login-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".login-card-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("DIMAX Admin")).toBeVisible({ timeout: 30_000 });

    const screenshotPath = artifactPath(testInfo, "login");
    await captureFullPageScreenshot(page, screenshotPath);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(25_000);
  });

  test("admin pages keep the DIMAX operational shell", async ({ page }, testInfo) => {
    requireEnv(COMPANY_ID, "E2E_COMPANY_ID");

    await login(page, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      nextPath: "/",
    });

    for (const route of adminRoutes) {
      await test.step(route.name, async () => {
        await captureBrandRoute(page, testInfo, route);
      });
    }
  });

  test("installer pages keep the field-work shell", async ({ page }, testInfo) => {
    requireEnv(COMPANY_ID, "E2E_COMPANY_ID");
    requireEnv(INSTALLER_EMAIL, "E2E_INSTALLER_EMAIL");
    requireEnv(INSTALLER_PASSWORD, "E2E_INSTALLER_PASSWORD");

    await login(page, {
      email: INSTALLER_EMAIL,
      password: INSTALLER_PASSWORD,
      nextPath: "/installer",
    });

    for (const route of installerRoutes) {
      await test.step(route.name, async () => {
        await captureBrandRoute(page, testInfo, route);
      });
    }
  });
});
