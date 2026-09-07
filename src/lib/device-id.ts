"use client";

const DEVICE_ID_STORAGE_KEY = "dimax_device_id";

function fallbackDeviceId(): string {
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateDeviceId(): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)?.trim();
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : fallbackDeviceId();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}
