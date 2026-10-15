// Baseline browser hardening for every response. Script/style sources are not
// restricted yet: the locale bootstrap is an inline script and fonts come from
// Google Fonts, so a full CSP needs nonces first (tracked in the admin audit).
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Public acceptance links carry a token in the path; never leak it to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
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
