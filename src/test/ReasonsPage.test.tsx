import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import ReasonsPage from "@/views/ReasonsPage";

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

const reasonRow = {
  id: "reason-1",
  company_id: "company-1",
  code: "no_access",
  name: "No access to apartment",
  is_active: true,
  created_at: "2026-02-22T17:50:00Z",
  updated_at: "2026-02-22T17:50:00Z",
  deleted_at: null,
};

function renderSubject() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReasonsPage />
    </QueryClientProvider>,
  );
}

describe("ReasonsPage", () => {
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

  it("lists issue reasons from the reasons endpoint and creates a new one", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes("/api/v1/admin/reasons?")) return [reasonRow];
      if (path.endsWith("/api/v1/admin/reasons") && init?.method === "POST") {
        return { ...reasonRow, id: "reason-2", code: "client_absent", name: "Client absent" };
      }
      return {};
    });

    renderSubject();

    expect(await screen.findByRole("heading", { level: 1, name: "Issue reasons" })).toBeInTheDocument();
    // Rows render twice (mobile card + desktop table).
    expect((await screen.findAllByText("No access to apartment")).length).toBeGreaterThan(0);
    expect(apiFetchMock.mock.calls.some(([path]) => String(path).startsWith("/api/v1/admin/reasons?"))).toBe(true);
    expect(apiFetchMock.mock.calls.some(([path]) => String(path).includes("door-types"))).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Add Reason" }));
    await screen.findByText("Create Reason");
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[textboxes.length - 2], { target: { value: "client_absent" } });
    fireEvent.change(textboxes[textboxes.length - 1], { target: { value: "Client absent" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const post = apiFetchMock.mock.calls.find(([path, init]) => path === "/api/v1/admin/reasons" && init?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ code: "client_absent", name: "Client absent" });
    });
  });

  it("keeps the catalog read-only for a VIEWER", async () => {
    authSessionMock.mockReturnValue({ role: "ADMIN", admin_scope: "VIEWER", can_view_rates: false });
    apiFetchMock.mockImplementation(async (path: string) => (path.includes("/api/v1/admin/reasons?") ? [reasonRow] : {}));

    renderSubject();

    // Rows render twice (mobile card + desktop table).
    expect((await screen.findAllByText("No access to apartment")).length).toBeGreaterThan(0);
    // The page keeps the control visible but disabled for a read-only scope.
    expect(screen.getByRole("button", { name: "Add Reason" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Add Reason" }));
    expect(screen.queryByText("Create Reason")).not.toBeInTheDocument();
  });
});
