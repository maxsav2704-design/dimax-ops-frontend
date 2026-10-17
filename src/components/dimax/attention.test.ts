import { describe, expect, it } from "vitest";

import { attentionAttr, attentionLevel, byAttention } from "./attention";

describe("attention ranking (E1)", () => {
  it("takes the strongest flag, never a sum", () => {
    expect(attentionLevel({})).toBe(0);
    expect(attentionLevel({ unassigned: true })).toBe(1);
    expect(attentionLevel({ stale: true, unassigned: true })).toBe(1);
    expect(attentionLevel({ missingPrice: true, unassigned: true })).toBe(2);
    expect(attentionLevel({ issues: true })).toBe(2);
    expect(attentionLevel({ overdue: true, missingPrice: true })).toBe(3);
    expect(attentionLevel({ blocked: true })).toBe(3);
  });

  it("sorts higher attention first and keeps the order of equals", () => {
    const rows = [
      { id: "a", level: 0 as const },
      { id: "b", level: 3 as const },
      { id: "c", level: 1 as const },
      { id: "d", level: 3 as const },
    ];
    expect([...rows].sort(byAttention((r) => r.level)).map((r) => r.id)).toEqual(["b", "d", "c", "a"]);
  });

  it("omits the attribute when nothing needs attention", () => {
    expect(attentionAttr(0)).toEqual({});
    expect(attentionAttr(2)).toEqual({ "data-attention": "2" });
  });
});
