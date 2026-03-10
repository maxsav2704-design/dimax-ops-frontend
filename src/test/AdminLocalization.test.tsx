import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LanguageProvider, useI18n } from "@/lib/i18n";

function AdminCopyProbe() {
  const { t } = useI18n();
  return (
    <div>
      <div data-testid="projects-title">{t("projects.title")}</div>
      <div data-testid="reports-title">{t("reports.title")}</div>
      <div data-testid="issues-title">{t("issues.title")}</div>
      <div data-testid="journal-title">{t("journal.title")}</div>
      <div data-testid="installers-title">{t("installers.title")}</div>
    </div>
  );
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

describe("AdminLocalization", () => {
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

  it("switches admin copy across english, russian, and hebrew", async () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher compact />
        <AdminCopyProbe />
      </LanguageProvider>
    );

    expect(screen.getByTestId("projects-title").textContent).toBe("Projects");
    expect(screen.getByTestId("reports-title").textContent).toBe("Reports");

    fireEvent.click(screen.getByRole("button", { name: "RU" }));
    await waitFor(() => {
      expect(screen.getByTestId("projects-title").textContent).not.toBe("Projects");
      expect(screen.getByTestId("issues-title").textContent).not.toBe("Issues");
      expect(window.localStorage.getItem("dimax_locale")).toBe("ru");
      expect(document.documentElement.lang).toBe("ru");
      expect(document.documentElement.dir).toBe("ltr");
    });

    fireEvent.click(screen.getByRole("button", { name: "עב" }));
    await waitFor(() => {
      expect(screen.getByTestId("projects-title").textContent).not.toBe("Projects");
      expect(screen.getByTestId("journal-title").textContent).not.toBe(
        "Journal queue, delivery channels and resend control"
      );
      expect(window.localStorage.getItem("dimax_locale")).toBe("he");
      expect(document.documentElement.lang).toBe("he");
      expect(document.documentElement.dir).toBe("rtl");
    });
  });
});
