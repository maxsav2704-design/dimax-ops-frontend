import { QueryClient } from "@tanstack/react-query";

// Shared cache policy for the admin and installer web app.
// Without defaults, react-query treats every query as stale immediately and
// refetches on each window focus; the reports page alone holds ~27 queries,
// so a tab switch used to replay ~27 requests. Live screens keep their own
// refetchInterval, and financial dialogs opt into staleTime: 0 explicitly.
export const QUERY_STALE_TIME_MS = 30_000;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
  });
}
