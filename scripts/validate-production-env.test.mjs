import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  run,
  validateProductionEnvironment,
} from "./validate-production-env.mjs";

const VALID_API_URL = "https://api.dimax.co.il";

test("accepts a valid Next production API URL", () => {
  assert.deepEqual(
    validateProductionEnvironment({ NEXT_PUBLIC_API_BASE_URL: VALID_API_URL }),
    []
  );
});

test("does not accept VITE_API_BASE_URL as the only client configuration", () => {
  const errors = validateProductionEnvironment({ VITE_API_BASE_URL: VALID_API_URL });

  assert.ok(errors.includes("NEXT_PUBLIC_API_BASE_URL is required"));
});

test("rejects credentials, query strings, fragments, and non-HTTPS URLs", () => {
  const errors = validateProductionEnvironment({
    NEXT_PUBLIC_API_BASE_URL: "http://user:pass@api.dimax.co.il?debug=1#top",
  });

  assert.ok(errors.some((error) => error.includes("must use https")));
  assert.ok(errors.some((error) => error.includes("URL credentials")));
  assert.ok(errors.some((error) => error.includes("query string or fragment")));
});

test("requires optional Vite alias to match the Next URL", () => {
  const errors = validateProductionEnvironment({
    NEXT_PUBLIC_API_BASE_URL: VALID_API_URL,
    VITE_API_BASE_URL: "https://other.dimax.co.il",
  });

  assert.ok(errors.some((error) => error.includes("must match when both are set")));
});

test("cross-checks frontend API URL against backend PUBLIC_BASE_URL", () => {
  assert.deepEqual(
    validateProductionEnvironment(
      { NEXT_PUBLIC_API_BASE_URL: `${VALID_API_URL}/` },
      { backendPublicBaseUrl: VALID_API_URL }
    ),
    []
  );

  const errors = validateProductionEnvironment(
    { NEXT_PUBLIC_API_BASE_URL: VALID_API_URL },
    { backendPublicBaseUrl: "https://backend.dimax.co.il" }
  );
  assert.ok(errors.some((error) => error.includes("backend PUBLIC_BASE_URL")));
});

test("an explicit env file does not inherit a missing value from process env", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dimax-admin-env-"));
  const envFile = path.join(directory, ".env.production");
  fs.writeFileSync(envFile, "VITE_API_BASE_URL=https://api.dimax.co.il\n", "utf8");
  const messages = [];
  const output = {
    log: (message) => messages.push(String(message)),
    error: (message) => messages.push(String(message)),
  };

  try {
    const exitCode = run(
      ["--env-file", envFile],
      { NEXT_PUBLIC_API_BASE_URL: VALID_API_URL },
      output
    );

    assert.equal(exitCode, 1);
    assert.ok(
      messages.some((message) =>
        message.includes("NEXT_PUBLIC_API_BASE_URL is required")
      )
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
