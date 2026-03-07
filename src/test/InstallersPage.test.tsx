import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import InstallersPage from "@/views/InstallersPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { userRoleMock } = vi.hoisted(() => ({
  userRoleMock: vi.fn(),
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: userRoleMock,
}));

describe("InstallersPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    userRoleMock.mockReset();
  });

  it("disables privileged installer actions for installer role", async () => {
    userRoleMock.mockReturnValue("INSTALLER");
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
  });
});
