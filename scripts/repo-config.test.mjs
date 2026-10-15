import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (relative) => fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

test("ESLint ignores every NEXT_DIST_DIR build output, not only .next", async () => {
  const config = (await import("../eslint.config.js")).default;
  const ignores = config.flatMap((entry) => entry.ignores ?? []);
  assert.ok(ignores.includes(".next/**"), "default .next output must stay ignored");
  assert.ok(ignores.includes(".next-*/**"), ".next-<name> outputs from NEXT_DIST_DIR must be ignored");
  assert.ok(ignores.includes("dist/**"));
});

test("Playwright keeps a trace when a run fails even though retries are disabled", () => {
  const config = read("playwright.config.ts");
  assert.match(config, /retries:\s*0/);
  assert.match(config, /trace:\s*"retain-on-failure"/);
  assert.doesNotMatch(config, /trace:\s*"on-first-retry"/);
});
