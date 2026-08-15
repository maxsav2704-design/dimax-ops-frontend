"use client";

export function safeInternalNextPath(
  raw: string | null | undefined,
  fallback = "/",
): string {
  const value = (raw || "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://dimax.local");
    if (url.origin !== "https://dimax.local") {
      return fallback;
    }
    const nextPath = `${url.pathname}${url.search}${url.hash}`;
    if (nextPath === "/login" || nextPath.startsWith("/login?")) {
      return fallback;
    }
    return nextPath;
  } catch {
    return fallback;
  }
}

export function buildAuthRequiredLoginPath(
  pathname: string | null | undefined,
  search: string,
  error: string,
): string {
  const cleanPathname =
    pathname && pathname.trim().startsWith("/") ? pathname.trim() : "/";
  const query = search.trim().replace(/^\?+/, "");
  const next = safeInternalNextPath(
    query ? `${cleanPathname}?${query}` : cleanPathname,
    "/",
  );
  const params = new URLSearchParams({
    next,
    error,
  });
  return `/login?${params.toString()}`;
}
