"use client";

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS, AUDIT_PREVIEW_LIMIT, formatDateTime, reportsPanelClass, useReportsText } from "./shared";
import type { AuditCatalogChangesResponse } from "./types";

type AuditCatalogsSectionProps = {
  query: UseQueryResult<AuditCatalogChangesResponse>;
  entityType: string;
  onEntityTypeChange: (value: string) => void;
  actionFilter: string;
  onActionFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onOffsetChange: (value: number | ((prev: number) => number)) => void;
  canPrev: boolean;
  canNext: boolean;
  exportMutation: UseMutationResult<void, Error, void>;
  canRunPrivilegedActions: boolean;
  privilegedActionHint: string | undefined;
};

// Reports → "Catalog audit": filtered, paged catalog change log with CSV export. Markup moved verbatim from ReportsPage (section split).
export function AuditCatalogsSection({ query, entityType, onEntityTypeChange, actionFilter, onActionFilterChange, dateFrom, onDateFromChange, dateTo, onDateToChange, onOffsetChange, canPrev, canNext, exportMutation, canRunPrivilegedActions, privilegedActionHint }: AuditCatalogsSectionProps) {
  const { t, tt, copy } = useReportsText();
  const items = query.data?.items || [];
  const summary = query.data?.summary;

  return (
    <div
      id="reports-audit-catalogs"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
        {copy(
          "Catalog Audit Report",
          "Аудит справочников",
          "דוח ביקורת קטלוג",
        )}
      </div>
      <div className="px-4 py-3 border-b border-border grid gap-2 md:grid-cols-[180px_220px_150px_150px_auto] items-center">
        <select
          aria-label={copy("Catalog audit: entity type", "Аудит справочников: тип сущности", "ביקורת קטלוג: סוג ישות")}
          value={entityType}
          onChange={(e) => {
            onEntityTypeChange(e.target.value);
            onOffsetChange(0);
          }}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
        >
          <option value="">
            {copy("All entities", "Все сущности", "כל הישויות")}
          </option>
          {AUDIT_ENTITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          aria-label={copy("Catalog audit: action", "Аудит справочников: действие", "ביקורת קטלוג: פעולה")}
          value={actionFilter}
          onChange={(e) => {
            onActionFilterChange(e.target.value);
            onOffsetChange(0);
          }}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
        >
          <option value="">
            {copy("All actions", "Все действия", "כל הפעולות")}
          </option>
          {AUDIT_ACTION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          aria-label={copy("Catalog audit: date from", "Аудит справочников: дата с", "ביקורת קטלוג: מתאריך")}
          value={dateFrom}
          onChange={(e) => {
            onDateFromChange(e.target.value);
            onOffsetChange(0);
          }}
          type="date"
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
        />
        <input
          aria-label={copy("Catalog audit: date to", "Аудит справочников: дата по", "ביקורת קטלוג: עד תאריך")}
          value={dateTo}
          onChange={(e) => {
            onDateToChange(e.target.value);
            onOffsetChange(0);
          }}
          type="date"
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => exportMutation.mutate()}
            disabled={
              !canRunPrivilegedActions || exportMutation.isPending
            }
            title={privilegedActionHint}
            className="h-9 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
          >
            {copy("Export CSV", "Экспорт CSV", "ייצוא CSV")}
          </button>
          <button
            onClick={() => {
              onEntityTypeChange("");
              onActionFilterChange("");
              onDateFromChange("");
              onDateToChange("");
              onOffsetChange(0);
            }}
            className="h-9 px-3 rounded-md border border-border bg-surface text-[12px]"
          >
            {copy("Reset", "Сбросить", "איפוס")}
          </button>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-[170px_120px_1fr_1fr] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
        <span>{copy("Time", "Время", "זמן")}</span>
        <span>{copy("Entity", "Сущность", "ישות")}</span>
        <span>{copy("Action", "Действие", "פעולה")}</span>
        <span>{copy("Reason", "Причина", "סיבה")}</span>
      </div>
      {query.isLoading && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy("Loading audit…", "Загружаем аудит…", "טוען ביקורת...")}
        </div>
      )}
      {!query.isLoading && items.length === 0 && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy(
            "No catalog audit entries.",
            "Записей аудита справочников нет.",
            "אין רשומות ביקורת קטלוג.",
          )}
        </div>
      )}
      {!query.isLoading &&
        items.map((item) => (
          <div key={item.id} className="border-t border-border">
            <article className="px-4 py-3 md:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                  {item.entity_type}
                </div>
                <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                  {formatDateTime(item.created_at)}
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                <div className="text-[10px] uppercase text-text-secondary">
                  {copy("Action", "Действие", "פעולה")}
                </div>
                <div className="mt-1 text-[13px] font-medium text-text">
                  {item.action}
                </div>
              </div>
              <div className="mt-2 text-[12px] leading-5 text-text-secondary">
                {item.reason || "-"}
              </div>
            </article>
            <div className="hidden md:grid grid-cols-[170px_120px_1fr_1fr] gap-3 px-4 py-3 text-[13px] items-center">
              <div className="text-text-secondary">
                {formatDateTime(item.created_at)}
              </div>
              <div className="font-medium">{item.entity_type}</div>
              <div>{item.action}</div>
              <div className="text-text-secondary">
                {item.reason || "-"}
              </div>
            </div>
          </div>
        ))}
      <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="text-text-secondary">
          {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
          {summary?.total || 0}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!canPrev}
            onClick={() =>
              onOffsetChange((x) => Math.max(0, x - AUDIT_PREVIEW_LIMIT))
            }
            className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
          >
            {tt("reports.prev")}
          </button>
          <button
            disabled={!canNext}
            onClick={() => onOffsetChange((x) => x + AUDIT_PREVIEW_LIMIT)}
            className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
          >
            {tt("reports.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
