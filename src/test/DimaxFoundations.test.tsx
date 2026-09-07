import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Breadcrumbs,
  FabButton,
  KpiCard,
  MetricRow,
  PillButton,
  WidgetCard,
} from "@/components/dimax";

describe("DIMAX foundation components", () => {
  it("renders the yellow create button with dark accent text", () => {
    render(
      <PillButton variant="accent" iconStart="+">
        Create project
      </PillButton>,
    );

    expect(screen.getByRole("button", { name: "Create project" })).toHaveClass(
      "bg-accent",
      "text-accent-text",
      "rounded-pill",
    );
  });

  it("keeps the FAB icon-only and accessible", () => {
    render(<FabButton aria-label="Quick create" />);

    expect(screen.getByRole("button", { name: "Quick create" })).toHaveClass(
      "bg-accent",
      "rounded-pill",
    );
  });

  it("renders hash-separated breadcrumbs with current page state", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: "PRJ-2025-0118" },
        ]}
      />,
    );

    expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();
    expect(screen.getByText("PRJ-2025-0118")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByText("#")).toHaveLength(2);
  });

  it("renders the Workiz-style KPI rail", () => {
    render(
      <KpiCard
        label="Doors installed"
        value="28 / 42"
        hint="67% on track"
        barColor="green"
      />,
    );

    expect(screen.getByText("Doors installed").closest("div")).toHaveClass(
      "text-text-secondary",
    );
    expect(screen.getByText("28 / 42")).toHaveClass("text-24", "text-text");
  });

  it("renders DIMAX widget cards with metric rows", () => {
    render(
      <WidgetCard title="Finance" headerMeta="current project" bleed>
        <MetricRow label="Revenue" value="120,000" barColor="green" />
        <MetricRow label="Open issues" value="2" barColor="red" />
      </WidgetCard>,
    );

    expect(screen.getByText("Finance")).toHaveClass("text-13", "text-text");
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Open issues")).toBeInTheDocument();
    expect(screen.getByText("2")).toHaveClass("font-medium", "tabular-nums");
  });
});
