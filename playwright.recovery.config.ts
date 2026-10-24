import { defineConfig } from "@playwright/test";

// Fixed loopback-only endpoints; never reuse a running application or real account.
export default defineConfig({
  testDir: "./acceptance", testMatch: "outbox-recovery.spec.ts",
  fullyParallel: false, workers: 1, retries: 0, timeout: 90_000,
  outputDir: "test-results/recovery-ui", reporter: "list",
  use: { baseURL: "http://127.0.0.1:4192", browserName: "chromium", screenshot: "only-on-failure" },
  webServer: {
    command: "node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 4192",
    url: "http://127.0.0.1:4192/login", reuseExistingServer: false, timeout: 90_000,
  },
});
