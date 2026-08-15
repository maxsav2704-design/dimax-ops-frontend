import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { createDownloadResponse } from "@/test/download-response";
import EarningsLedgerPage from "@/views/EarningsLedgerPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { apiDownloadMock } = vi.hoisted(() => ({
  apiDownloadMock: vi.fn(),
}));
const { authSessionMock, searchParamsMock } = vi.hoisted(() => ({
  authSessionMock: vi.fn(),
  searchParamsMock: vi.fn(() => new URLSearchParams("")),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
  apiDownload: apiDownloadMock,
}));

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: authSessionMock,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock(),
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <EarningsLedgerPage />
    </QueryClientProvider>
  );
}

function dayStartIso(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

function dayEndIso(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function dateInputFromDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthRange(reference: Date): { from: string; to: string } {
  return {
    from: dateInputFromDate(new Date(reference.getFullYear(), reference.getMonth(), 1)),
    to: dateInputFromDate(new Date(reference.getFullYear(), reference.getMonth() + 1, 0)),
  };
}

function latestLedgerParams(): URLSearchParams {
  const calls = apiFetchMock.mock.calls.filter((call) =>
    String(call[0]).startsWith("/api/v1/admin/earnings/ledger?")
  );
  const latestCall = calls[calls.length - 1];
  return new URLSearchParams(String(latestCall?.[0]).split("?")[1]);
}

describe("EarningsLedgerPage", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/earnings-ledger");
    apiFetchMock.mockReset();
    apiDownloadMock.mockReset();
    authSessionMock.mockReset();
    searchParamsMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "FINANCE",
      can_view_rates: true,
      can_manage_imports: false,
      can_manage_users: false,
    });
  });

  it("renders payroll ledger rows and submits a correction", async () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OPERATIONS",
      can_view_rates: true,
      can_manage_imports: false,
      can_manage_users: false,
    });
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/admin/installers?limit=200") {
        return {
          items: [
            {
              id: "installer-1",
              full_name: "Installer Alpha",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/projects") {
        return {
          items: [
            {
              id: "project-1",
              name: "Ashdod Tower",
            },
          ],
        };
      }
      if (String(path).startsWith("/api/v1/admin/earnings/ledger?")) {
        return {
          total: 3,
          limit: 25,
          offset: 0,
          items: [
            {
              id: "work-1",
              entry_type: "ORIGINAL",
              correction_ref_id: null,
              completed_at: "2026-05-07T08:00:00Z",
              quantity: "1.00",
              rate_snapshot: "120.00",
              amount_snapshot: "120.00",
              reason: null,
              work_kind: "DOOR",
              project_id: "project-1",
              project_name: "Ashdod Tower",
              door_id: "door-1",
              door_label: "A-101",
              door_code: "D-101",
              addon_fact_id: null,
              installer_id: "installer-1",
              installer_name: "Installer Alpha",
              can_correct: true,
            },
            {
              id: "work-2",
              entry_type: "REVERSAL",
              correction_ref_id: "work-old",
              completed_at: "2026-05-07T09:00:00Z",
              quantity: "1.00",
              rate_snapshot: "-90.00",
              amount_snapshot: "-90.00",
              reason: "Admin rollback",
              work_kind: "DOOR",
              project_id: "project-1",
              project_name: "Ashdod Tower",
              door_id: "door-2",
              door_label: "A-102",
              door_code: "D-102",
              addon_fact_id: null,
              installer_id: "installer-1",
              installer_name: "Installer Alpha",
              can_correct: false,
            },
            {
              id: "work-3",
              entry_type: "ORIGINAL",
              correction_ref_id: null,
              completed_at: "2026-05-07T10:00:00Z",
              quantity: "2.00",
              rate_snapshot: "12.00",
              amount_snapshot: "24.00",
              reason: "Additional work",
              work_kind: "ADDON",
              project_id: "project-1",
              project_name: "Ashdod Tower",
              door_id: null,
              door_label: null,
              door_code: null,
              addon_fact_id: "addon-fact-1",
              addon_type_id: "addon-type-1",
              addon_type_name: "Frame foam",
              addon_comment: "Installer added offline",
              installer_id: "installer-1",
              installer_name: "Installer Alpha",
              can_correct: false,
            },
          ],
        };
      }
      if (path === "/api/v1/admin/earnings/corrections" && init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({
            completed_work_id: "work-1",
            rate_snapshot: "135.00",
            reason: "Rate agreed after payroll review",
          })
        );
        return {
          correction: {
            id: "work-correction",
            amount_snapshot: "135.00",
          },
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderPage();

    expect(await screen.findByText("Earnings Ledger")).toBeInTheDocument();
    expect((await screen.findAllByText("Installer Alpha")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Ashdod Tower")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("A-101").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Frame foam").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Installer added offline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("REVERSAL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Admin rollback").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /correct/i })[0]);
    fireEvent.change(screen.getByLabelText("New rate"), { target: { value: "135.00" } });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Rate agreed after payroll review" },
    });
    const saveButton = screen.getByRole("button", { name: /save correction/i });
    fireEvent.change(screen.getByLabelText("New rate"), { target: { value: "0" } });
    expect(saveButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("New rate"), { target: { value: "135.00" } });
    fireEvent.click(saveButton);

    expect(await screen.findByText(/Correction saved: 135[,.]00/)).toBeInTheDocument();
    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/admin/earnings/corrections", {
        method: "POST",
        body: JSON.stringify({
          completed_work_id: "work-1",
          rate_snapshot: "135.00",
          reason: "Rate agreed after payroll review",
        }),
      });
    });
  }, 15000);

  it("keeps payroll ledger closed without finance access", () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OPERATIONS",
      can_view_rates: false,
      can_manage_imports: false,
      can_manage_users: false,
    });

    renderPage();

    expect(screen.getByText("Payroll ledger requires finance access.")).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("uses installer, project and date filters from deep links", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams(
        "installer_id=installer-1&project_id=project-1&entry_type=REVERSAL&work_kind=ADDON&date_from=2026-05-01&date_to=2026-05-31"
      )
    );
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/installers?limit=200") {
        return { items: [{ id: "installer-1", full_name: "Installer Alpha" }] };
      }
      if (path === "/api/v1/admin/projects") {
        return { items: [{ id: "project-1", name: "Ashdod Tower" }] };
      }
      if (String(path).startsWith("/api/v1/admin/earnings/ledger?")) {
        return { total: 0, limit: 25, offset: 0, items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderPage();

    await waitFor(() => {
      const ledgerCall = apiFetchMock.mock.calls.find((call) =>
        String(call[0]).startsWith("/api/v1/admin/earnings/ledger?")
      );
      const params = new URLSearchParams(String(ledgerCall?.[0]).split("?")[1]);
      expect(params.get("installer_id")).toBe("installer-1");
      expect(params.get("project_id")).toBe("project-1");
      expect(params.get("entry_type")).toBe("REVERSAL");
      expect(params.get("work_kind")).toBe("ADDON");
      expect(params.get("date_from")).toBe(dayStartIso("2026-05-01"));
      expect(params.get("date_to")).toBe(dayEndIso("2026-05-31"));
    });
    await waitFor(() => {
      const urlParams = new URLSearchParams(window.location.search);
      expect(urlParams.get("entry_type")).toBe("REVERSAL");
      expect(urlParams.get("work_kind")).toBe("ADDON");
      expect(urlParams.get("date_from")).toBe("2026-05-01");
      expect(urlParams.get("date_to")).toBe("2026-05-31");
    });
  });

  it("does not load payroll ledger for an unavailable project deep link", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams("project_id=missing-project"),
    );
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/installers?limit=200") {
        return { items: [{ id: "installer-1", full_name: "Installer Alpha" }] };
      }
      if (path === "/api/v1/admin/projects") {
        return { items: [{ id: "project-1", name: "Ashdod Tower" }] };
      }
      if (String(path).startsWith("/api/v1/admin/earnings/ledger?")) {
        return { total: 0, limit: 25, offset: 0, items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderPage();

    expect(
      await screen.findByText(
        "Requested project missing-project is not available in the current payroll scope. The ledger was not loaded for another project.",
      ),
    ).toBeInTheDocument();
    expect(
      apiFetchMock.mock.calls.some((call) =>
        String(call[0]).startsWith("/api/v1/admin/earnings/ledger?"),
      ),
    ).toBe(false);
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Show all projects" }));

    await waitFor(() => {
      const params = latestLedgerParams();
      expect(params.get("project_id")).toBeNull();
    });
  });

  it("keeps ledger filters shareable in the url", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/installers?limit=200") {
        return { items: [{ id: "installer-1", full_name: "Installer Alpha" }] };
      }
      if (path === "/api/v1/admin/projects") {
        return { items: [{ id: "project-1", name: "Ashdod Tower" }] };
      }
      if (String(path).startsWith("/api/v1/admin/earnings/ledger?")) {
        return { total: 0, limit: 25, offset: 0, items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderPage();

    const installerFilter = (await screen.findByLabelText("Installer filter")) as HTMLSelectElement;
    const projectFilter = screen.getByLabelText("Project filter") as HTMLSelectElement;
    const entryTypeFilter = screen.getByLabelText("Entry type filter") as HTMLSelectElement;
    const workKindFilter = screen.getByLabelText("Work kind filter") as HTMLSelectElement;
    const now = new Date();
    const currentMonth = monthRange(now);

    fireEvent.change(installerFilter, { target: { value: "installer-1" } });
    fireEvent.change(projectFilter, { target: { value: "project-1" } });
    fireEvent.change(entryTypeFilter, { target: { value: "CORRECTION" } });
    fireEvent.change(workKindFilter, { target: { value: "ADDON" } });
    fireEvent.click(screen.getByRole("button", { name: "This month" }));

    await waitFor(() => {
      const urlParams = new URLSearchParams(window.location.search);
      expect(window.location.pathname).toBe("/earnings-ledger");
      expect(urlParams.get("installer_id")).toBe("installer-1");
      expect(urlParams.get("project_id")).toBe("project-1");
      expect(urlParams.get("entry_type")).toBe("CORRECTION");
      expect(urlParams.get("work_kind")).toBe("ADDON");
      expect(urlParams.get("date_from")).toBe(currentMonth.from);
      expect(urlParams.get("date_to")).toBe(currentMonth.to);
    });

    fireEvent.change(entryTypeFilter, { target: { value: "all" } });
    fireEvent.change(workKindFilter, { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));

    await waitFor(() => {
      const urlParams = new URLSearchParams(window.location.search);
      expect(urlParams.get("installer_id")).toBe("installer-1");
      expect(urlParams.get("project_id")).toBe("project-1");
      expect(urlParams.get("entry_type")).toBeNull();
      expect(urlParams.get("work_kind")).toBeNull();
      expect(urlParams.get("date_from")).toBeNull();
      expect(urlParams.get("date_to")).toBeNull();
    });
  });

  it("shows active payroll filters and clears them together", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams(
        "installer_id=installer-1&project_id=project-1&entry_type=CORRECTION&work_kind=ADDON&date_from=2026-05-01&date_to=2026-05-31"
      )
    );
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/installers?limit=200") {
        return { items: [{ id: "installer-1", full_name: "Installer Alpha" }] };
      }
      if (path === "/api/v1/admin/projects") {
        return { items: [{ id: "project-1", name: "Ashdod Tower" }] };
      }
      if (String(path).startsWith("/api/v1/admin/earnings/ledger?")) {
        return { total: 0, limit: 25, offset: 0, items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderPage();

    const activeFilters = await screen.findByLabelText("Active ledger filters");
    expect(within(activeFilters).getByText("Active filters")).toBeInTheDocument();
    expect(await within(activeFilters).findByText("Installer Alpha")).toBeInTheDocument();
    expect(await within(activeFilters).findByText("Ashdod Tower")).toBeInTheDocument();
    expect(within(activeFilters).getByText("CORRECTION")).toBeInTheDocument();
    expect(within(activeFilters).getByText("ADDON")).toBeInTheDocument();
    expect(within(activeFilters).getByText("2026-05-01 - 2026-05-31")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Active ledger filters")).not.toBeInTheDocument();
      const params = latestLedgerParams();
      expect(params.get("installer_id")).toBeNull();
      expect(params.get("project_id")).toBeNull();
      expect(params.get("entry_type")).toBeNull();
      expect(params.get("work_kind")).toBeNull();
      expect(params.get("date_from")).toBeNull();
      expect(params.get("date_to")).toBeNull();
    });
  });

  it("applies monthly period shortcuts and clears dates", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/installers?limit=200") {
        return { items: [{ id: "installer-1", full_name: "Installer Alpha" }] };
      }
      if (path === "/api/v1/admin/projects") {
        return { items: [{ id: "project-1", name: "Ashdod Tower" }] };
      }
      if (String(path).startsWith("/api/v1/admin/earnings/ledger?")) {
        return { total: 0, limit: 25, offset: 0, items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderPage();

    const dateFromInput = (await screen.findByLabelText("Date from")) as HTMLInputElement;
    const dateToInput = screen.getByLabelText("Date to") as HTMLInputElement;
    const now = new Date();
    const currentMonth = monthRange(now);
    const previousMonth = monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    fireEvent.click(screen.getByRole("button", { name: "This month" }));

    await waitFor(() => expect(dateFromInput.value).toBe(currentMonth.from));
    expect(dateToInput.value).toBe(currentMonth.to);
    let params = latestLedgerParams();
    expect(params.get("date_from")).toBe(dayStartIso(currentMonth.from));
    expect(params.get("date_to")).toBe(dayEndIso(currentMonth.to));

    fireEvent.click(screen.getByRole("button", { name: "Last month" }));

    await waitFor(() => expect(dateFromInput.value).toBe(previousMonth.from));
    expect(dateToInput.value).toBe(previousMonth.to);
    params = latestLedgerParams();
    expect(params.get("date_from")).toBe(dayStartIso(previousMonth.from));
    expect(params.get("date_to")).toBe(dayEndIso(previousMonth.to));

    fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));

    await waitFor(() => expect(dateFromInput.value).toBe(""));
    expect(dateToInput.value).toBe("");
    params = latestLedgerParams();
    expect(params.get("date_from")).toBeNull();
    expect(params.get("date_to")).toBeNull();
  });

  it("exports the currently filtered payroll ledger", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams(
        "installer_id=installer-1&project_id=project-1&date_from=2026-05-01&date_to=2026-05-31"
      )
    );
    if (!("createObjectURL" in URL)) {
      Object.defineProperty(URL, "createObjectURL", {
        writable: true,
        configurable: true,
        value: vi.fn(),
      });
    }
    if (!("revokeObjectURL" in URL)) {
      Object.defineProperty(URL, "revokeObjectURL", {
        writable: true,
        configurable: true,
        value: vi.fn(),
      });
    }
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:earnings-ledger");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    apiDownloadMock.mockResolvedValue(
      createDownloadResponse("id,amount\nwork-1,120.00", "text/csv", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="earnings_ledger.csv"',
        },
      })
    );
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/installers?limit=200") {
        return { items: [{ id: "installer-1", full_name: "Installer Alpha" }] };
      }
      if (path === "/api/v1/admin/projects") {
        return { items: [{ id: "project-1", name: "Ashdod Tower" }] };
      }
      if (String(path).startsWith("/api/v1/admin/earnings/ledger?")) {
        return { total: 0, limit: 25, offset: 0, items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderPage();

    const exportButton = await screen.findByRole("button", { name: "Export CSV" });
    await waitFor(() => expect(exportButton).toBeEnabled());
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(apiDownloadMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/admin/earnings/ledger/export?"),
        { method: "GET", credentials: "include" }
      );
    });
    const exportParams = new URLSearchParams(String(apiDownloadMock.mock.calls[0][0]).split("?")[1]);
    expect(exportParams.get("installer_id")).toBe("installer-1");
    expect(exportParams.get("project_id")).toBe("project-1");
    expect(exportParams.get("date_from")).toBe(dayStartIso("2026-05-01"));
    expect(exportParams.get("date_to")).toBe(dayEndIso("2026-05-31"));
    expect(exportParams.get("limit")).toBe("10000");
    expect(await screen.findByText("Ledger export is ready.")).toBeInTheDocument();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:earnings-ledger");
  });
});
