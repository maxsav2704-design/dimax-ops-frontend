import assert from "node:assert/strict";
import test from "node:test";

const { default: nextConfig, securityHeaders } = await import("../next.config.mjs");

test("every route answers with the baseline security headers", async () => {
  const rules = await nextConfig.headers();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].source, "/:path*");
  const byKey = Object.fromEntries(rules[0].headers.map((header) => [header.key, header.value]));
  assert.equal(byKey["X-Content-Type-Options"], "nosniff");
  assert.equal(byKey["X-Frame-Options"], "DENY");
  assert.match(byKey["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.equal(byKey["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(byKey["Permissions-Policy"], /camera=\(\)/);
  assert.deepEqual(rules[0].headers, securityHeaders);
});

test("the X-Powered-By header is disabled", () => {
  assert.equal(nextConfig.poweredByHeader, false);
});
