import { describe, expect, it } from "vitest";

import { apiOrigins, buildContentSecurityPolicy, createCspNonce, originOf } from "@/lib/csp";

const directive = (csp: string, name: string) =>
  csp.split("; ").find((part) => part.startsWith(`${name} `) || part === name) ?? null;

describe("buildContentSecurityPolicy", () => {
  const prod = buildContentSecurityPolicy({ nonce: "abc123", apiOrigin: "https://api.example.com", isDev: false });
  const dev = buildContentSecurityPolicy({ nonce: "abc123", apiOrigin: "http://127.0.0.1:8000", isDev: true });

  it("keeps scripts strict: nonce + strict-dynamic, no unsafe-inline, eval only in development", () => {
    expect(directive(prod, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(directive(dev, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic' 'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
    expect(directive(prod, "script-src")).not.toContain("'unsafe-inline'");
  });

  it("allows the API origin for fetch, images and media and Google Fonts for styles and fonts", () => {
    expect(directive(prod, "connect-src")).toBe("connect-src 'self' https://api.example.com");
    expect(directive(prod, "img-src")).toContain("https://api.example.com");
    expect(directive(prod, "media-src")).toContain("https://api.example.com");
    expect(directive(prod, "style-src")).toBe("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(directive(prod, "font-src")).toBe("font-src 'self' data: https://fonts.gstatic.com");
  });

  it("locks embedding, objects, base and form targets, and upgrades only outside development", () => {
    expect(directive(prod, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(prod, "object-src")).toBe("object-src 'none'");
    expect(directive(prod, "base-uri")).toBe("base-uri 'self'");
    expect(directive(prod, "form-action")).toBe("form-action 'self'");
    expect(prod.endsWith("; upgrade-insecure-requests")).toBe(true);
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("allows both loopback spellings of a local API origin, and only the given origin for real hosts", () => {
    expect(apiOrigins("http://127.0.0.1:8000")).toEqual(["http://localhost:8000", "http://127.0.0.1:8000"]);
    expect(apiOrigins("http://localhost:8000")).toEqual(["http://localhost:8000", "http://127.0.0.1:8000"]);
    expect(apiOrigins("https://api.example.com")).toEqual(["https://api.example.com"]);
    expect(directive(dev, "connect-src")).toContain("http://localhost:8000");
    expect(directive(prod, "connect-src")).toBe("connect-src 'self' https://api.example.com");
  });

  it("lets the dev server reach HMR over websockets and local http origins", () => {
    expect(directive(dev, "connect-src")).toContain("ws://127.0.0.1:*");
    expect(directive(dev, "connect-src")).toContain("http://localhost:*");
  });

  it("is a single header line without stray whitespace", () => {
    expect(prod).not.toMatch(/\s{2,}|\n/);
  });
});

describe("createCspNonce", () => {
  it("returns distinct base64 nonces of 128 bits", () => {
    const a = createCspNonce();
    const b = createCspNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(a).not.toBe(b);
  });
});

describe("originOf", () => {
  it("reduces a base URL to its origin and falls back on garbage", () => {
    expect(originOf("https://api.example.com/api/v1/", "x")).toBe("https://api.example.com");
    expect(originOf("not a url", "http://localhost:8000")).toBe("http://localhost:8000");
  });
});
