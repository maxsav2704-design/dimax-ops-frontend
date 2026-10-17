// E1 attention ranking: a row's level is computed from its data, never set by hand.
// 3 = problem stripe, 2 = warning stripe, 1 = quiet dot, 0 = nothing.

export type AttentionLevel = 0 | 1 | 2 | 3;

export type AttentionFlags = {
  /** Past its due date / behind plan. */
  overdue?: boolean;
  /** Blocked, failed delivery, failed import. */
  blocked?: boolean;
  /** Work without a confirmed price. */
  missingPrice?: boolean;
  /** Open issues on the item. */
  issues?: boolean;
  /** No installer assigned. */
  unassigned?: boolean;
  /** Data older than a day. */
  stale?: boolean;
};

const WEIGHTS: Record<keyof AttentionFlags, AttentionLevel> = {
  overdue: 3,
  blocked: 3,
  missingPrice: 2,
  issues: 2,
  unassigned: 1,
  stale: 1,
};

export function attentionLevel(flags: AttentionFlags): AttentionLevel {
  let level: AttentionLevel = 0;
  for (const key of Object.keys(WEIGHTS) as Array<keyof AttentionFlags>) {
    if (flags[key] && WEIGHTS[key] > level) level = WEIGHTS[key];
  }
  return level;
}

/** Sort comparator: higher attention first, stable otherwise. */
export function byAttention<T>(getLevel: (item: T) => AttentionLevel): (a: T, b: T) => number {
  return (a, b) => getLevel(b) - getLevel(a);
}

/** The `data-attention` attribute value for a table row (omitted when nothing needs attention). */
export function attentionAttr(level: AttentionLevel): { "data-attention"?: string } {
  return level > 0 ? { "data-attention": String(level) } : {};
}
