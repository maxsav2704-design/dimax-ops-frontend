import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import InstallersPage from "@/views/InstallersPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { authSessionMock } = vi.hoisted(() => ({
  authSessionMock: vi.fn(),
}));
const { pushMock, searchParamsMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchParamsMock: vi.fn(() => new URLSearchParams("")),
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: authSessionMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock(),
}));

describe("InstallersPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    authSessionMock.mockReset();
    pushMock.mockReset();
    searchParamsMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
  });

  it("disables privileged installer actions for installer role", async () => {
    authSessionMock.mockReturnValue({
      role: "INSTALLER",
      admin_scope: null,
      can_view_rates: false,
    });
    apiFetchMock.mockImplementation(async (path: string) => {
      if (String(path).includes("/api/v1/admin/installers?")) {
        return [];
      }
      return [];
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallersPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Installer role has read-only access to installers and rates.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Installer" })).toBeDisabled();
  }, 15000);

  it("allows finance scope to open installer details and view rate controls", async () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "FINANCE",
      can_view_rates: true,
    });
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      if (url.includes("/api/v1/admin/installers?")) {
        return [
          {
            id: "installer-1",
            company_id: "company-1",
            full_name: "Installer Finance",
            phone: null,
            email: "finance@example.com",
            status: "ACTIVE",
            is_active: true,
            user_id: null,
            created_at: "2026-03-21T10:00:00Z",
            updated_at: "2026-03-21T11:00:00Z",
            deleted_at: null,
          },
        ];
      }
      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "STD", name: "Standard" }];
      }
      if (url.includes("/api/v1/admin/installer-rates")) {
        return [];
      }
      return [];
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallersPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Installer profile changes are read-only for your scope, but rate controls remain available.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Add Installer" })).toBeDisabled();
    const editButton = await screen.findByRole("button", { name: "Edit Installer Finance" });
    expect(editButton).toBeEnabled();
    fireEvent.click(editButton);
    expect(await screen.findByText("Installer Rates")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open KPI report" }));
    expect(pushMock).toHaveBeenCalledWith("/reports?installer_id=installer-1");
  }, 15000);

  it("opens installer card from deep-link installer_id", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("installer_id=installer-1"));
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OWNER",
      can_view_rates: true,
    });
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      if (url.includes("/api/v1/admin/installers?")) {
        return [
          {
            id: "installer-1",
            company_id: "company-1",
            full_name: "Installer Deep Link",
            phone: "050-1234567",
            email: "deep@example.com",
            status: "ACTIVE",
            is_active: true,
            user_id: "user-1",
            created_at: "2026-03-21T10:00:00Z",
            updated_at: "2026-03-21T11:00:00Z",
            deleted_at: null,
          },
        ];
      }
      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "STD", name: "Standard" }];
      }
      if (url.includes("/api/v1/admin/installer-rates")) {
        return [];
      }
      return [];
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallersPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Edit Installer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Installer Deep Link")).toBeInTheDocument();
    expect(screen.getByText("Focused installer installer-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all installers" }));
    expect(pushMock).toHaveBeenCalledWith("/installers");
  });

  it("creates installer and shows readable success notice", async () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OWNER",
      can_view_rates: true,
    });
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);
      if (url.includes("/api/v1/admin/installers?")) {
        return [];
      }
      if (url === "/api/v1/admin/installers" && init?.method === "POST") {
        return {
          id: "installer-1",
          company_id: "company-1",
          full_name: "New Installer",
          phone: null,
          email: null,
          status: "ACTIVE",
          is_active: true,
          user_id: null,
          created_at: "2026-03-21T10:00:00Z",
          updated_at: "2026-03-21T11:00:00Z",
          deleted_at: null,
        };
      }
      return [];
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallersPage />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Add Installer" }));
    fireEvent.change(screen.getAllByRole("textbox")[1], {
      target: { value: "New Installer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/admin/installers", {
        method: "POST",
        body: JSON.stringify({
          full_name: "New Installer",
          phone: null,
          email: null,
          address: null,
          passport_id: null,
          notes: null,
          status: "ACTIVE",
          is_active: true,
        }),
      });
    });

    expect(await screen.findByText("Installer created.")).toBeInTheDocument();
  });

});
