import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FactStrip } from "./FactStrip";

describe("FactStrip", () => {
  it("renders facts in one definition list with tone dots only for states and a rail for done/total", () => {
    render(
      <FactStrip
        testId="facts"
        items={[
          { key: "doors", label: "Doors installed", value: "3 / 10", tone: "neutral", rail: { done: 3, total: 10 }, testId: "fact-doors" },
          { key: "issues", label: "Open issues", value: 2, detail: "1 blocked", tone: "bad", testId: "fact-issues" },
          { key: "margin", label: "Margin", value: "31 %", tone: "neutral", testId: "fact-margin" },
        ]}
      />,
    );
    const list = screen.getByTestId("facts");
    expect(list.tagName).toBe("DL");
    expect(screen.getByText("Doors installed")).toBeInTheDocument();
    expect(screen.getByTestId("fact-issues")).toHaveAttribute("data-tone", "bad");
    expect(screen.getByTestId("fact-issues").querySelector(".dmx-fact-dot")).not.toBeNull();
    expect(screen.getByTestId("fact-margin").querySelector(".dmx-fact-dot")).toBeNull();
    const rail = screen.getByRole("img", { name: "3 / 10" });
    expect(rail.firstElementChild).toHaveStyle({ width: "30%" });
    expect(screen.getByText("1 blocked")).toBeInTheDocument();
  });

  it("clamps the rail to the 0..1 range and tolerates an empty total", () => {
    render(
      <FactStrip
        items={[
          { key: "a", label: "A", value: "9 / 5", rail: { done: 9, total: 5 } },
          { key: "b", label: "B", value: "0 / 0", rail: { done: 0, total: 0 } },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "9 / 5" }).firstElementChild).toHaveStyle({ width: "100%" });
    expect(screen.getByRole("img", { name: "0 / 0" }).firstElementChild).toHaveStyle({ width: "0%" });
  });
});
