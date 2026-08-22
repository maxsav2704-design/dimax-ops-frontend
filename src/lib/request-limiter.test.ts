import { describe, expect, it, vi } from "vitest";

import { createRequestLimiter } from "@/lib/request-limiter";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("createRequestLimiter", () => {
  it("starts no more than the configured number of requests", async () => {
    const limiter = createRequestLimiter(2);
    const first = deferred<string>();
    const second = deferred<string>();
    const third = deferred<string>();
    const started: number[] = [];

    const firstRun = limiter.run(async () => {
      started.push(1);
      return first.promise;
    });
    const secondRun = limiter.run(async () => {
      started.push(2);
      return second.promise;
    });
    const thirdRun = limiter.run(async () => {
      started.push(3);
      return third.promise;
    });

    await vi.waitFor(() => expect(started).toEqual([1, 2]));
    first.resolve("first");
    await expect(firstRun).resolves.toBe("first");
    await vi.waitFor(() => expect(started).toEqual([1, 2, 3]));

    second.resolve("second");
    third.resolve("third");
    await expect(Promise.all([secondRun, thirdRun])).resolves.toEqual([
      "second",
      "third",
    ]);
  });

  it("removes an aborted request before it starts", async () => {
    const limiter = createRequestLimiter(1);
    const first = deferred<void>();
    const queuedRequest = vi.fn(async () => "queued");
    const controller = new AbortController();

    const firstRun = limiter.run(() => first.promise);
    const queuedRun = limiter.run(queuedRequest, controller.signal);
    controller.abort();

    await expect(queuedRun).rejects.toMatchObject({ name: "AbortError" });
    first.resolve();
    await firstRun;
    expect(queuedRequest).not.toHaveBeenCalled();
  });
});
