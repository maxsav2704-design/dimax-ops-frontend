#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const result = {
    envFile: "",
    allowHttp: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--env-file") {
      result.envFile = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--allow-http") {
      result.allowHttp = true;
    }
  }

  return result;
}

function loadEnvFile(filePath) {
  if (!filePath) {
    return {};
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
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

function mergeEnv(fileEnv) {
  const merged = { ...process.env };
  for (const [key, value] of Object.entries(fileEnv)) {
    if (!merged[key] || String(merged[key]).trim() === "") {
      merged[key] = value;
    }
  }
  return merged;
}

function validateApiBaseUrl(name, value, allowHttp) {
  const errors = [];
  if (!value || !String(value).trim()) {
    return [`${name} is required`];
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return [`${name} must be a full URL`];
  }

  if (!allowHttp && parsed.protocol !== "https:") {
    errors.push(`${name} must use https in production`);
  }

  if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    errors.push(`${name} must not point to localhost in production`);
  }

  return errors;
}

function printHelp() {
  console.log("Frontend production env validator");
  console.log("Usage:");
  console.log("  node scripts/validate-production-env.mjs --env-file .env.production.local");
  console.log("Optional flags:");
  console.log("  --allow-http   allow http scheme (only for non-production smoke)");
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

let fileEnv = {};
if (args.envFile) {
  try {
    fileEnv = loadEnvFile(path.resolve(process.cwd(), args.envFile));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

const env = mergeEnv(fileEnv);
const nextBaseUrl = String(env.NEXT_PUBLIC_API_BASE_URL || "").trim();
const viteBaseUrl = String(env.VITE_API_BASE_URL || "").trim();
const resolvedBaseUrl = nextBaseUrl || viteBaseUrl;
const errors = [];

if (nextBaseUrl && viteBaseUrl && nextBaseUrl !== viteBaseUrl) {
  errors.push("NEXT_PUBLIC_API_BASE_URL and VITE_API_BASE_URL must match when both are set");
}

errors.push(
  ...validateApiBaseUrl(
    nextBaseUrl ? "NEXT_PUBLIC_API_BASE_URL" : "VITE_API_BASE_URL",
    resolvedBaseUrl,
    args.allowHttp
  )
);

if (errors.length > 0) {
  console.error("Frontend production env validation failed:");
  for (const item of errors) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("Frontend production env is valid.");
