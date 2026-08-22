type QueueEntry = {
  start: () => void;
  reject: (reason: Error) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
};

export type RequestLimiter = {
  run<T>(request: () => Promise<T>, signal?: AbortSignal): Promise<T>;
};

function abortError(): Error {
  const error = new Error("The request was aborted");
  error.name = "AbortError";
  return error;
}

export function createRequestLimiter(maxConcurrent: number): RequestLimiter {
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error("maxConcurrent must be a positive integer");
  }

  let activeCount = 0;
  const queue: QueueEntry[] = [];

  const removeAbortListener = (entry: QueueEntry): void => {
    if (entry.signal && entry.abortListener) {
      entry.signal.removeEventListener("abort", entry.abortListener);
    }
  };

  const startNext = (): void => {
    while (activeCount < maxConcurrent && queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }
      if (next.signal?.aborted) {
        removeAbortListener(next);
        next.reject(abortError());
        continue;
      }
      removeAbortListener(next);
      activeCount += 1;
      next.start();
    }
  };

  const acquire = (signal?: AbortSignal): Promise<void> => {
    if (signal?.aborted) {
      return Promise.reject(abortError());
    }
    if (activeCount < maxConcurrent) {
      activeCount += 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const entry: QueueEntry = {
        start: resolve,
        reject,
        signal,
      };
      if (signal) {
        entry.abortListener = () => {
          const index = queue.indexOf(entry);
          if (index >= 0) {
            queue.splice(index, 1);
            reject(abortError());
          }
        };
        signal.addEventListener("abort", entry.abortListener, { once: true });
      }
      queue.push(entry);
    });
  };

  return {
    async run<T>(request: () => Promise<T>, signal?: AbortSignal): Promise<T> {
      await acquire(signal);
      try {
        if (signal?.aborted) {
          throw abortError();
        }
        return await request();
      } finally {
        activeCount -= 1;
        startNext();
      }
    },
  };
}
