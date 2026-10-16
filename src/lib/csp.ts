// Content Security Policy for every HTML response. Built in proxy.ts per
// request with a fresh nonce; app/layout.tsx reads the nonce from the
// `x-nonce` request header and puts it on the locale bootstrap script.
// Next.js applies the same nonce to its own inline scripts, so `script-src`
// needs neither 'unsafe-inline' nor a hash.
//
// Origins that are not 'self':
// - the API (NEXT_PUBLIC_API_BASE_URL): XHR/fetch, media URLs and images;
// - Google Fonts: src/index.css imports Rubik and JetBrains Mono from there;
// - OpenStreetMap: the project dialog embeds its map preview in an iframe
//   (frame-src; default-src 'self' blocked it before).
// Inline style *attributes* (React `style={}`) cannot carry a nonce, hence
// 'unsafe-inline' for styles only; scripts stay strict.

export type CspOptions = {
  nonce: string;
  /** Origin of the API, e.g. https://api.example.com (no path). */
  apiOrigin: string;
  /** Development: webpack HMR needs eval and a websocket; no HTTPS upgrade on http://localhost. */
  isDev: boolean;
};

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";
const OPENSTREETMAP_EMBED = "https://www.openstreetmap.org";

export function originOf(url: string, fallback: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return fallback;
  }
}

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1"];

/**
 * A loopback API origin is spelled two ways on dev machines and in e2e runs
 * (the client bundle may carry `localhost` while the server env says
 * `127.0.0.1`). Allowing both keeps the policy strict for real hosts and
 * tolerant for the two local spellings only.
 */
export function apiOrigins(apiOrigin: string): string[] {
  try {
    const url = new URL(apiOrigin);
    if (!LOOPBACK_HOSTS.includes(url.hostname)) return [apiOrigin];
    return LOOPBACK_HOSTS.map((host) => `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`);
  } catch {
    return [apiOrigin];
  }
}

export function buildContentSecurityPolicy({ nonce, apiOrigin, isDev }: CspOptions): string {
  const api = apiOrigins(apiOrigin);
  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'", GOOGLE_FONTS_CSS]],
    ["font-src", ["'self'", "data:", GOOGLE_FONTS_FILES]],
    // Attachments and photos are served from the API or from object storage
    // behind presigned https URLs, so https: stays open for images and media.
    ["img-src", ["'self'", "data:", "blob:", "https:", ...api]],
    ["media-src", ["'self'", "blob:", "data:", "https:", ...api]],
    ["connect-src", ["'self'", ...api, ...(isDev ? ["ws://127.0.0.1:*", "ws://localhost:*", "http://127.0.0.1:*", "http://localhost:*"] : [])]],
    ["worker-src", ["'self'", "blob:"]],
    ["frame-src", ["'self'", OPENSTREETMAP_EMBED]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];
  const parts = directives.map(([name, values]) => `${name} ${Array.from(new Set(values)).join(" ")}`);
  if (!isDev) {
    parts.push("upgrade-insecure-requests");
  }
  return parts.join("; ");
}

/** 128 bits of randomness, base64 — valid in both the Node and the Edge runtime. */
export function createCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
