// Import error report as CSV (moved verbatim from ProjectsPage.tsx, Projects step 2).

import { downloadBlob } from "@/lib/download";
import type { ImportRowError } from "./import-types";

export function safeDownloadFilename(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 140);
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildImportErrorsCsv(errors: ImportRowError[]): string {
  const rows = [
    ["row", "message"],
    ...errors.map((errorItem) => [String(errorItem.row), errorItem.message]),
  ];
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

export function downloadImportErrorsCsv(
  errors: ImportRowError[],
  filename: string,
): void {
  const csv = buildImportErrorsCsv(errors);
  downloadBlob(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}
