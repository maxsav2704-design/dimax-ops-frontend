import { downloadBlob } from "./download";

// One CSV writer for the browser exports: Excel opens Hebrew and Russian text correctly only with a UTF-8 BOM,
// and a cell that starts like a formula (=, +, @, or a minus not followed by a number) is written as text.
const FORMULA_START = /^(?:[=+@\t\r]|-(?![\d.]))/;

export function csvCell(value: string | number | null | undefined): string {
  let text = String(value ?? "");
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): void {
  downloadBlob(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), filename);
}
