import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstallerProjectPage from "@/views/installer/ProjectPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

const projectDetails = {
  id: "project-1",
  name: "Project One",
  address: "Address",
  waze_url: null,
  status: "IN_PROGRESS",
  server_time: "2026-03-07T09:00:00Z",
  reasons_catalog: [{ id: "reason-1", code: "R1", name: "Blocked" }],
  doors: [
    {
      id: "door-1",
      unit_label: "A-101",
      door_type_id: "door-type-1",
      our_price: "100.00",
      order_number: "ORD-1",
      house_number: "1",
      floor_label: "1",
      apartment_number: "101",
      location_code: "L1",
      door_marking: "M1",
      status: "NOT_INSTALLED",
      reason_id: null,
      comment: null,
      is_locked: false,
    },
    {
      id: "door-2",
      unit_label: "B-202",
      door_type_id: "door-type-1",
      our_price: "120.00",
      order_number: "ORD-2",
      house_number: "2",
      floor_label: "2",
      apartment_number: "202",
      location_code: "L2",
      door_marking: "MARK-2",
      status: "INSTALLED",
      reason_id: null,
      comment: null,
      is_locked: true,
    },
  ],
  issues_open: [],
  addons: {
    types: [{ id: "addon-1", name: "Handle", unit: "pcs" }],
    plan: [],
    facts: [],
  },
} as const;

function setupApiMock(details = projectDetails) {
  apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === "/api/v1/installer/projects/project-1") {
      return details;
    }
    if (path === "/api/v1/installer/doors/door-1/install" && init?.method === "POST") {
      return { ok: true };
    }
    if (
      path === "/api/v1/installer/doors/door-1/not-installed" &&
      init?.method === "POST"
    ) {
      return { ok: true };
    }
    if (
      path === "/api/v1/installer/addons/projects/project-1/facts" &&
      init?.method === "POST"
    ) {
      return { ok: true };
    }
    return { ok: true };
  });
}

function renderSubject() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InstallerProjectPage projectId="project-1" />
    </QueryClientProvider>
  );
}

describe("InstallerProjectPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("sends installer install action", async () => {
    setupApiMock();
    renderSubject();

    expect(await screen.findByText("Project One")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Installed" })[0]);

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/installer/doors/door-1/install", {
        method: "POST",
      });
    });
  }, 15000);

  it("sends installer not-installed action with reason and comment", async () => {
    setupApiMock();
    renderSubject();

    expect(await screen.findByText("Project One")).toBeInTheDocument();

    fireEvent.change(screen.getAllByPlaceholderText("Comment for NOT_INSTALLED")[0], {
      target: { value: "Need crane access" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Not installed" })[0]);

    await waitFor(() => {
      const calls = apiFetchMock.mock.calls as Array<[string, RequestInit | undefined]>;
      const call = calls.find(
        ([path, init]) =>
          path === "/api/v1/installer/doors/door-1/not-installed" &&
          init?.method === "POST"
      );
      expect(call).toBeTruthy();
      const payload = JSON.parse(String(call?.[1]?.body));
      expect(payload).toEqual({
        reason_id: "reason-1",
        comment: "Need crane access",
      });
    });
  });

  it("sends installer add-on fact action with payload", async () => {
    setupApiMock();
    renderSubject();

    expect(await screen.findByText("Project One")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("1"), { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("Optional comment"), {
      target: { value: "Extra hardware installed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Queue add-on fact" }));

    await waitFor(() => {
      const calls = apiFetchMock.mock.calls as Array<[string, RequestInit | undefined]>;
      const call = calls.find(
        ([path, init]) =>
          path === "/api/v1/installer/addons/projects/project-1/facts" &&
          init?.method === "POST"
      );
      expect(call).toBeTruthy();
      const payload = JSON.parse(String(call?.[1]?.body));
      expect(payload).toEqual({
        addon_type_id: "addon-1",
        qty_done: "3",
        comment: "Extra hardware installed",
      });
    });
  });

  it("shows no-open-issues empty state", async () => {
    setupApiMock();
    renderSubject();

    expect(await screen.findByText("No open issues.")).toBeInTheDocument();
  });

  it("filters open issues by search and status, then resets issue filters", async () => {
    setupApiMock({
      ...projectDetails,
      issues_open: [
        {
          id: "issue-1",
          door_id: "door-1",
          status: "OPEN",
          title: "Frame alignment",
          details: "Frame needs leveling",
        },
        {
          id: "issue-2",
          door_id: "door-2",
          status: "BLOCKED",
          title: "Lock blocked",
          details: "Waiting for spare part",
        },
      ],
    });
    renderSubject();

    expect(await screen.findByText("Frame alignment")).toBeInTheDocument();
    expect(screen.getByText("Lock blocked")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Issue, details, door"), {
      target: { value: "B-202" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Frame alignment")).not.toBeInTheDocument();
      expect(screen.getByText("Lock blocked")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Issue status filter"), {
      target: { value: "OPEN" },
    });

    expect(await screen.findByText("No issues match current filters.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset issue filters" }));

    await waitFor(() => {
      expect(screen.getByText("Frame alignment")).toBeInTheDocument();
      expect(screen.getByText("Lock blocked")).toBeInTheDocument();
    });
  });

  it("shows related door shortcuts inside open issues", async () => {
    setupApiMock({
      ...projectDetails,
      issues_open: [
        {
          id: "issue-1",
          door_id: "door-2",
          status: "BLOCKED",
          title: "Blocked lock",
          details: "Door remains blocked",
        },
      ],
    });
    renderSubject();

    expect(await screen.findByText("Blocked lock")).toBeInTheDocument();
    expect(screen.getByText("Door B-202")).toBeInTheDocument();
    expect(screen.getAllByText("BLOCKED").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Only this door B-202" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open door B-202" })).toHaveAttribute(
      "href",
      "#door-door-2"
    );
  });

  it("focuses issue-related doors from the issue workflow shortcuts", async () => {
    setupApiMock({
      ...projectDetails,
      issues_open: [
        {
          id: "issue-1",
          door_id: "door-2",
          status: "BLOCKED",
          title: "Blocked lock",
          details: "Door remains blocked",
        },
      ],
    });
    renderSubject();

    await screen.findByText("Blocked lock");

    fireEvent.click(screen.getByRole("button", { name: "Show issue doors" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Visible doors: 1 / 2");
      expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);
      expect(screen.queryByText("A-101")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Only this door B-202" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Visible doors: 1 / 2");
      expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);
      expect(screen.queryByText("A-101")).not.toBeInTheDocument();
    });
  });

  it("filters doors by quick search and resets filters", async () => {
    setupApiMock();
    renderSubject();

    expect(await screen.findByText("A-101")).toBeInTheDocument();
    expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);

    fireEvent.change(
      screen.getByPlaceholderText("Unit, order, apartment, location, marking"),
      {
        target: { value: "mark-2" },
      }
    );

    await waitFor(() => {
      expect(screen.queryByText("A-101")).not.toBeInTheDocument();
      expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset door filters" }));

    await waitFor(() => {
      expect(screen.getByText("A-101")).toBeInTheDocument();
      expect(screen.getByText("B-202")).toBeInTheDocument();
    });
  });

  it("filters doors by quick status shortcuts", async () => {
    setupApiMock({
      ...projectDetails,
      issues_open: [
        {
          id: "issue-1",
          door_id: "door-2",
          status: "OPEN",
          title: "Blocked lock",
          details: "Door remains blocked",
        },
      ],
    });
    renderSubject();

    expect(await screen.findByText("A-101")).toBeInTheDocument();
    expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Installed (1)" }));

    await waitFor(() => {
      expect(screen.queryByText("A-101")).not.toBeInTheDocument();
      expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "With issues (1)" }));

    await waitFor(() => {
      expect(screen.queryByText("A-101")).not.toBeInTheDocument();
      expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Locked (1)" }));

    await waitFor(() => {
      expect(screen.queryByText("A-101")).not.toBeInTheDocument();
      expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);
    });
  });

  it("shows sticky door summary bar and resets filters from it", async () => {
    setupApiMock({
      ...projectDetails,
      issues_open: [
        {
          id: "issue-1",
          door_id: "door-2",
          status: "OPEN",
          title: "Blocked lock",
          details: "Door remains blocked",
        },
      ],
    });
    renderSubject();

    expect(await screen.findByLabelText("Door summary bar")).toHaveTextContent(
      "Visible doors: 2 / 2"
    );
    expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Active filters: 0");
    expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Open issues: 1");

    fireEvent.change(
      screen.getByPlaceholderText("Unit, order, apartment, location, marking"),
      {
        target: { value: "A-101" },
      }
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Visible doors: 1 / 2");
      expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Active filters: 1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset all door filters" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Visible doors: 2 / 2");
      expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Active filters: 0");
      expect(screen.getByText("A-101")).toBeInTheDocument();
      expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);
    });
  });

  it("shows quick jump links for floors and issue doors", async () => {
    setupApiMock({
      ...projectDetails,
      issues_open: [
        {
          id: "issue-1",
          door_id: "door-2",
          status: "OPEN",
          title: "Blocked lock",
          details: "Door remains blocked",
        },
      ],
    });
    renderSubject();

    const summaryBar = await screen.findByLabelText("Door summary bar");

    expect(summaryBar).toHaveTextContent("Jump to floor:");
    expect(screen.getByRole("link", { name: "1 (1)" })).toHaveAttribute(
      "href",
      "#project-floor-1"
    );
    expect(screen.getByRole("link", { name: "2 (1)" })).toHaveAttribute(
      "href",
      "#project-floor-2"
    );
    expect(summaryBar).toHaveTextContent("Issue doors:");
    expect(screen.getByRole("link", { name: "B-202" })).toHaveAttribute(
      "href",
      "#door-door-2"
    );
  });

  it("shows priority doors for the next likely actions", async () => {
    setupApiMock({
      ...projectDetails,
      issues_open: [
        {
          id: "issue-1",
          door_id: "door-2",
          status: "OPEN",
          title: "Blocked lock",
          details: "Door remains blocked",
        },
      ],
    });
    renderSubject();

    const summaryBar = await screen.findByLabelText("Door summary bar");

    expect(summaryBar).toHaveTextContent("Priority doors:");
    expect(screen.getByRole("link", { name: "B-202 - Issue" })).toHaveAttribute(
      "href",
      "#door-door-2"
    );
    expect(screen.getByRole("link", { name: "A-101 - Not installed" })).toHaveAttribute(
      "href",
      "#door-door-1"
    );
  });

  it("filters directly to a priority door from the summary bar", async () => {
    setupApiMock({
      ...projectDetails,
      issues_open: [
        {
          id: "issue-1",
          door_id: "door-2",
          status: "OPEN",
          title: "Blocked lock",
          details: "Door remains blocked",
        },
      ],
    });
    renderSubject();

    await screen.findByLabelText("Door summary bar");

    fireEvent.click(screen.getByRole("button", { name: "Only this B-202" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Door summary bar")).toHaveTextContent("Visible doors: 1 / 2");
      expect(screen.getAllByText("B-202").length).toBeGreaterThan(0);
      expect(screen.queryByText("A-101")).not.toBeInTheDocument();
    });
  });

  it("shows retry action when project details query fails", async () => {
    let shouldFail = true;
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/projects/project-1") {
        if (shouldFail) {
          throw new Error("unavailable");
        }
        return projectDetails;
      }
      return { ok: true };
    });

    renderSubject();

    expect(await screen.findByText("Failed to load project details.")).toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Project One")).toBeInTheDocument();
  });
});
