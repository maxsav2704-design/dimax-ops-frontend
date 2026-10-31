import { afterEach, describe, expect, it, vi } from "vitest";

import { clearStoredSession, onSessionIdentityChanged, persistAccessToken } from "./auth-session";

const token = (sub: string, n: number) =>
  `h.${btoa(JSON.stringify({ sub, exp: n })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.s`;

describe("onSessionIdentityChanged", () => {
  afterEach(() => clearStoredSession());

  it("ignores a routine refresh of the same person and fires on sign-out or another account", () => {
    persistAccessToken(token("user-a", 1));
    const listener = vi.fn();
    const stop = onSessionIdentityChanged(listener);

    persistAccessToken(token("user-a", 2));
    expect(listener).not.toHaveBeenCalled();

    persistAccessToken(token("user-b", 3));
    expect(listener).toHaveBeenCalledTimes(1);

    clearStoredSession();
    expect(listener).toHaveBeenCalledTimes(2);

    // Signing in after the sign-out: the screen was already dropped.
    persistAccessToken(token("user-a", 4));
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it("treats an unreadable token as a new session each time", () => {
    persistAccessToken("opaque-1");
    const listener = vi.fn();
    const stop = onSessionIdentityChanged(listener);
    persistAccessToken("opaque-2");
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });
});
