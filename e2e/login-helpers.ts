import { expect, type Locator, type Page } from "@playwright/test";

type LoginCredentials = {
  companyId: string;
  email: string;
  password: string;
};

export const LOGIN_RESPONSE_TIMEOUT = 120_000;

export async function fillReadyLoginForm(
  page: Page,
  credentials: LoginCredentials,
  timeout = LOGIN_RESPONSE_TIMEOUT
): Promise<Locator> {
  const form = page.locator('form.login-form[data-login-ready="true"]');
  await expect(form).toBeVisible({ timeout });

  const companyId = form.locator("#company-id");
  const email = form.locator("#email");
  const password = form.locator("#password");
  await expect(companyId).toBeEditable({ timeout });
  await companyId.fill(credentials.companyId);
  await email.fill(credentials.email);
  await password.fill(credentials.password);

  await expect(companyId).toHaveValue(credentials.companyId, { timeout });
  await expect(email).toHaveValue(credentials.email, { timeout });
  await expect(password).toHaveValue(credentials.password, { timeout });

  const submit = form.locator('button[type="submit"]');
  await expect(submit).toBeEnabled({ timeout });
  return submit;
}
