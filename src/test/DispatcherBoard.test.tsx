import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DispatcherBoard } from "@/components/dashboard/DispatcherBoard";

describe("DispatcherBoard", () => {
  it("renders dispatch priorities and opens project callback", () => {
    const onOpenProject = vi.fn();

    render(
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
    );

    expect(screen.getByTestId("dispatcher-board")).toBeInTheDocument();
    expect(screen.getByText("Ashdod Towers")).toBeInTheDocument();
    expect(screen.getAllByText("Alpha Crew").length).toBeGreaterThan(0);
    expect(screen.getByText("Needs dispatch: 3")).toBeInTheDocument();
    expect(screen.getAllByText(/Tower A installation/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Open project" }));
    expect(onOpenProject).toHaveBeenCalledWith("project-1");
  });
});
