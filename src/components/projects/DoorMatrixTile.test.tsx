import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DoorMatrixTile } from "./DoorMatrixTile";

const props = {
  status: "Installed", tone: "bg-status-ok-bg text-status-ok-fg", focused: false,
  selected: false, hasIssues: false, onInspect: vi.fn(), onToggleSelection: vi.fn(),
};

describe("DoorMatrixTile", () => {
  it("shows complete distinct markings including long identifiers", () => {
    const markings = ["A-101", "B-101", "ORDER-2026-DOOR-123456789"];
    render(<div>{markings.map((marking) => <DoorMatrixTile key={marking} {...props} marking={marking} inspectLabel={`Inspect ${marking}`} />)}</div>);
    for (const marking of markings) expect(screen.getByText(marking)).toBeInTheDocument();
    expect(screen.queryByText("101")).not.toBeInTheDocument();
  });

  it("separates opening a door from selection and exposes both states", () => {
    const onInspect = vi.fn();
    const onToggleSelection = vi.fn();
    render(<DoorMatrixTile {...props} marking="A-101" context="Apartment 21" inspectLabel="Inspect A-101" focused selected onInspect={onInspect} onToggleSelection={onToggleSelection} />);
    const button = screen.getByRole("button", { name: "Inspect A-101" });
    const checkbox = screen.getByRole("checkbox", { name: "Select door A-101" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Apartment 21")).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "A-101 · Installed · Apartment 21");
    expect(checkbox).toBeChecked();
    fireEvent.click(button);
    expect(onInspect).toHaveBeenCalledOnce();
    expect(onToggleSelection).not.toHaveBeenCalled();
    fireEvent.click(checkbox);
    expect(onToggleSelection).toHaveBeenCalledOnce();
    expect(onInspect).toHaveBeenCalledOnce();
  });

  it("renders the row with marking, model, apartment context, status and the state word", () => {
    render(<DoorMatrixTile {...props} density="rows" state="problem" model="M&M CS 90" context="507 · Entrance" marking="1-2-5-507" status="Not installed" hasIssues inspectLabel="Inspect 1-2-5-507" testId="row" />);
    const button = screen.getByTestId("row");
    expect(button).toHaveClass("dmx-door-row-face");
    expect(button).toHaveTextContent("1-2-5-507");
    expect(button).toHaveTextContent("M&M CS 90");
    expect(button).toHaveTextContent("507 · Entrance");
    expect(button).toHaveTextContent("Not installed");
    expect(button).toHaveAttribute("title", "1-2-5-507 · Not installed · 507 · Entrance");
    expect(button.parentElement).toHaveAttribute("data-state", "problem");
    expect(button.parentElement).toHaveAttribute("data-density", "rows");
    expect(screen.getByRole("checkbox", { name: "Select door 1-2-5-507" })).toBeInTheDocument();
  });
});
