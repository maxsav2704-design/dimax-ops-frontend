#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_ENV_VARS = ["E2E_COMPANY_ID", "NEXT_PUBLIC_API_BASE_URL"];
const DEFAULT_ADMIN_EMAIL = "admin@dimax.dev";
const DEFAULT_ADMIN_PASSWORD = "admin12345";
const DEFAULT_DEVICE_ID = "e2e-admin-web-smoke";
const DEFAULT_PREVIEW_SEED_PATH = path.resolve(process.cwd(), ".preview-seed.json");

function parseArgs(argv) {
  const result = {
    help: false,
    skipAuthCheck: false,
    checkAuthOnly: false,
    envPath: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--skip-auth-check") {
      result.skipAuthCheck = true;
    } else if (arg === "--check-auth-only") {
      result.checkAuthOnly = true;
    } else if (arg === "--env-path") {
      result.envPath = argv[index + 1] || "";
      index += 1;
    }
  }

  return result;
}

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function loadPreviewSeed(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function applyPreviewSeed(env, previewSeed) {
  if (!previewSeed || typeof previewSeed !== "object") {
    return;
  }

  const companyId = typeof previewSeed.company_id === "string" ? previewSeed.company_id.trim() : "";
  if (companyId) {
    env.E2E_COMPANY_ID = companyId;
  }

  const apiBaseUrl =
    typeof previewSeed.api_base_url === "string" ? previewSeed.api_base_url.trim() : "";
  if (apiBaseUrl) {
    env.NEXT_PUBLIC_API_BASE_URL = apiBaseUrl;
  }

  const previewUrl = typeof previewSeed.preview_url === "string" ? previewSeed.preview_url.trim() : "";
  if (previewUrl) {
    env.PLAYWRIGHT_BASE_URL = previewUrl;
  }

  const adminEmail =
    typeof previewSeed?.admin?.email === "string" ? previewSeed.admin.email.trim() : "";
  if (adminEmail) {
    env.E2E_ADMIN_EMAIL = adminEmail;
  }

  const adminPassword =
    typeof previewSeed?.admin?.password === "string" ? previewSeed.admin.password.trim() : "";
  if (adminPassword) {
    env.E2E_ADMIN_PASSWORD = adminPassword;
  }
}

function mergeEnv(fileEnv, previewSeed) {
  const merged = { ...fileEnv };
  applyPreviewSeed(merged, previewSeed);

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.trim() !== "") {
      merged[key] = value;
    }
  }

  if (!merged.E2E_ADMIN_EMAIL) {
    merged.E2E_ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;
  }
  if (!merged.E2E_ADMIN_PASSWORD) {
    merged.E2E_ADMIN_PASSWORD = DEFAULT_ADMIN_PASSWORD;
  }
  if (!merged.E2E_DEVICE_ID) {
    merged.E2E_DEVICE_ID = DEFAULT_DEVICE_ID;
  }
  return merged;
}

function shouldReuseExistingWebServer(env) {
  return Boolean(String(env.PLAYWRIGHT_BASE_URL || "").trim());
}

function validateEnvOrExit(env) {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = env[key];
    return !value || !String(value).trim();
  });

  if (missing.length > 0) {
    console.error(`Missing required env vars for admin smoke: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function hasReusableAccessToken(env) {
  return Boolean(String(env.E2E_ADMIN_ACCESS_TOKEN || "").trim());
}

function runOrExit(command, commandArgs, env) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
}

async function validateAdminCredentialsOrExit(env) {
  const baseUrl = String(env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/u, "");
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company_id: env.E2E_COMPANY_ID,
      email: env.E2E_ADMIN_EMAIL,
      password: env.E2E_ADMIN_PASSWORD,
      device_id: env.E2E_DEVICE_ID,
    }),
  }).catch((error) => {
    console.error(
      `Admin auth precheck failed to reach API: ${error instanceof Error ? error.message : "unknown error"}`
    );
    process.exit(1);
  });

  if (!response || !response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error?.message || body?.detail || "";
    } catch {
      // ignore body parse errors
    }
    const suffix = detail ? ` (${detail})` : "";
    console.error(
      `Admin auth precheck failed: ${response?.status || "unknown"} ${response?.statusText || ""}${suffix}`
    );
    process.exit(1);
  }

  const body = await response.json().catch(() => ({}));
  const accessToken = typeof body?.access_token === "string" ? body.access_token : "";
  if (!accessToken) {
    console.error("Admin auth precheck succeeded but access_token is missing.");
    process.exit(1);
  }
  return accessToken;
}

const args = parseArgs(process.argv.slice(2));
const skipAuthCheck = args.skipAuthCheck;
if (args.help) {
  console.log("Admin smoke runner");
  console.log("Required env vars:");
  for (const key of REQUIRED_ENV_VARS) {
    console.log(`- ${key}`);
  }
  console.log("Optional env vars:");
  console.log(`- E2E_ADMIN_EMAIL (default: ${DEFAULT_ADMIN_EMAIL})`);
  console.log(`- E2E_ADMIN_PASSWORD (default: ${DEFAULT_ADMIN_PASSWORD})`);
  console.log(`- E2E_DEVICE_ID (default: ${DEFAULT_DEVICE_ID})`);
  console.log("- E2E_ADMIN_ACCESS_TOKEN (reuse a known-good token and skip the extra login precheck)");
  console.log("Usage:");
  console.log("  node scripts/admin-e2e-smoke.mjs --env-path .env.e2e.local");
  console.log("  node scripts/admin-e2e-smoke.mjs --check-auth-only --env-path .env.e2e.local");
  console.log("  node scripts/admin-e2e-smoke.mjs --skip-auth-check --env-path .env.e2e.local");
  process.exit(0);
}

const envFilePath = args.envPath ? path.resolve(process.cwd(), args.envPath) : "";
if (envFilePath && !fs.existsSync(envFilePath)) {
  console.error(`Env file not found: ${args.envPath}`);
  process.exit(1);
}

const env = mergeEnv(loadEnvFile(envFilePath), loadPreviewSeed(DEFAULT_PREVIEW_SEED_PATH));
validateEnvOrExit(env);
if (args.checkAuthOnly && hasReusableAccessToken(env)) {
  console.log("Reusing existing E2E_ADMIN_ACCESS_TOKEN for admin smoke.");
} else if (args.checkAuthOnly && !skipAuthCheck) {
  env.E2E_ADMIN_ACCESS_TOKEN = await validateAdminCredentialsOrExit(env);
}

if (args.checkAuthOnly) {
  console.log("Admin auth precheck passed.");
  process.exit(0);
}

if (!shouldReuseExistingWebServer(env)) {
  runOrExit("npm", ["run", "build"], env);
}
runOrExit("node", ["./node_modules/@playwright/test/cli.js", "test", "e2e/smoke.spec.ts"], env);
