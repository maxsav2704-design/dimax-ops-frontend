import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DispatcherBoard } from "@/components/dashboard/DispatcherBoard";
import { LanguageProvider } from "@/lib/i18n";

const storageState = new Map<string, string>();

const storageMock = {
  getItem: (key: string) => storageState.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageState.set(key, value);
  },
  removeItem: (key: string) => {
    storageState.delete(key);
  },
};

describe("DispatcherBoard", () => {
  beforeEach(() => {
    storageState.clear();
    document.documentElement.lang = "en";
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      configurable: true,
    });
  });

  it("renders dispatch priorities and opens project callback", () => {
    const onOpenProject = vi.fn();

    render(
      <LanguageProvider>
        <DispatcherBoard
          summary={{
            total_projects: 4,
            total_doors: 20,
            installed_doors: 12,
            pending_doors: 8,
            projects_needing_dispatch: 3,
            open_issues: 2,
            blocked_issues: 1,
            unassigned_doors: 3,
            available_installers: 1,
            busy_installers: 1,
            scheduled_visits_7d: 2,
          }}
          projects={[
            {
              project_id: "project-1",
              project_name: "Ashdod Towers",
              address: "Ashdod, Tower A",
              project_status: "PROBLEM",
              dispatch_status: "BLOCKED",
              contact_name: "Eyal Cohen",
              total_doors: 12,
              installed_doors: 7,
              pending_doors: 5,
              assigned_open_doors: 2,
              unassigned_doors: 3,
              open_issues: 2,
              blocked_issues: 1,
              completion_pct: 58.3,
              next_visit_at: "2026-03-02T08:00:00Z",
              next_visit_title: "Tower A installation",
              recommended_installers: [
                {
                  installer_id: "installer-1",
                  installer_name: "Alpha Crew",
                  availability_band: "AVAILABLE",
                  active_projects: 1,
                  assigned_open_doors: 2,
                  open_issues: 0,
                  next_event_at: null,
                },
              ],
            },
          ]}
          installers={[
            {
              installer_id: "installer-1",
              installer_name: "Alpha Crew",
              status: "ACTIVE",
              availability_band: "AVAILABLE",
              is_active: true,
              phone: "+972500000001",
              email: null,
              active_projects: 1,
              assigned_open_doors: 2,
              open_issues: 0,
              next_event_at: null,
              next_event_title: null,
            },
          ]}
          onOpenProject={onOpenProject}
        />
      </LanguageProvider>
    );

    expect(screen.getByTestId("dispatcher-board")).toBeInTheDocument();
    expect(screen.getByText("Ashdod Towers")).toBeInTheDocument();
    expect(screen.getByText("Alpha Crew")).toBeInTheDocument();
    expect(
      screen.getAllByText("Projects waiting for assignment").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tower A installation/).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Open project: Ashdod Towers" }),
    );
    expect(onOpenProject).toHaveBeenCalledWith("project-1");
  });

  it("renders hebrew copy when locale is hebrew", () => {
    document.documentElement.lang = "he";
    window.localStorage.setItem("dimax_locale", "he");

    render(
      <LanguageProvider>
        <DispatcherBoard
          summary={{
            total_projects: 0,
            total_doors: 0,
            installed_doors: 0,
            pending_doors: 0,
            projects_needing_dispatch: 0,
            open_issues: 0,
            blocked_issues: 0,
            unassigned_doors: 0,
            available_installers: 0,
            busy_installers: 0,
            scheduled_visits_7d: 0,
          }}
          projects={[]}
          installers={[]}
        />
      </LanguageProvider>
    );

    expect(screen.getByText("מה דורש טיפול")).toBeInTheDocument();
    expect(screen.getByText("אין שיבוצים דחופים.")).toBeInTheDocument();
  });

  it("filters projects from a pressed summary item and clears through the chip (E5, E1)", () => {
    const base = {
      address: "Ashdod", project_status: "ACTIVE", dispatch_status: "READY", contact_name: null,
      total_doors: 10, installed_doors: 5, pending_doors: 5, assigned_open_doors: 5, completion_pct: 50,
      next_visit_at: null, next_visit_title: null, recommended_installers: [],
    };
    render(
      <LanguageProvider>
        <DispatcherBoard
          summary={{
            total_projects: 2, total_doors: 20, installed_doors: 10, pending_doors: 10, projects_needing_dispatch: 1,
            open_issues: 2, blocked_issues: 1, unassigned_doors: 3, available_installers: 1, busy_installers: 1, scheduled_visits_7d: 0,
          }}
          projects={[
            { ...base, project_id: "p-hot", project_name: "Hot Project", unassigned_doors: 3, open_issues: 2, blocked_issues: 1 },
            { ...base, project_id: "p-quiet", project_name: "Quiet Project", unassigned_doors: 0, open_issues: 0, blocked_issues: 0 },
          ]}
          installers={[]}
          projectFilter={null}
          onToggleFilter={() => {}}
        />
      </LanguageProvider>,
    );
    expect(screen.getByRole("button", { name: "Open project: Hot Project" })).toHaveAttribute("data-attention", "3");
    expect(screen.getByRole("button", { name: "Open project: Quiet Project" })).not.toHaveAttribute("data-attention");
    expect(screen.getByRole("button", { name: /Doors without installer/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("dispatcher-filter")).not.toBeInTheDocument();
  });

  it("shows only matching projects while a filter is active", () => {
    const onToggleFilter = vi.fn();
    const base = {
      address: "Ashdod", project_status: "ACTIVE", dispatch_status: "READY", contact_name: null,
      total_doors: 10, installed_doors: 5, pending_doors: 5, assigned_open_doors: 5, completion_pct: 50,
      next_visit_at: null, next_visit_title: null, recommended_installers: [],
    };
    render(
      <LanguageProvider>
        <DispatcherBoard
          summary={{
            total_projects: 2, total_doors: 20, installed_doors: 10, pending_doors: 10, projects_needing_dispatch: 1,
            open_issues: 2, blocked_issues: 1, unassigned_doors: 3, available_installers: 1, busy_installers: 1, scheduled_visits_7d: 0,
          }}
          projects={[
            { ...base, project_id: "p-hot", project_name: "Hot Project", unassigned_doors: 3, open_issues: 2, blocked_issues: 1 },
            { ...base, project_id: "p-quiet", project_name: "Quiet Project", unassigned_doors: 0, open_issues: 0, blocked_issues: 0 },
          ]}
          installers={[]}
          projectFilter="unassigned"
          onToggleFilter={onToggleFilter}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText("Hot Project")).toBeInTheDocument();
    expect(screen.queryByText("Quiet Project")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Doors without installer/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("dispatcher-filter")).toHaveTextContent("Doors without installer");
    fireEvent.click(screen.getByRole("button", { name: "Remove filter" }));
    expect(onToggleFilter).toHaveBeenCalledWith("unassigned");
  });
});
