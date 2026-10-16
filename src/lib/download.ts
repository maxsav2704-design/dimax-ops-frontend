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
  const match = (disposition || "").match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}
