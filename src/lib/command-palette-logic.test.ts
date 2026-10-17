import { describe, expect, it } from "vitest";

import { entryScore, isPaletteShortcut, isTypingTarget, matchScore, moveSelection, pushRecent, rankEntries, stepGoSequence, type PaletteEntry } from "./command-palette-logic";

const entries: PaletteEntry[] = [
  { id: "s:projects", kind: "section", title: "Проекты", href: "/projects", keywords: ["projects"] },
  { id: "s:prices", kind: "section", title: "Прайс завода", href: "/price-lists", keywords: ["price lists"] },
  { id: "a:create", kind: "action", title: "Создать проект", href: "/projects?create=1" },
  { id: "p:1", kind: "project", title: "Приёмка Excel: 9 дверей", subtitle: "QA-001", href: "/projects?project_id=1" },
  { id: "i:1", kind: "installer", title: "Монтажник A-1", href: "/installers?installer_id=1" },
];

describe("command palette matching", () => {
  it("prefers prefixes, then word starts, then substrings, then subsequences", () => {
    expect(matchScore("про", "Проекты")).toBe(100);
    expect(matchScore("завода", "Прайс завода")).toBe(95);
    expect(matchScore("ексел", "Приёмка Excel")).toBe(0);
    expect(matchScore("excel", "Приёмка Excel: 9 дверей")).toBeGreaterThanOrEqual(50);
    expect(matchScore("пкт", "Проекты")).toBeGreaterThan(0);
    expect(matchScore("xyz", "Проекты")).toBe(0);
    expect(matchScore("", "anything")).toBe(1);
  });

  it("treats ё and е alike and matches keywords and subtitles", () => {
    expect(matchScore("приемка", "Приёмка Excel")).toBe(100);
    expect(entryScore("qa-001", entries[3])).toBe(100);
    expect(entryScore("projects", entries[0])).toBe(100);
  });

  it("ranks by score, then by kind (actions and sections before records)", () => {
    // "Проекты" is a prefix (100), "Создать проект" a word start (95), "Прайс завода" only a subsequence.
    const ranked = rankEntries("про", entries);
    expect(ranked.map((e) => e.id)).toEqual(["s:projects", "a:create", "s:prices"]);
    const all = rankEntries("", entries);
    expect(all.map((e) => e.kind)).toEqual(["action", "section", "section", "project", "installer"]);
  });

  it("drops entries that do not match and respects the limit", () => {
    expect(rankEntries("монтаж", entries).map((e) => e.id)).toEqual(["i:1"]);
    expect(rankEntries("", entries, 2)).toHaveLength(2);
  });
});

describe("command palette keyboard and recents", () => {
  it("wraps the selection in both directions", () => {
    expect(moveSelection(-1, 1, 3)).toBe(0);
    expect(moveSelection(-1, -1, 3)).toBe(2);
    expect(moveSelection(2, 1, 3)).toBe(0);
    expect(moveSelection(0, -1, 3)).toBe(2);
    expect(moveSelection(0, 1, 0)).toBe(-1);
  });

  it("keeps the newest recent first without duplicates and caps the list", () => {
    let recent: string[] = [];
    for (const id of ["a", "b", "c", "a", "d", "e", "f"]) recent = pushRecent(recent, id);
    expect(recent).toEqual(["f", "e", "d", "a", "c"]);
  });
});

describe("shortcuts", () => {
  const plain = { ctrlKey: false, metaKey: false, altKey: false };

  it("recognises Ctrl+K and Cmd+K but not Alt combinations", () => {
    expect(isPaletteShortcut({ ...plain, ctrlKey: true, key: "k" })).toBe(true);
    expect(isPaletteShortcut({ ...plain, metaKey: true, key: "K" })).toBe(true);
    expect(isPaletteShortcut({ ...plain, ctrlKey: true, altKey: true, key: "k" })).toBe(false);
    expect(isPaletteShortcut({ ...plain, key: "k" })).toBe(false);
  });

  it("completes g-then-letter inside the window and forgets it afterwards", () => {
    const armed = stepGoSequence({ armedAt: null }, "g", 1000, plain);
    expect(armed).toEqual({ state: { armedAt: 1000 }, href: null });
    expect(stepGoSequence(armed.state, "p", 1500, plain)).toEqual({ state: { armedAt: null }, href: "/projects" });
    expect(stepGoSequence(armed.state, "p", 2500, plain)).toEqual({ state: { armedAt: null }, href: null });
    expect(stepGoSequence(armed.state, "x", 1200, plain).href).toBeNull();
    expect(stepGoSequence({ armedAt: null }, "p", 1000, plain).href).toBeNull();
    expect(stepGoSequence({ armedAt: 1000 }, "p", 1200, { ...plain, ctrlKey: true }).href).toBeNull();
  });

  it("knows when the user is typing", () => {
    const input = document.createElement("input");
    document.body.append(input);
    expect(isTypingTarget(input)).toBe(true);
    const button = document.createElement("button");
    document.body.append(button);
    expect(isTypingTarget(button)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
