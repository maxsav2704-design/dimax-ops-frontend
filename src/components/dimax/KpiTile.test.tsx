import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resolveKpiTone, sparklineGeometry } from "./kpi-logic";
import { KpiTile } from "./KpiTile";

vi.mock("@/lib/i18n", () => ({
  useCopy: () => (en: string) => en,
  useI18n: () => ({ locale: "en" }),
}));

describe("KpiTile tone (E4)", () => {
  it("crosses thresholds upward for counts that should stay low", () => {
    const t = { warn: 5, bad: 10 };
    expect(resolveKpiTone(0, t)).toBe("ok");
    expect(resolveKpiTone(4, t)).toBe("ok");
    expect(resolveKpiTone(5, t)).toBe("warn");
    expect(resolveKpiTone(10, t)).toBe("bad");
  });

  it("crosses thresholds downward for rates that should stay high", () => {
    const t = { warn: 95, bad: 90, direction: "down" as const };
    expect(resolveKpiTone(99, t)).toBe("ok");
    expect(resolveKpiTone(95, t)).toBe("warn");
    expect(resolveKpiTone(89, t)).toBe("bad");
  });

  it("is neutral without a metric or thresholds", () => {
    expect(resolveKpiTone(undefined, { warn: 1, bad: 2 })).toBe("neutral");
    expect(resolveKpiTone(3)).toBe("neutral");
  });
});

describe("sparkline geometry", () => {
  it("draws one point per value inside the box and ends on the last value", () => {
    const g = sparklineGeometry([1, 2, 3], 100, 20);
    expect(g.line.startsWith("M0.0")).toBe(true);
    expect(g.line.split(" L")).toHaveLength(3);
    expect(g.end).toEqual({ x: 100, y: 2 });
    expect(g.area.endsWith("L100 20 L0 20 Z")).toBe(true);
  });

  it("needs at least two points", () => {
    expect(sparklineGeometry([7]).end).toBeNull();
  });
});

describe("KpiTile rendering", () => {
  it("renders tone, delta and sparkline from data", () => {
    render(<KpiTile testId="kpi" label="Open problems" value={7} metric={7} previous={5} deltaLabel="vs last week" thresholds={{ warn: 5, bad: 10 }} series={[2, 3, 4, 7]} />);
    const tile = screen.getByTestId("kpi");
    expect(tile).toHaveAttribute("data-tone", "warn");
    expect(screen.getByTestId("kpi-delta")).toHaveTextContent("+2 vs last week");
    expect(screen.getByTestId("kpi-spark")).toBeInTheDocument();
    expect(tile.tagName).toBe("DIV");
  });

  it("becomes a pressed toggle when it filters the area below (E5)", () => {
    const onSelect = vi.fn();
    render(<KpiTile testId="kpi" label="Unassigned" value={4} selected onSelect={onSelect} />);
    const tile = screen.getByTestId("kpi");
    expect(tile.tagName).toBe("BUTTON");
    expect(tile).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(tile);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("stays neutral and busy while pending", () => {
    render(<KpiTile testId="kpi" label="Deliveries" value={2} metric={2} thresholds={{ warn: 1, bad: 5 }} pending />);
    const tile = screen.getByTestId("kpi");
    expect(tile).toHaveAttribute("data-tone", "neutral");
    expect(tile).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });
});
