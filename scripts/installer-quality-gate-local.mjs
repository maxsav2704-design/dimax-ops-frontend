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
  const args = {
    help: false,
    check: false,
    checkAuth: false,
    envFile: ".env.e2e.local",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg === "--check-auth") {
      args.checkAuth = true;
    } else if (arg === "--env-file") {
      args.envFile = argv[index + 1] || args.envFile;
      index += 1;
    }
  }
  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
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

function missingVars(env) {
  return REQUIRED_ENV_VARS.filter((key) => {
    const value = env[key];
    return !value || !String(value).trim();
  });
}

function runCommand(command, args, env) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function printHelp() {
  console.log("Installer local quality-gate runner");
  console.log("Usage:");
  console.log("  node scripts/installer-quality-gate-local.mjs");
  console.log("  node scripts/installer-quality-gate-local.mjs --check");
  console.log("  node scripts/installer-quality-gate-local.mjs --check-auth");
  console.log("  node scripts/installer-quality-gate-local.mjs --env-file .env.e2e.local");
  console.log("Required env vars:");
  for (const key of REQUIRED_ENV_VARS) {
    console.log(`- ${key}`);
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const envFilePath = path.resolve(process.cwd(), args.envFile);
const fileEnv = loadEnvFile(envFilePath);
const env = mergeEnv(fileEnv);
const missing = missingVars(env);
if (missing.length > 0) {
  console.error(
    `Missing required env vars for installer local quality-gate: ${missing.join(", ")}`
  );
  console.error(
    `Provide vars in shell or create ${args.envFile} from .env.e2e.example`
  );
  process.exit(1);
}

if (args.check) {
  console.log("Installer e2e environment is valid.");
  process.exit(0);
}

if (args.checkAuth) {
  runCommand("node", ["scripts/installer-e2e-strict.mjs", "--check-auth-only"], env);
  process.exit(0);
}

runCommand("npm", ["run", "test:installer"], env);
runCommand("node", ["scripts/installer-e2e-strict.mjs"], env);
