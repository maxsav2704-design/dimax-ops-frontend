import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { resolveFreshness } from "./freshness";

// E8 freshness: a panel knows the age of its data. Fresh data stays quiet,
// stale data names its age next to the refresh control, offline says so.

type FreshnessBadgeProps = {
  updatedAt: string | number | Date | null | undefined;
  staleAfterMs?: number;
  offline?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Injected clock for tests; defaults to a 30 s tick. */
  now?: number;
  className?: string;
  testId?: string;
};

export function FreshnessBadge({ updatedAt, staleAfterMs, offline, onRefresh, refreshing, now, className, testId }: FreshnessBadgeProps) {
  const copy = useCopy();
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (now != null) return undefined;
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [now]);
  const { state, ageMs } = resolveFreshness(updatedAt, now ?? tick, staleAfterMs, offline);
  const minutes = ageMs == null ? 0 : Math.round(ageMs / 60_000);
  const text =
    state === "offline"
      ? copy("Offline, showing saved data", "Офлайн, показаны сохранённые данные", "לא מקוון, מוצגים נתונים שמורים")
      : state === "stale"
        ? copy(`Updated ${minutes} min ago`, `Обновлено ${minutes} мин назад`, `עודכן לפני ${minutes} דק׳`)
        : copy("Updated just now", "Обновлено только что", "עודכן זה עתה");
  return (
    <span className={cn("freshness", className)} data-state={state} data-testid={testId} role="status">
      <span>{text}</span>
      {onRefresh && state !== "fresh" ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-6 items-center gap-1 rounded-full border border-border-strong bg-surface px-2 text-11 font-medium text-text hover:bg-surface-subtle disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} strokeWidth={1.8} aria-hidden="true" />
          {copy("Refresh", "Обновить", "רענון")}
        </button>
      ) : null}
    </span>
  );
}
