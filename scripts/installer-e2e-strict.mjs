#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_ENV_VARS = [
  "E2E_COMPANY_ID",
  "E2E_INSTALLER_EMAIL",
  "E2E_INSTALLER_PASSWORD",
  "NEXT_PUBLIC_API_BASE_URL",
];

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

function mergeEnv(fileEnv) {
  const merged = { ...process.env };
  for (const [key, value] of Object.entries(fileEnv)) {
    if (!merged[key] || String(merged[key]).trim() === "") {
      merged[key] = value;
    }
  }
  return merged;
}

const args = parseArgs(process.argv.slice(2));
const skipAuthCheck = args.skipAuthCheck;
const checkAuthOnly = args.checkAuthOnly;

if (args.help) {
  console.log("Strict installer e2e runner");
  console.log("Required env vars:");
  for (const key of REQUIRED_ENV_VARS) {
    console.log(`- ${key}`);
  }
  console.log("Usage:");
  console.log("  node scripts/installer-e2e-strict.mjs");
  console.log("  node scripts/installer-e2e-strict.mjs --check-auth-only");
  console.log("  node scripts/installer-e2e-strict.mjs --skip-auth-check");
  console.log("  node scripts/installer-e2e-strict.mjs --env-path .env.e2e.local");
  process.exit(0);
}

function validateEnvOrExit(env) {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = env[key];
    return !value || !String(value).trim();
  });

  if (missing.length > 0) {
    console.error(
      `Missing required env vars for strict installer e2e: ${missing.join(", ")}`
    );
    process.exit(1);
  }
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

async function validateInstallerCredentialsOrExit(env) {
  const baseUrl = String(env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/u, "");
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company_id: env.E2E_COMPANY_ID,
      email: env.E2E_INSTALLER_EMAIL,
      password: env.E2E_INSTALLER_PASSWORD,
    }),
  }).catch((error) => {
    console.error(
      `Installer auth precheck failed to reach API: ${error instanceof Error ? error.message : "unknown error"}`
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
      `Installer auth precheck failed: ${response?.status || "unknown"} ${response?.statusText || ""}${suffix}`
    );
    process.exit(1);
  }
}

const envFilePath = args.envPath ? path.resolve(process.cwd(), args.envPath) : "";
if (envFilePath && !fs.existsSync(envFilePath)) {
  console.error(`Env file not found: ${args.envPath}`);
  process.exit(1);
}
const fileEnv = loadEnvFile(envFilePath);
const mergedEnv = mergeEnv(fileEnv);

const env = {
  ...mergedEnv,
  CI: "true",
};

validateEnvOrExit(env);

if (!skipAuthCheck) {
  await validateInstallerCredentialsOrExit(env);
}

if (checkAuthOnly) {
  console.log("Installer auth precheck passed.");
  process.exit(0);
}

runOrExit("npm", ["run", "build"], env);
runOrExit("node", ["./node_modules/@playwright/test/cli.js", "test", "e2e/installer.spec.ts"], env);
