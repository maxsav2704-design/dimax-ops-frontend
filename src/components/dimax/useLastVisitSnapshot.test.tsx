import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { previousValues, readSnapshot, useLastVisitSnapshot, writeSnapshot } from "./useLastVisitSnapshot";

const KEY = "dmx.test.snapshot";

function Probe({ open, free, ready }: { open: number | null; free: number | null; ready: boolean }) {
  const { previous, previousAt } = useLastVisitSnapshot(KEY, { open, free }, { ready });
  return (
    <div>
      <span data-testid="prev-open">{String(previous.open)}</span>
      <span data-testid="prev-free">{String(previous.free)}</span>
      <span data-testid="prev-at">{String(previousAt)}</span>
    </div>
  );
}

describe("since-your-last-visit snapshot (E4)", () => {
  beforeEach(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  });

  it("stores only finite numbers and reads them back", () => {
    writeSnapshot(window.localStorage, KEY, { open: 3, free: null, odd: Number.NaN }, 1000);
    expect(readSnapshot(window.localStorage, KEY)).toEqual({ at: 1000, values: { open: 3 } });
    expect(previousValues(readSnapshot(window.localStorage, KEY), ["open", "free"])).toEqual({ open: 3, free: undefined });
    expect(readSnapshot({ getItem: () => "not json" }, KEY)).toBeNull();
  });

  it("reports the previous visit's values and replaces the snapshot with this visit's", () => {
    writeSnapshot(window.localStorage, KEY, { open: 5, free: 1 }, Date.now() - 60_000);
    const { rerender } = render(<Probe open={null} free={null} ready={false} />);
    expect(screen.getByTestId("prev-open")).toHaveTextContent("undefined");
    rerender(<Probe open={7} free={0} ready />);
    expect(screen.getByTestId("prev-open")).toHaveTextContent("5");
    expect(screen.getByTestId("prev-free")).toHaveTextContent("1");
    expect(screen.getByTestId("prev-at")).not.toHaveTextContent("null");
    expect(readSnapshot(window.localStorage, KEY)?.values).toEqual({ open: 7, free: 0 });
    // Values moving during the same visit do not change the "previous visit" baseline.
    rerender(<Probe open={9} free={0} ready />);
    expect(screen.getByTestId("prev-open")).toHaveTextContent("5");
    expect(readSnapshot(window.localStorage, KEY)?.values).toEqual({ open: 9, free: 0 });
  });

  it("ignores a snapshot older than the limit", () => {
    writeSnapshot(window.localStorage, KEY, { open: 5, free: 1 }, Date.now() - 40 * 24 * 60 * 60 * 1000);
    render(<Probe open={7} free={0} ready />);
    expect(screen.getByTestId("prev-open")).toHaveTextContent("undefined");
    expect(screen.getByTestId("prev-at")).toHaveTextContent("null");
  });
});
