import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { pickLocale } from "@/lib/locale";

import type { MatrixDensity, MatrixDoorState } from "@/components/projects/door-workspace/matrix-shared";

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
  /** E7: floor grouping for arrow-key navigation. */
  floorKey?: string;
  /** R8: one page-load moment, the matrix fills in floor by floor (0..7). */
  fillStep?: number;
  /** E7: arrow-key navigation handled by the matrix. */
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  /** "cards": the informative tile. "rows": one door per line, every fact readable without hover. */
  density?: MatrixDensity;
  /** Door model (type label) shown in the rows mode. */
  model?: string;
  /** The door's state word for the rows mode colours. */
  state?: MatrixDoorState;
};

export function DoorMatrixTile({
  marking, status, tone, inspectLabel, context, focused, selected, hasIssues, testId, onInspect, onToggleSelection,
  floorKey, fillStep, onKeyDown, density = "cards", model, state,
}: DoorMatrixTileProps) {
  const { locale } = useI18n();
  const selectLabel = pickLocale(locale, "Select door", "Выбрать дверь", "בחר דלת");
  const title = [marking, status, context].filter(Boolean).join(" · ");
  const step = fillStep == null ? undefined : Math.max(0, Math.min(7, fillStep));

  if (density === "rows") {
    return (
      <div
        className="dmx-door-tile dmx-door-row min-w-0"
        data-density="rows"
        data-state={state ?? "open"}
        data-focused={focused}
        data-selected={selected}
        data-fill-step={step}
      >
        <label className="dmx-door-row-check cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelection}
            aria-label={`${selectLabel} ${marking}`}
            className="h-3.5 w-3.5 cursor-pointer rounded border-current accent-[var(--dmx-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dmx-link)]"
          />
        </label>
        <button
          type="button"
          data-testid={testId}
          aria-label={inspectLabel}
          aria-pressed={focused}
          data-matrix-tile=""
          data-floor-key={floorKey}
          title={title}
          onClick={onInspect}
          onKeyDown={onKeyDown}
          className="dmx-door-row-face"
        >
          <span className="dmx-door-row-dot" aria-hidden="true" />
          <span dir="auto" className="dmx-door-row-marking">{marking}</span>
          <span dir="auto" className="dmx-door-row-model">{model || "\u2014"}</span>
          <span dir="auto" className="dmx-door-row-context">{context}</span>
          <span className="dmx-door-row-status">
            {hasIssues && <AlertTriangle aria-hidden="true" className="h-3 w-3 shrink-0" />}
            {status}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="dmx-door-tile min-w-0" data-density="cards" data-focused={focused} data-selected={selected} data-fill-step={step}>
      <button
        type="button"
        data-testid={testId}
        aria-label={inspectLabel}
        aria-pressed={focused}
        data-matrix-tile=""
        data-floor-key={floorKey}
        title={title}
        onClick={onInspect}
        onKeyDown={onKeyDown}
        className={cn("dmx-door-tile-face flex h-full min-h-24 w-full flex-col items-start justify-between gap-2 rounded-md border px-2.5 pb-2.5 pt-8 text-start", tone)}
      >
        {context && <span dir="auto" className="absolute start-2.5 top-2 max-w-[calc(100%-42px)] truncate text-11 font-medium">{context}</span>}
        <span dir="auto" className="w-full break-words text-13 font-semibold leading-4 tabular-nums [overflow-wrap:anywhere]">{marking}</span>
        <span className="flex w-full items-start gap-1 text-11 leading-4">
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

/** Column captions above the rows of one floor; mirrors the row grid. */
export function DoorRowsHeader() {
  const { locale } = useI18n();
  return (
    <div className="dmx-door-rows-head" aria-hidden="true">
      <span />
      <span>{pickLocale(locale, "Marking", "Маркировка", "סימון")}</span>
      <span>{pickLocale(locale, "Model", "Модель", "דגם")}</span>
      <span>{pickLocale(locale, "Apartment · location", "Квартира · локация", "דירה · מיקום")}</span>
      <span>{pickLocale(locale, "Status", "Статус", "סטטוס")}</span>
    </div>
  );
}
