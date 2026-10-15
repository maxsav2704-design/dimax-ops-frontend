import { describe, expect, it } from "vitest";
import { QUERY_STALE_TIME_MS, createAppQueryClient } from "./query-client";

describe("createAppQueryClient", () => {
  it("keeps fetched data fresh for 30 s and does not refetch on window focus", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(QUERY_STALE_TIME_MS);
    expect(QUERY_STALE_TIME_MS).toBe(30_000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });

  it("lets a query opt out of the shared policy for financial data", () => {
    const client = createAppQueryClient();
    const resolved = client.defaultQueryOptions({ queryKey: ["price-check"], staleTime: 0 });
    expect(resolved.staleTime).toBe(0);
    expect(resolved.refetchOnWindowFocus).toBe(false);
  });

  it("still marks data stale after invalidation so mutations refresh their lists", async () => {
    const client = createAppQueryClient();
    client.setQueryData(["projects"], [{ id: "a" }]);
    expect(client.getQueryState(["projects"])?.isInvalidated).toBe(false);
    await client.invalidateQueries({ queryKey: ["projects"], refetchType: "none" });
    expect(client.getQueryState(["projects"])?.isInvalidated).toBe(true);
  });
});
