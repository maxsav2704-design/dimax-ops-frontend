#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
);

function normalize(relativePath) {
  return relativePath.replaceAll("\\", "/");
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

function relativeFiles(directory, matcher) {
  return walkFiles(path.join(projectRoot, directory))
    .filter((filePath) => matcher.test(filePath))
    .map((filePath) => normalize(path.relative(projectRoot, filePath)))
    .sort();
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    throw new Error(`Test discovery command failed with exit code ${result.status}.`);
  }
  return result.stdout;
}

function assertSameFiles(label, expected, discovered) {
  const expectedSet = new Set(expected);
  const discoveredSet = new Set(discovered);
  const missing = expected.filter((filePath) => !discoveredSet.has(filePath));
  const unexpected = discovered.filter((filePath) => !expectedSet.has(filePath));

  if (missing.length || unexpected.length) {
    const details = [
      ...missing.map((filePath) => `  missing: ${filePath}`),
      ...unexpected.map((filePath) => `  unexpected: ${filePath}`),
    ].join("\n");
    throw new Error(`Test discovery is incomplete:\n${details}`);
  }
}

function validateVitestDiscovery() {
  const expected = relativeFiles("src", /\.(?:test|spec)\.[cm]?[jt]sx?$/u);
  const output = runNode([
    "./node_modules/vitest/vitest.mjs",
    "list",
    "--filesOnly",
  ]);
  const discovered = output
    .split(/\r?\n/u)
    .map((line) => normalize(line.trim()))
    .filter(Boolean)
    .sort();

  assertSameFiles("Vitest", expected, discovered);
  console.log(`Vitest discovery: ${expected.length} files covered.`);
}

function collectPlaywrightFiles(suites, result = new Set()) {
  for (const suite of suites || []) {
    if (typeof suite.file === "string" && suite.file.trim()) {
      const relativeFile = suite.file.includes("/") || suite.file.includes("\\")
        ? suite.file
        : path.join("e2e", suite.file);
      result.add(normalize(relativeFile));
    }
    collectPlaywrightFiles(suite.suites, result);
  }
  return result;
}

function validatePlaywrightDiscovery() {
  if (!fs.existsSync(path.join(projectRoot, "e2e"))) {
    return;
  }

  const expected = relativeFiles("e2e", /\.(?:test|spec)\.[cm]?[jt]sx?$/u);
  const output = runNode([
    "./node_modules/@playwright/test/cli.js",
    "test",
    "--list",
    "--reporter=json",
  ]);
  const report = JSON.parse(output);
  const discovered = [...collectPlaywrightFiles(report.suites)].sort();

  assertSameFiles("Playwright", expected, discovered);
  if (packageJson.scripts?.["test:e2e:release"] !== "node scripts/visual-brand-smoke.mjs --scope all") {
    throw new Error(
      "package.json must keep test:e2e:release bound to the fail-closed all-spec runner.",
    );
  }
  console.log(`Playwright discovery: ${expected.length} files covered.`);
}

try {
  validateVitestDiscovery();
  validatePlaywrightDiscovery();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
