import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstallerEarningsPage from "@/views/installer/EarningsPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
  apiFetch: apiFetchMock,
}));

describe("InstallerEarningsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    window.history.replaceState({}, "", "/installer/earnings");
  });

  it("renders earnings summary with grouped rows", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/earnings/summary") {
        return {
          currency: "ILS",
          today_total: 240,
          month_total: 3100,
          by_install_type: [
            { install_type: "INSTALLATION", amount: 200 },
            { install_type: "SERVICE", amount: 40 },
          ],
          by_project: [{ project_id: "p1", project_name: "Ashdod Towers", amount: 240 }],
          by_day: [{ date: "2026-03-21", amount: 240 }],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerEarningsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Installer earnings")).toBeInTheDocument();
    expect(await screen.findAllByText("240 ILS")).toHaveLength(3);
    expect(await screen.findByText(/3.?100 ILS/)).toBeInTheDocument();
    expect(await screen.findByText("INSTALLATION")).toBeInTheDocument();
    expect(await screen.findByText("Ashdod Towers")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Open project" })).toHaveAttribute(
      "href",
      "/installer/projects/p1"
    );
    expect(await screen.findByRole("link", { name: "Open calendar" })).toHaveAttribute(
      "href",
      "/installer/calendar?project_id=p1"
    );
    expect(await screen.findByText("2026-03-21")).toBeInTheDocument();
  });

  it("shows unavailable state when earnings endpoint is missing", async () => {
    apiFetchMock.mockRejectedValue(new Error("offline"));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerEarningsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Earnings are currently unavailable.")).toBeInTheDocument();
  });

  it("filters project rows from deep-link project_id", async () => {
    window.history.replaceState({}, "", "/installer/earnings?project_id=p1");
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/earnings/summary") {
        return {
          currency: "ILS",
          today_total: 240,
          month_total: 3100,
          by_install_type: [{ install_type: "INSTALLATION", amount: 200 }],
          by_project: [
            { project_id: "p1", project_name: "Ashdod Towers", amount: 240 },
            { project_id: "p2", project_name: "Rehov Heights", amount: 120 },
          ],
          by_day: [{ date: "2026-03-21", amount: 240 }],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerEarningsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Focused project p1")).toBeInTheDocument();
    expect(await screen.findByText("Ashdod Towers")).toBeInTheDocument();
    expect(screen.queryByText("Rehov Heights")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show all earnings" })).toHaveAttribute(
      "href",
      "/installer/earnings"
    );
    expect(screen.getByRole("link", { name: "Open calendar" })).toHaveAttribute(
      "href",
      "/installer/calendar?project_id=p1"
    );
    expect(screen.getByRole("link", { name: "Open sync queue" })).toHaveAttribute(
      "href",
      "/installer/sync-queue?project_id=p1"
    );
  });
});
