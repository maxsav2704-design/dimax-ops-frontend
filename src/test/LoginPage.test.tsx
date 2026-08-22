import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n";
import LoginPage from "@/views/LoginPage";

const { replaceMock, apiFetchMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  apiFetchMock: vi.fn(),
}));
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
  apiFetch: apiFetchMock,
}));

vi.mock("@/lib/device-id", () => ({
  getOrCreateDeviceId: () => "test-device-id",
}));

describe("LoginPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/auth/me") {
        throw new Error("unauthorized");
      }
      throw new Error(`Unexpected path: ${path}`);
    });
    storageState.clear();
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      configurable: true,
    });
    window.history.replaceState({}, "", "/login");
    document.documentElement.removeAttribute("inert");
    document.documentElement.style.cssText = "";
    document.body.removeAttribute("inert");
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.cssText = "";
  });

  it("publishes login readiness only after hydration and enables complete credentials", async () => {
    const { container } = render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    const form = container.querySelector("form.login-form");
    const submit = screen.getByRole("button", { name: "Sign In" });
    await waitFor(() => {
      expect(form).toHaveAttribute("data-login-ready", "true");
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Company ID"), { target: { value: "company-1" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });

    expect(submit).toBeEnabled();
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

  it("shows readable sign-in failure from auth api errors", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/auth/login") {
        const error = new Error("forbidden");
        Object.assign(error, { code: "FORBIDDEN_SCOPE", status: 403 });
        throw error;
      }
      if (path === "/api/v1/auth/me") {
        throw new Error("unauthorized");
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    fireEvent.change(screen.getByLabelText("Company ID"), { target: { value: "company-1" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("This action is not available for your access level.")).toBeInTheDocument();
    });
  });

  it("clears stale page locks when rendering login", async () => {
    document.documentElement.setAttribute("inert", "");
    document.documentElement.style.overflow = "hidden";
    document.body.setAttribute("inert", "");
    document.body.setAttribute("data-scroll-locked", "1");
    document.body.style.overflow = "hidden";
    document.body.style.pointerEvents = "none";
    document.body.style.paddingRight = "15px";

    render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dimax-login-active");
      expect(document.body).toHaveClass("dimax-login-active");
      expect(document.documentElement).not.toHaveAttribute("inert");
      expect(document.documentElement.style.overflow).toBe("");
      expect(document.body).not.toHaveAttribute("inert");
      expect(document.body).not.toHaveAttribute("data-scroll-locked");
      expect(document.body.style.overflow).toBe("");
      expect(document.body.style.pointerEvents).toBe("");
      expect(document.body.style.paddingRight).toBe("");
    });
  });

  it("removes the login interaction guard after leaving login", async () => {
    const { unmount } = render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(document.body).toHaveClass("dimax-login-active");
    });

    unmount();

    expect(document.documentElement).not.toHaveClass("dimax-login-active");
    expect(document.body).not.toHaveClass("dimax-login-active");
  });

  it("sends device_id during login", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/auth/login") {
        expect(init?.body).toBe(
          JSON.stringify({
            company_id: "company-1",
            email: "admin@example.com",
            password: "secret",
            device_id: "test-device-id",
          })
        );
        return {
          access_token: "access-token",
          refresh_token: "refresh-token",
          token_type: "bearer",
        };
      }
      if (path === "/api/v1/auth/me") {
        return { role: "ADMIN", admin_scope: "OWNER", can_view_rates: true };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    fireEvent.change(screen.getByLabelText("Company ID"), { target: { value: "company-1" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  it("continues to a safe internal next path with query after login", async () => {
    window.history.replaceState(
      {},
      "",
      "/login?next=%2Fprojects%3Fproject_id%3Dproject-1%26focus_section%3Ddoors"
    );
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/auth/login") {
        return {
          access_token: "access-token",
          refresh_token: "refresh-token",
          token_type: "bearer",
        };
      }
      if (path === "/api/v1/auth/me") {
        return { role: "ADMIN", admin_scope: "OWNER", can_view_rates: true };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    fireEvent.change(screen.getByLabelText("Company ID"), { target: { value: "company-1" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/projects?project_id=project-1&focus_section=doors"
      );
    });
  });

  it("ignores unsafe external next paths after login", async () => {
    window.history.replaceState(
      {},
      "",
      "/login?next=https%3A%2F%2Fevil.example%2Fsteal"
    );
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/auth/login") {
        return {
          access_token: "access-token",
          refresh_token: "refresh-token",
          token_type: "bearer",
        };
      }
      if (path === "/api/v1/auth/me") {
        return { role: "ADMIN", admin_scope: "OWNER", can_view_rates: true };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    );

    fireEvent.change(screen.getByLabelText("Company ID"), { target: { value: "company-1" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

});
