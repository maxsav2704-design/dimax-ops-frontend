import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy, createCspNonce, originOf } from "@/lib/csp";

// Per-request CSP with a fresh nonce (see src/lib/csp.ts). The nonce travels
// to the render through the `x-nonce` request header; Next.js also reads the
// Content-Security-Policy request header to nonce its own inline scripts.
export function proxy(request: NextRequest) {
  const nonce = createCspNonce();
  const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000", "http://localhost:8000");
  const csp = buildContentSecurityPolicy({ nonce, apiOrigin, isDev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Every document request; static chunks, image optimisation, the favicon
      // and router prefetches carry no HTML and need no policy.
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
