// Shared react-query keys. One key per endpoint so two pages never cache the
// same response twice and invalidation reaches every observer.
//
// Add a key here when a second place starts reading the same endpoint; page
// private keys (filters, drill-downs) can stay local to their view.
export const queryKeys = {
  /** GET /api/v1/auth/me, normalized through normalizeAuthSession(). */
  authMe: ["auth-me"] as const,
  /** GET /api/v1/admin/outbox/summary (Operations tiles + Reports delivery). */
  outboxSummary: ["outbox-summary"] as const,
} as const;
