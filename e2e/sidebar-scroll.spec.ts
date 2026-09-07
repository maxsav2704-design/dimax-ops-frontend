import { expect, test } from "@playwright/test";

import { fillReadyLoginForm, LOGIN_RESPONSE_TIMEOUT } from "./login-helpers";

const COMPANY_ID = process.env.E2E_COMPANY_ID || "";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@dimax.dev";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin12345";

test("sidebar remains visible and forwards wheel scrolling to content", async ({
  page,
}) => {
  test.skip(!COMPANY_ID, "E2E_COMPANY_ID is required");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/login");

  const submit = await fillReadyLoginForm(page, {
    companyId: COMPANY_ID,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/login") &&
      response.request().method() === "POST",
    { timeout: LOGIN_RESPONSE_TIMEOUT },
  );
  await submit.click();
  expect((await loginResponse).ok()).toBeTruthy();

  await page.goto("/projects", { waitUntil: "domcontentloaded" });
  const sidebar = page.getByRole("complementary", {
    name: "Admin navigation",
  });
  const content = page.locator("[data-admin-scroll]");
  await expect(sidebar).toBeVisible();
  await expect(content).toBeVisible();
  await expect
    .poll(() =>
      content.evaluate((element) => element.scrollHeight > element.clientHeight),
    )
    .toBe(true);

  const sidebarBefore = await sidebar.boundingBox();
  expect(sidebarBefore).not.toBeNull();

  await sidebar.hover();
  await page.mouse.wheel(0, 480);
  await expect
    .poll(() => content.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  const scrolledTop = await content.evaluate((element) => element.scrollTop);
  const sidebarAfter = await sidebar.boundingBox();

  expect(sidebarAfter?.y).toBeCloseTo(sidebarBefore?.y ?? 0, 0);
  expect(sidebarAfter?.height).toBeCloseTo(sidebarBefore?.height ?? 0, 0);

  await page.mouse.wheel(0, -480);
  await expect
    .poll(() => content.evaluate((element) => element.scrollTop))
    .toBeLessThan(scrolledTop);
});
