// Browser-side file download helpers (moved verbatim from ProjectsPage.tsx).

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function filenameFromDisposition(
  disposition: string | null,
  fallback: string,
): string {
  // RFC 6266: the UTF-8 name (Hebrew, Russian) comes as filename*=UTF-8''...; filename="..." is the ASCII fallback.
  const encoded = (disposition || "").match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // a malformed encoding falls back to the plain name
    }
  }
  const match = (disposition || "").match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}
