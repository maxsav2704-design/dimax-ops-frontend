import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import LibraryPage from "@/views/LibraryPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("LibraryPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("renders library rows from admin endpoint", async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: "prod-1",
          sku: "SKU-100",
          name_ru: "Дверь входная",
          name_he: "דלת כניסה",
          install_type: "entrance",
          manufacturer: "DIMAX",
          unit: "piece",
          status: "ACTIVE",
          updated_at: "2026-03-25T12:00:00Z",
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LibraryPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("SKU-100")).toBeInTheDocument();
    expect(screen.getByText("Дверь входная")).toBeInTheDocument();
    expect(screen.getByText("entrance")).toBeInTheDocument();
  }, 15000);

  it("creates a library product", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith("/api/v1/admin/library?") || (path === "/api/v1/admin/library" && !init)) {
        if (!init) {
          return { items: [] };
        }
      }
      if (path === "/api/v1/admin/library" && init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({
            sku: "SKU-200",
            name_ru: "Замок",
            name_he: "מנעול",
            install_type: "lock",
            manufacturer: null,
            unit: "piece",
            status: "ACTIVE",
          })
        );
        return { id: "prod-2" };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LibraryPage />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole("button", { name: /add product/i }));
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SKU-200" } });
    fireEvent.change(screen.getByLabelText("Name RU"), { target: { value: "Замок" } });
    fireEvent.change(screen.getByLabelText("Name HE"), { target: { value: "מנעול" } });
    fireEvent.change(screen.getByLabelText("Install type"), { target: { value: "lock" } });

    fireEvent.click(screen.getAllByRole("button", { name: /^save$/i })[0]);

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/admin/library", {
        method: "POST",
        body: JSON.stringify({
          sku: "SKU-200",
          name_ru: "Замок",
          name_he: "מנעול",
          install_type: "lock",
          manufacturer: null,
          unit: "piece",
          status: "ACTIVE",
        }),
      });
    });
    expect(await screen.findByText("Library product created.")).toBeInTheDocument();
  }, 15000);
});
