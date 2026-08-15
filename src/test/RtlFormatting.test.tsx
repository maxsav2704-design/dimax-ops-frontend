import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LtrText } from "@/components/ui/LtrText";
import { formatLocaleDateTime, formatLocaleNumber, withLtrIsolation } from "@/lib/formatting";
import {
  LOCALE_STORAGE_KEY,
  getDocumentLocaleBootstrapScript,
  getBootstrapLocale,
  localeFromLanguageTag,
} from "@/lib/locale";

describe("RTL formatting helpers", () => {
  it("maps browser language tags to supported locales", () => {
    expect(localeFromLanguageTag("he-IL")).toBe("he");
    expect(localeFromLanguageTag("ru-RU")).toBe("ru");
    expect(localeFromLanguageTag("en-US")).toBe("en");
  });

  it("prefers persisted locale over the server document default", () => {
    const previousLang = document.documentElement.lang;
    const previousStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    const storage = new Map<string, string>();
    const storageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    try {
      Object.defineProperty(window, "localStorage", {
        value: storageMock,
        configurable: true,
      });
      document.documentElement.lang = "en";
      window.localStorage.setItem(LOCALE_STORAGE_KEY, "he");

      expect(getBootstrapLocale()).toBe("he");
    } finally {
      document.documentElement.lang = previousLang;
      if (previousStorageDescriptor) {
        Object.defineProperty(window, "localStorage", previousStorageDescriptor);
      } else {
        Reflect.deleteProperty(window, "localStorage");
      }
    }
  });

  it("isolates numeric text for rtl locales", () => {
    expect(withLtrIsolation("123", "he")).toBe("⁦123⁩");
    expect(withLtrIsolation("123", "en")).toBe("123");
  });

  it("formats numbers and datetimes through locale-aware helpers", () => {
    const numberValue = formatLocaleNumber(1234.5, "he");
    const dateValue = formatLocaleDateTime("2026-01-02T03:04:00Z", "he");

    expect(numberValue.startsWith("⁦")).toBe(true);
    expect(numberValue.endsWith("⁩")).toBe(true);
    expect(numberValue).toContain("1");

    expect(dateValue.startsWith("⁦")).toBe(true);
    expect(dateValue.endsWith("⁩")).toBe(true);
  });

  it("renders explicit ltr wrappers for numeric tokens", () => {
    render(<LtrText>123</LtrText>);

    const node = screen.getByText("123");
    expect(node).toHaveAttribute("dir", "ltr");
    expect(node).toHaveStyle({ unicodeBidi: "isolate" });
  });

  it("ships a document bootstrap script that sets lang and dir before hydration", () => {
    const script = getDocumentLocaleBootstrapScript();

    expect(script).toContain(LOCALE_STORAGE_KEY);
    expect(script).toContain("document.documentElement.lang");
    expect(script).toContain("document.documentElement.dir");
  });
});
