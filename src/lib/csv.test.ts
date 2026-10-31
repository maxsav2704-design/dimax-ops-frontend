import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("starts with a BOM and separates rows for Excel", () => {
    expect(toCsv([["Название", "סוג"], ["Дверь", "התקנה"]])).toBe("﻿Название,סוג\r\nДверь,התקנה");
  });

  it("quotes separators and writes formula-like cells as text", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-5.5")).toBe("-5.5");
    expect(csvCell("-cmd")).toBe("'-cmd");
    expect(csvCell(null)).toBe("");
  });
});
