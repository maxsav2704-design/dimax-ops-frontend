import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import DoorTypesPage from "@/views/DoorTypesPage";

const { apiFetchMock, authSessionMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  authSessionMock: vi.fn(),
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

describe("DoorTypesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    authSessionMock.mockReset();
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OWNER",
      can_view_rates: true,
      can_manage_imports: true,
      can_manage_users: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists catalog rows and creates a new door type", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes("/api/v1/admin/door-types?")) {
        return [
          {
            id: "door-type-1",
            company_id: "company-1",
            code: "entry",
            name: "Entry Door",
            is_active: true,
            created_at: "2026-02-22T17:50:00Z",
            updated_at: "2026-02-22T17:50:00Z",
            deleted_at: null,
          },
        ];
      }
      if (path.endsWith("/api/v1/admin/door-types") && init?.method === "POST") {
        return {
          id: "door-type-2",
          company_id: "company-1",
          code: "mamad",
          name: "Mamad Door",
          is_active: true,
          created_at: "2026-02-22T18:00:00Z",
          updated_at: "2026-02-22T18:00:00Z",
          deleted_at: null,
        };
      }
      return {};
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DoorTypesPage />
      </QueryClientProvider>
    );

    expect((await screen.findAllByText("Entry Door")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Add Door Type" }));
    await screen.findByText("Create Door Type");

    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[textboxes.length - 2], { target: { value: "mamad" } });
    fireEvent.change(textboxes[textboxes.length - 1], { target: { value: "Mamad Door" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/admin/door-types"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  }, 20000);
  it("shows readable api error when catalog create fails", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes("/api/v1/admin/door-types?")) {
        return [
          {
            id: "door-type-1",
            company_id: "company-1",
            code: "entry",
            name: "Entry Door",
            is_active: true,
            created_at: "2026-02-22T17:50:00Z",
            updated_at: "2026-02-22T17:50:00Z",
            deleted_at: null,
          },
        ];
      }
      if (path.endsWith("/api/v1/admin/door-types") && init?.method === "POST") {
        const error = new Error("forbidden");
        Object.assign(error, { code: "FORBIDDEN_SCOPE", status: 403 });
        throw error;
      }
      return {};
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DoorTypesPage />
      </QueryClientProvider>
    );

    expect((await screen.findAllByText("Entry Door")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Add Door Type" }));
    await screen.findByText("Create Door Type");

    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[textboxes.length - 2], { target: { value: "mamad" } });
    fireEvent.change(textboxes[textboxes.length - 1], { target: { value: "Mamad Door" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("This action is not available for your access level.")
    ).toBeInTheDocument();
  }, 20000);

  it("keeps viewer catalog read-only even with capability flags", async () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "VIEWER",
      can_view_rates: false,
      can_manage_imports: true,
      can_manage_users: true,
    });
    apiFetchMock.mockResolvedValue([]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DoorTypesPage />
      </QueryClientProvider>,
    );

    const addButton = await screen.findByRole("button", {
      name: "Add Door Type",
    });
    expect(addButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();

    fireEvent.click(addButton);
    expect(screen.queryByText("Create Door Type")).not.toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
