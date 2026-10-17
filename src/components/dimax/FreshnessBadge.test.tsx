import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resolveFreshness } from "./freshness";
import { FreshnessBadge } from "./FreshnessBadge";

vi.mock("@/lib/i18n", () => ({
  useCopy: () => (en: string) => en,
  useI18n: () => ({ locale: "en" }),
}));

const NOW = Date.parse("2026-10-17T10:00:00Z");

describe("freshness (E8)", () => {
  it("is fresh under the threshold, stale above it, offline when told so", () => {
    expect(resolveFreshness(NOW - 30_000, NOW).state).toBe("fresh");
    expect(resolveFreshness(NOW - 14 * 60_000, NOW)).toEqual({ state: "stale", ageMs: 14 * 60_000 });
    expect(resolveFreshness(NOW - 14 * 60_000, NOW, undefined, true).state).toBe("offline");
    expect(resolveFreshness(null, NOW).state).toBe("fresh");
  });

  it("stays quiet when fresh and offers refresh when stale", () => {
    const onRefresh = vi.fn();
    const { rerender } = render(<FreshnessBadge testId="f" updatedAt={NOW - 10_000} now={NOW} onRefresh={onRefresh} />);
    expect(screen.getByTestId("f")).toHaveAttribute("data-state", "fresh");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<FreshnessBadge testId="f" updatedAt={NOW - 14 * 60_000} now={NOW} onRefresh={onRefresh} />);
    expect(screen.getByTestId("f")).toHaveAttribute("data-state", "stale");
    expect(screen.getByTestId("f")).toHaveTextContent("Updated 14 min ago");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("names the offline state", () => {
    render(<FreshnessBadge testId="f" updatedAt={NOW} now={NOW} offline />);
    expect(screen.getByTestId("f")).toHaveAttribute("data-state", "offline");
    expect(screen.getByTestId("f")).toHaveTextContent("Offline, showing saved data");
  });
});
