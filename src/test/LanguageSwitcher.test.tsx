import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LanguageProvider, useI18n } from "@/lib/i18n";

function Probe() {
  const { t } = useI18n();
  return <div>{t("login.signIn")}</div>;
}

const storageState = new Map<string, string>();

const storageMock = {
  getItem: (key: string) => storageState.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageState.set(key, value);
  },
  removeItem: (key: string) => {
    storageState.delete(key);
  },
};

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    storageState.clear();
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      configurable: true,
    });
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  afterEach(() => {
    storageState.clear();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("switches locale, persists it, and enables rtl for hebrew", async () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher compact />
        <Probe />
      </LanguageProvider>
    );

    expect(screen.getByText("Sign In")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "RU" }));
    await waitFor(() => {
      expect(screen.getByText("Войти")).toBeInTheDocument();
      expect(window.localStorage.getItem("dimax_locale")).toBe("ru");
      expect(document.documentElement.lang).toBe("ru");
      expect(document.documentElement.dir).toBe("ltr");
    });

    fireEvent.click(screen.getByRole("button", { name: "עב" }));
    await waitFor(() => {
      expect(screen.getByText("כניסה")).toBeInTheDocument();
      expect(window.localStorage.getItem("dimax_locale")).toBe("he");
      expect(document.documentElement.lang).toBe("he");
      expect(document.documentElement.dir).toBe("rtl");
    });
  });
});
