import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { LanguageProvider } from "@/lib/i18n";
import PublicLandingPage from "@/views/PublicLandingPage";

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

describe("PublicLandingPage", () => {
  beforeEach(() => {
    storageState.clear();
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      configurable: true,
    });
  });

  it("renders the public entry flow without touching protected routes", () => {
    render(
      <LanguageProvider>
        <PublicLandingPage />
      </LanguageProvider>
    );

    expect(
      screen.getByRole("heading", {
        name: "Operational control for admin teams and field installers in one system.",
      })
    ).toBeInTheDocument();

    expect(screen.getAllByRole("link", { name: "Open Secure Login" })[0]).toHaveAttribute(
      "href",
      "/login"
    );
    expect(screen.getAllByRole("link", { name: "See Installer Web" })[0]).toHaveAttribute(
      "href",
      "/login?next=/installer"
    );

    expect(screen.getByText("See the product lanes before login")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open route" })[0]).toHaveAttribute(
      "href",
      "/login?next=/operations"
    );
    expect(screen.getByText("How the demo flow works")).toBeInTheDocument();
    expect(screen.getByText("Proof that the system is operationally serious")).toBeInTheDocument();
    expect(screen.getByText("Role-aware demo access")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Core product architecture")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByText("Two real working days inside the product")).toBeInTheDocument();
    expect(screen.getByText("Admin recovery day")).toBeInTheDocument();
    expect(screen.getByText("Installer execution day")).toBeInTheDocument();
  }, 10000);
});
