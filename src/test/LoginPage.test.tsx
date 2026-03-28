import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n";
import LoginPage from "@/views/LoginPage";

const replaceMock = vi.fn();
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async (path: string) => {
    if (path === "/api/v1/auth/me") {
      throw new Error("unauthorized");
    }
    throw new Error(`Unexpected path: ${path}`);
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    storageState.clear();
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      configurable: true,
    });
    window.history.replaceState({}, "", "/login");
  });

  it("shows readable access denied notice from auth redirect query", async () => {
    window.history.replaceState({}, "", "/login?error=access_denied&next=%2Freports");

    render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText("This account does not have access to the requested area.")
      ).toBeInTheDocument();
    });
  });
  it("shows readable auth required notice from bootstrap redirect query", async () => {
    window.history.replaceState({}, "", "/login?error=auth_required&next=%2Fprojects");

    render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Sign in to continue to the requested area.")).toBeInTheDocument();
    });
  });

});
