import { describe, expect, it } from "vitest";

import { countNoun, pluralNoun, type PluralSpec } from "@/lib/plural";

const INCIDENT: PluralSpec = {
  en: ["incident", "incidents"],
  ru: ["инцидент", "инцидента", "инцидентов"],
  he: ["אירוע", "אירועים"],
};

describe("pluralNoun", () => {
  it("picks English one/other", () => {
    expect(pluralNoun("en", 1, INCIDENT)).toBe("incident");
    expect(pluralNoun("en", 0, INCIDENT)).toBe("incidents");
    expect(pluralNoun("en", 2, INCIDENT)).toBe("incidents");
  });

  it("picks Russian one/few/many including teens and 21+", () => {
    expect(pluralNoun("ru", 1, INCIDENT)).toBe("инцидент");
    expect(pluralNoun("ru", 2, INCIDENT)).toBe("инцидента");
    expect(pluralNoun("ru", 4, INCIDENT)).toBe("инцидента");
    expect(pluralNoun("ru", 5, INCIDENT)).toBe("инцидентов");
    expect(pluralNoun("ru", 11, INCIDENT)).toBe("инцидентов");
    expect(pluralNoun("ru", 14, INCIDENT)).toBe("инцидентов");
    expect(pluralNoun("ru", 21, INCIDENT)).toBe("инцидент");
    expect(pluralNoun("ru", 22, INCIDENT)).toBe("инцидента");
    expect(pluralNoun("ru", 0, INCIDENT)).toBe("инцидентов");
  });

  it("picks Hebrew one/other", () => {
    expect(pluralNoun("he", 1, INCIDENT)).toBe("אירוע");
    expect(pluralNoun("he", 2, INCIDENT)).toBe("אירועים");
    expect(pluralNoun("he", 7, INCIDENT)).toBe("אירועים");
  });
});

describe("countNoun", () => {
  it("prefixes the count", () => {
    expect(countNoun("en", 1, INCIDENT)).toBe("1 incident");
    expect(countNoun("ru", 3, INCIDENT)).toBe("3 инцидента");
    expect(countNoun("he", 5, INCIDENT)).toBe("5 אירועים");
  });
});
