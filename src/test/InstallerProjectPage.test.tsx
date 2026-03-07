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
  ],
  issues_open: [],
  addons: {
    types: [{ id: "addon-1", name: "Handle", unit: "pcs" }],
    plan: [],
    facts: [],
  },
};

function setupApiMock() {
  apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === "/api/v1/installer/projects/project-1") {
      return projectDetails;
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

    fireEvent.click(screen.getByRole("button", { name: "Installed" }));

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

    fireEvent.change(screen.getByPlaceholderText("Comment for NOT_INSTALLED"), {
      target: { value: "Need crane access" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Not installed" }));

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
