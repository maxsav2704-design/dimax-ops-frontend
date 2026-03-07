import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstallerSchedulePage from "@/views/installer/SchedulePage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { buildScheduleCsvMock, downloadScheduleCsvMock, scheduleExportFilenameMock } =
  vi.hoisted(() => ({
    buildScheduleCsvMock: vi.fn(() => "csv-content"),
    downloadScheduleCsvMock: vi.fn(),
    scheduleExportFilenameMock: vi.fn(() => "installer_schedule_test.csv"),
  }));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/views/installer/schedule-export", () => ({
  buildScheduleCsv: buildScheduleCsvMock,
  downloadScheduleCsv: downloadScheduleCsvMock,
  scheduleExportFilename: scheduleExportFilenameMock,
}));

describe("InstallerSchedulePage export button", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    buildScheduleCsvMock.mockClear();
    downloadScheduleCsvMock.mockClear();
    scheduleExportFilenameMock.mockClear();
    window.history.pushState({}, "", "/installer/calendar");
  });

  it("exports CSV for currently filtered events", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Installation event",
              event_type: "installation",
              starts_at: "2026-03-08T08:00:00Z",
              ends_at: "2026-03-08T09:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-1",
              installer_ids: ["installer-1"],
            },
            {
              id: "event-2",
              title: "Delivery event",
              event_type: "delivery",
              starts_at: "2026-03-08T10:00:00Z",
              ends_at: "2026-03-08T11:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-2",
              installer_ids: ["installer-1"],
            },
          ],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Installation event")).toBeInTheDocument();
    expect(await screen.findByText("Delivery event")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Event type"), {
      target: { value: "delivery" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Installation event")).not.toBeInTheDocument();
      expect(screen.getByText("Delivery event")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => {
      expect(buildScheduleCsvMock).toHaveBeenCalledTimes(1);
      expect(downloadScheduleCsvMock).toHaveBeenCalledWith(
        "csv-content",
        "installer_schedule_test.csv"
      );
    });

    const exportedRows = buildScheduleCsvMock.mock.calls[0][0] as Array<{ title: string }>;
    expect(exportedRows).toHaveLength(1);
    expect(exportedRows[0].title).toBe("Delivery event");
  });
});
