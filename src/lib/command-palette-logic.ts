// Command palette logic (premium visual, 2026-10-17): ranking of sections,
// records and actions for a typed query, kept pure for tests.

export type PaletteKind = "section" | "action" | "project" | "installer";

export type PaletteEntry = {
  id: string;
  kind: PaletteKind;
  title: string;
  subtitle?: string;
  href: string;
  /** Extra words that should match (codes, addresses, translations). */
  keywords?: string[];
};

export type RankedEntry = PaletteEntry & { score: number };

const KIND_WEIGHT: Record<PaletteKind, number> = { action: 4, section: 3, project: 2, installer: 1 };

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}

/**
 * 0 when the query does not match, otherwise a score: whole-word prefix 100,
 * prefix 90, substring 70, in-order subsequence 40 minus the spread of the
 * matched letters (so "prj" prefers "projects" over "price lists").
 */
export function matchScore(query: string, text: string): number {
  const q = normalize(query);
  const t = normalize(text);
  if (!q) return 1;
  if (!t) return 0;
  if (t.startsWith(q)) return 100;
  const wordIndex = t.indexOf(` ${q}`);
  if (wordIndex >= 0) return 95;
  const index = t.indexOf(q);
  if (index >= 0) return 70 - Math.min(20, index);
  let position = 0;
  let first = -1;
  for (const char of q) {
    const found = t.indexOf(char, position);
    if (found < 0) return 0;
    if (first < 0) first = found;
    position = found + 1;
  }
  const spread = position - first - q.length;
  return Math.max(5, 40 - spread);
}

export function entryScore(query: string, entry: PaletteEntry): number {
  const candidates = [entry.title, entry.subtitle ?? "", ...(entry.keywords ?? [])];
  let best = 0;
  for (const candidate of candidates) {
    best = Math.max(best, matchScore(query, candidate));
  }
  return best;
}

/** Ranked results: best score first, kind weight breaks ties, then title. */
export function rankEntries(query: string, entries: PaletteEntry[], limit = 12): RankedEntry[] {
  const ranked: RankedEntry[] = [];
  for (const entry of entries) {
    const score = entryScore(query, entry);
    if (score > 0) ranked.push({ ...entry, score });
  }
  ranked.sort((a, b) => b.score - a.score || KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind] || a.title.localeCompare(b.title));
  return ranked.slice(0, limit);
}

/** Keyboard roving: wraps around, never leaves the list. */
export function moveSelection(current: number, delta: 1 | -1, length: number): number {
  if (length <= 0) return -1;
  if (current < 0) return delta > 0 ? 0 : length - 1;
  return (current + delta + length) % length;
}

/** Ctrl+K or Cmd+K (not with Alt) opens or closes the palette. */
export function isPaletteShortcut(event: { ctrlKey: boolean; metaKey: boolean; altKey: boolean; key: string }): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k";
}

export const RECENT_STORAGE_KEY = "dmx.palette.recent.v1";
export const RECENT_LIMIT = 5;

export function pushRecent(recent: string[], id: string): string[] {
  return [id, ...recent.filter((item) => item !== id)].slice(0, RECENT_LIMIT);
}

// "g then key" navigation: press g, then within the window press the letter of
// a section. Ignored while typing in a field. Pure state machine for tests.

export const GO_SEQUENCE_WINDOW_MS = 900;

export const GO_TARGETS: Record<string, string> = {
  h: "/",
  p: "/projects",
  c: "/calendar",
  i: "/issues",
  m: "/installers",
  j: "/journal",
  r: "/reports",
  o: "/operations",
  s: "/settings",
};

export type GoState = { armedAt: number | null };

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).closest !== "function") return false;
  const element = target as HTMLElement;
  return !!element.closest("input, textarea, select, [contenteditable=\"true\"], [role=\"combobox\"], [role=\"dialog\"]");
}

/** Returns the next state and, when a sequence completes, the href to go to. */
export function stepGoSequence(state: GoState, key: string, now: number, modifiers: { ctrlKey: boolean; metaKey: boolean; altKey: boolean }): { state: GoState; href: string | null } {
  if (modifiers.ctrlKey || modifiers.metaKey || modifiers.altKey) return { state: { armedAt: null }, href: null };
  const lower = key.toLowerCase();
  if (state.armedAt !== null && now - state.armedAt <= GO_SEQUENCE_WINDOW_MS) {
    const href = GO_TARGETS[lower] ?? null;
    return { state: { armedAt: null }, href };
  }
  if (lower === "g") return { state: { armedAt: now }, href: null };
  return { state: { armedAt: null }, href: null };
}
