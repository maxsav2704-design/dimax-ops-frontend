// Baseline browser hardening for every response. The Content-Security-Policy
// itself is set per request in proxy.ts (it carries a nonce; see src/lib/csp.ts).
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Public acceptance links carry a token in the path; never leak it to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  // Inline the API base into server/edge bundles too (NEXT_PUBLIC_* is only
  // inlined client-side by default), so proxy.ts builds the CSP for the same
  // origin the client bundle actually calls, independent of the runtime env.
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  output: "standalone",
  experimental: {
    cpus: 1,
  },
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
