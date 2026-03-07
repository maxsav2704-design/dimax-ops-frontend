import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import DoorTypesPage from "@/views/DoorTypesPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

describe("DoorTypesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
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

    expect(await screen.findByText("Entry Door")).toBeInTheDocument();

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
});
