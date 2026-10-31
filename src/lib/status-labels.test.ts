import { describe, expect, it } from "vitest";
import { statusLabel } from "./status-labels";

describe("statusLabel", () => {
  it("names server codes in the reader's language", () => {
    expect(statusLabel("ISSUE_OPEN", "ru")).toBe("Есть проблема");
    expect(statusLabel("on_hold", "he")).toBe("בהמתנה");
    expect(statusLabel("NOT_INSTALLED", "en")).toBe("Not installed");
  });

  it("uses the meaning of the place the code is shown in", () => {
    expect(statusLabel("ACTIVE", "ru", "project")).toBe("В работе");
    expect(statusLabel("ACTIVE", "ru", "installer")).toBe("Доступен");
    expect(statusLabel("BLOCKED", "ru", "health")).toBe("Есть открытые проблемы");
    expect(statusLabel("BLOCKED", "ru")).toBe("Заблокировано");
  });

  it("falls back to a readable form of an unknown code and a dash for none", () => {
    expect(statusLabel("SOMETHING_NEW", "ru")).toBe("Something New");
    expect(statusLabel(null, "en")).toBe("-");
  });
});
