#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const PLACEHOLDER_PATTERN = /example\.com|replace|placeholder|changeme|change-me|todo/iu;

export function parseArgs(argv) {
  const result = {
    envFile: "",
    backendEnvFile: "",
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
    } else if (arg === "--backend-env-file") {
      result.backendEnvFile = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--allow-http") {
      result.allowHttp = true;
    }
  }

  return result;
}

export function loadEnvFile(filePath) {
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

function hasPlaceholderValue(value) {
  return PLACEHOLDER_PATTERN.test(String(value || ""));
}

function normalizedBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/u, "");
}

export function validateApiBaseUrl(name, value, allowHttp = false) {
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

  const allowedProtocols = allowHttp ? new Set(["http:", "https:"]) : new Set(["https:"]);
  if (!allowedProtocols.has(parsed.protocol)) {
    errors.push(
      allowHttp
        ? `${name} must use http or https`
        : `${name} must use https in production`
    );
  }
  if (LOCAL_HOSTS.has(parsed.hostname)) {
    errors.push(`${name} must not point to localhost in production`);
  }
  if (parsed.username || parsed.password) {
    errors.push(`${name} must not contain URL credentials`);
  }
  if (parsed.search || parsed.hash) {
    errors.push(`${name} must not contain a query string or fragment`);
  }
  if (hasPlaceholderValue(value)) {
    errors.push(`${name} must not use placeholder/example production value`);
  }

  return errors;
}

export function validateProductionEnvironment(
  env,
  { allowHttp = false, backendPublicBaseUrl = "" } = {}
) {
  const errors = [];
  const nextBaseUrl = String(env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  const viteBaseUrl = String(env.VITE_API_BASE_URL || "").trim();

  errors.push(
    ...validateApiBaseUrl("NEXT_PUBLIC_API_BASE_URL", nextBaseUrl, allowHttp)
  );

  if (viteBaseUrl) {
    errors.push(...validateApiBaseUrl("VITE_API_BASE_URL", viteBaseUrl, allowHttp));
    if (normalizedBaseUrl(nextBaseUrl) !== normalizedBaseUrl(viteBaseUrl)) {
      errors.push(
        "NEXT_PUBLIC_API_BASE_URL and VITE_API_BASE_URL must match when both are set"
      );
    }
  }

  if (
    backendPublicBaseUrl &&
    normalizedBaseUrl(nextBaseUrl) !== normalizedBaseUrl(backendPublicBaseUrl)
  ) {
    errors.push("NEXT_PUBLIC_API_BASE_URL must match backend PUBLIC_BASE_URL");
  }

  return errors;
}

function printHelp(output) {
  output.log("Frontend production env validator");
  output.log("Usage:");
  output.log(
    [
      "  node scripts/validate-production-env.mjs",
      "--env-file .env.production.local",
      "--backend-env-file ../backend/.env.production.local",
    ].join(" ")
  );
  output.log("Optional flags:");
  output.log("  --allow-http   allow http scheme (only for non-production smoke)");
}

export function run(
  argv = process.argv.slice(2),
  processEnvironment = process.env,
  output = console
) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp(output);
    return 0;
  }

  let env;
  let backendPublicBaseUrl = "";
  try {
    env = args.envFile
      ? loadEnvFile(path.resolve(process.cwd(), args.envFile))
      : { ...processEnvironment };
    if (args.backendEnvFile) {
      const backendEnv = loadEnvFile(
        path.resolve(process.cwd(), args.backendEnvFile)
      );
      backendPublicBaseUrl = String(backendEnv.PUBLIC_BASE_URL || "").trim();
      if (!backendPublicBaseUrl) {
        output.error("Backend production env validation failed:");
        output.error("- PUBLIC_BASE_URL is required in the backend env file");
        return 1;
      }
    }
  } catch (error) {
    output.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  const errors = validateProductionEnvironment(env, {
    allowHttp: args.allowHttp,
    backendPublicBaseUrl,
  });
  if (errors.length > 0) {
    output.error("Frontend production env validation failed:");
    for (const item of errors) {
      output.error(`- ${item}`);
    }
    return 1;
  }

  output.log("Frontend production env is valid.");
  return 0;
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (scriptPath === fileURLToPath(import.meta.url)) {
  process.exitCode = run();
}
