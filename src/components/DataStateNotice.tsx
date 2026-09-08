import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const messages = {
  en: { loading: "Loading data", error: "Could not load data", stale: "Could not refresh. Showing the last loaded data.", retry: "Try again" },
  ru: { loading: "Загружаем данные", error: "Не удалось загрузить данные", stale: "Не удалось обновить. Показаны последние загруженные данные.", retry: "Повторить" },
  he: { loading: "טוען נתונים", error: "לא ניתן לטעון נתונים", stale: "העדכון נכשל. מוצגים הנתונים האחרונים שנטענו.", retry: "נסה שוב" },
};

type DataStateNoticeProps = {
  state: "loading" | "error" | "stale";
  label: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function DataStateNotice({ state, label, onRetry, retrying = false }: DataStateNoticeProps) {
  const { locale } = useI18n();
  const copy = messages[locale];
  const pending = state === "loading";

  return (
    <div
      role={pending ? "status" : "alert"}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border px-4 py-3 text-[13px] leading-5",
        pending ? "border-border bg-surface-subtle text-text-secondary" :
          state === "stale" ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg" :
            "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
      )}
    >
      {pending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-spin" /> : <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />}
      <span className="min-w-0 flex-1"><strong className="font-medium">{label}</strong>: {copy[state]}</span>
      {!pending && onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className="dmx-secondary-action disabled:opacity-60">
          <RefreshCw aria-hidden="true" className={cn("h-4 w-4", retrying && "motion-safe:animate-spin")} />
          {copy.retry}
        </button>
      )}
    </div>
  );
}
