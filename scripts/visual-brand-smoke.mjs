#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_PREVIEW_SEED_PATH = path.resolve(process.cwd(), ".preview-seed.json");
const DEFAULT_ADMIN_EMAIL = "admin@dimax.dev";
const DEFAULT_ADMIN_PASSWORD = "admin12345";
const DEFAULT_ARTIFACT_ROOT = path.resolve(process.cwd(), "..", "artifacts", "visual-brand");
const NEXT_BUILD_ID_PATH = path.resolve(process.cwd(), ".next", "BUILD_ID");
const NEXT_API_STAMP_PATH = path.resolve(process.cwd(), ".next", ".preview-api-base-url");

function parseArgs(argv) {
  const result = {
    help: false,
    envPath: "",
    scope: "visual",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--env-path") {
      result.envPath = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--scope") {
      result.scope = argv[index + 1] || "";
      index += 1;
    }
  }

  return result;
}

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  const result = {};
  const content = fs.readFileSync(filePath, "utf8");
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
  if (!fs.existsSync(filePath)) {
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

  if (typeof previewSeed.company_id === "string" && previewSeed.company_id.trim()) {
    env.E2E_COMPANY_ID = previewSeed.company_id.trim();
  }
  if (typeof previewSeed.api_base_url === "string" && previewSeed.api_base_url.trim()) {
    env.NEXT_PUBLIC_API_BASE_URL = previewSeed.api_base_url.trim();
  }
  if (typeof previewSeed.preview_url === "string" && previewSeed.preview_url.trim()) {
    env.PLAYWRIGHT_BASE_URL = previewSeed.preview_url.trim();
  }
  if (typeof previewSeed?.admin?.email === "string" && previewSeed.admin.email.trim()) {
    env.E2E_ADMIN_EMAIL = previewSeed.admin.email.trim();
  }
  if (typeof previewSeed?.admin?.password === "string" && previewSeed.admin.password.trim()) {
    env.E2E_ADMIN_PASSWORD = previewSeed.admin.password.trim();
  }
  if (typeof previewSeed?.installer?.email === "string" && previewSeed.installer.email.trim()) {
    env.E2E_INSTALLER_EMAIL = previewSeed.installer.email.trim();
  }
  if (
    typeof previewSeed?.installer?.password === "string" &&
    previewSeed.installer.password.trim()
  ) {
    env.E2E_INSTALLER_PASSWORD = previewSeed.installer.password.trim();
  }
}

function makeArtifactDir() {
  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  return path.join(DEFAULT_ARTIFACT_ROOT, stamp);
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
  if (!merged.VISUAL_BRAND_ARTIFACT_DIR) {
    merged.VISUAL_BRAND_ARTIFACT_DIR = makeArtifactDir();
  }

  return merged;
}

function validateEnvOrExit(env, scope) {
  const required = ["E2E_COMPANY_ID", "NEXT_PUBLIC_API_BASE_URL", "PLAYWRIGHT_BASE_URL"];
  if (scope === "all") {
    required.push("E2E_INSTALLER_EMAIL", "E2E_INSTALLER_PASSWORD");
  }
  const missing = required.filter((key) => !String(env[key] || "").trim());
  if (missing.length > 0) {
    console.error(`Missing env vars for visual brand smoke: ${missing.join(", ")}`);
    console.error("Run preview-web first or provide .env.e2e.local with preview/API values.");
    process.exit(1);
  }
}

function applyPlaywrightPort(env) {
  if (String(env.PLAYWRIGHT_PORT || "").trim()) {
    return;
  }

  try {
    const url = new URL(env.PLAYWRIGHT_BASE_URL);
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    env.PLAYWRIGHT_PORT = port;
  } catch {
    // validateEnvOrExit handles the required value; Playwright will report invalid URLs.
  }
}

function shouldBuildNext(env) {
  if (!fs.existsSync(NEXT_BUILD_ID_PATH) || !fs.existsSync(NEXT_API_STAMP_PATH)) {
    return true;
  }

  const stampedApiBaseUrl = fs.readFileSync(NEXT_API_STAMP_PATH, "utf8").trim();
  return stampedApiBaseUrl !== String(env.NEXT_PUBLIC_API_BASE_URL || "").trim();
}

function ensureNextBuild(env) {
  if (!shouldBuildNext(env)) {
    return;
  }

  console.log("Visual brand smoke: creating Next production build...");
  runOrExit("node", ["scripts/clean-next.mjs"], env);
  runOrExit("node", ["node_modules/next/dist/bin/next", "build", "--webpack"], env);
  fs.writeFileSync(NEXT_API_STAMP_PATH, `${env.NEXT_PUBLIC_API_BASE_URL}\n`, "utf8");
}

function runOrExit(command, commandArgs, env) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
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

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("DIMAX visual brand smoke");
  console.log("Usage:");
  console.log("  node scripts/visual-brand-smoke.mjs");
  console.log("  node scripts/visual-brand-smoke.mjs --env-path .env.e2e.local");
  console.log("  node scripts/visual-brand-smoke.mjs --scope all");
  console.log("Requires a running web preview and backend API.");
  process.exit(0);
}
if (!["visual", "all"].includes(args.scope)) {
  console.error("Unsupported scope. Use visual or all.");
  process.exit(1);
}

const envFilePath = args.envPath ? path.resolve(process.cwd(), args.envPath) : "";
if (envFilePath && !fs.existsSync(envFilePath)) {
  console.error(`Env file not found: ${args.envPath}`);
  process.exit(1);
}

const env = mergeEnv(loadEnvFile(envFilePath), loadPreviewSeed(DEFAULT_PREVIEW_SEED_PATH));
validateEnvOrExit(env, args.scope);
applyPlaywrightPort(env);
ensureNextBuild(env);

console.log(`Visual brand screenshots: ${env.VISUAL_BRAND_ARTIFACT_DIR}`);
const playwrightArgs = ["./node_modules/@playwright/test/cli.js", "test"];
if (args.scope === "visual") {
  playwrightArgs.push("e2e/visual-brand.spec.ts");
} else {
  env.CI = "true";
  playwrightArgs.push("--workers=1");
  console.log("Release browser smoke: all Playwright specs are mandatory.");
}
runOrExit("node", playwrightArgs, env);
