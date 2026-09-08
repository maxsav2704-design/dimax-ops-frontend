import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DoorMatrixTileProps = {
  marking: string;
  status: string;
  tone: string;
  inspectLabel: string;
  context?: string;
  focused: boolean;
  selected: boolean;
  hasIssues: boolean;
  testId?: string;
  onInspect: () => void;
  onToggleSelection: () => void;
};

export function DoorMatrixTile({ marking, status, tone, inspectLabel, context, focused, selected, hasIssues, testId, onInspect, onToggleSelection }: DoorMatrixTileProps) {
  const { locale } = useI18n();
  const selectLabel = locale === "ru" ? "Выбрать дверь" : locale === "he" ? "בחר דלת" : "Select door";

  return (
    <div className="dmx-door-tile min-w-0" data-focused={focused} data-selected={selected}>
      <button
        type="button"
        data-testid={testId}
        aria-label={inspectLabel}
        aria-pressed={focused}
        title={[marking, status, context].filter(Boolean).join(" · ")}
        onClick={onInspect}
        className={cn("dmx-door-tile-face flex h-full min-h-24 w-full flex-col items-start justify-between gap-2 rounded-md border px-2.5 pb-2.5 pt-8 text-start", tone)}
      >
        {context && <span dir="auto" className="absolute start-2.5 top-2 max-w-[calc(100%-42px)] truncate text-[10px] font-medium">{context}</span>}
        <span dir="auto" className="w-full break-words text-[13px] font-semibold leading-4 tabular-nums [overflow-wrap:anywhere]">{marking}</span>
        <span className="flex w-full items-start gap-1 text-[10px] leading-4">
          {hasIssues && <AlertTriangle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />}
          <span>{status}</span>
        </span>
      </button>
      <label className="absolute end-0 top-0 flex h-8 w-8 cursor-pointer items-center justify-center">
        <input type="checkbox" checked={selected} onChange={onToggleSelection}
          aria-label={`${selectLabel} ${marking}`}
          className="h-4 w-4 cursor-pointer rounded border-current accent-[var(--dmx-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dmx-link)]" />
      </label>
    </div>
  );
}
