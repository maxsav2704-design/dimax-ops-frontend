"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import { AUDIT_PREVIEW_LIMIT, ISSUE_AUDIT_ACTION_OPTIONS, changedFieldKeys, formatDateTime, prettyJson, reportsPanelClass, useReportsText } from "./shared";
import type { AuditCatalogChangesResponse } from "./types";

type IssueAuditSectionProps = {
  query: UseQueryResult<AuditCatalogChangesResponse>;
  actionFilter: string;
  onActionFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  issueId: string;
  onIssueIdChange: (value: string) => void;
  issueIdTrimmed: string;
  issueIdNormalized: string;
  onOffsetChange: (value: number | ((prev: number) => number)) => void;
  canPrev: boolean;
  canNext: boolean;
  exportMutation: UseMutationResult<void, Error, void>;
  canRunPrivilegedActions: boolean;
  privilegedActionHint: string | undefined;
};

// Reports → "Issue audit timeline": filtered, paged issue change log with expandable rows and CSV export. Markup moved verbatim from ReportsPage (section split).
export function IssueAuditSection({ query, actionFilter, onActionFilterChange, dateFrom, onDateFromChange, dateTo, onDateToChange, issueId, onIssueIdChange, issueIdTrimmed, issueIdNormalized, onOffsetChange, canPrev, canNext, exportMutation, canRunPrivilegedActions, privilegedActionHint }: IssueAuditSectionProps) {
  const router = useRouter();
  const { t, tt, copy } = useReportsText();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const items = query.data?.items || [];
  const summary = query.data?.summary;

  return (
    <div
      id="reports-issue-audit"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
        {copy("Issue Audit Report", "Аудит проблем", "דוח ביקורת תקלות")}
      </div>
      <div className="px-4 py-3 border-b border-border grid gap-2 md:grid-cols-[220px_240px_150px_150px_auto] items-center">
        <select
          aria-label={copy("Issue audit: action", "Аудит проблем: действие", "ביקורת תקלות: פעולה")}
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
          {ISSUE_AUDIT_ACTION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          aria-label={copy("Issue UUID", "UUID проблемы", "UUID תקלה")}
          value={issueId}
          onChange={(e) => {
            onIssueIdChange(e.target.value);
            onOffsetChange(0);
          }}
          placeholder={copy("Issue UUID", "UUID проблемы", "UUID תקלה")}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
        />
        <input
          aria-label={copy("Issue audit: date from", "Аудит проблем: дата с", "ביקורת תקלות: מתאריך")}
          value={dateFrom}
          onChange={(e) => {
            onDateFromChange(e.target.value);
            onOffsetChange(0);
          }}
          type="date"
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
        />
        <input
          aria-label={copy("Issue audit: date to", "Аудит проблем: дата по", "ביקורת תקלות: עד תאריך")}
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
              onActionFilterChange("");
              onIssueIdChange("");
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
      {issueIdTrimmed.length > 0 &&
      !issueIdNormalized ? (
        <div className="px-4 pt-2 text-[12px] text-status-warning-fg">
          {copy(
            "Issue UUID format is invalid, filter is not applied.",
            "Формат UUID проблемы неверный, фильтр не применяется.",
            "פורמט UUID התקלה לא תקין, המסנן לא הוחל.",
          )}
        </div>
      ) : null}

      <div className="hidden md:grid grid-cols-[170px_1fr_1fr_220px] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
        <span>{copy("Time", "Время", "זמן")}</span>
        <span>{copy("Action", "Действие", "פעולה")}</span>
        <span>
          {copy("Changed fields", "Изменённые поля", "שדות שהשתנו")}
        </span>
        <span>{copy("Controls", "Управление", "פקדים")}</span>
      </div>
      {query.isLoading && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy(
            "Loading issue audit…",
            "Загружаем аудит проблем…",
            "טוען ביקורת בעיה...",
          )}
        </div>
      )}
      {!query.isLoading && items.length === 0 && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy(
            "No issue audit entries.",
            "Записей аудита проблем нет.",
            "אין רשומות ביקורת תקלות.",
          )}
        </div>
      )}
      {!query.isLoading &&
        items.map((item) => {
          const changedFields = changedFieldKeys(item.before, item.after);
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} className="border-t border-border">
              <article className="px-4 py-3 md:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-5 text-text">
                      {item.action}
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    className="h-8 shrink-0 rounded-md border border-border bg-surface px-3 text-[12px]"
                  >
                    {isExpanded
                      ? copy("Hide Diff", "Скрыть изменения", "הסתר שינויים")
                      : copy("Show Diff", "Показать изменения", "הצג שינויים")}
                  </button>
                </div>
                <div className="mt-2 text-[12px] leading-5 text-text-secondary">
                  {item.reason ||
                    copy("No reason", "Без причины", "ללא סיבה")}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {changedFields.length === 0 ? (
                    <span className="text-[12px] text-text-secondary">
                      {copy(
                        "No detected changes",
                        "Изменений не обнаружено",
                        "לא זוהו שינויים",
                      )}
                    </span>
                  ) : (
                    changedFields.slice(0, 4).map((field) => (
                      <span
                        key={field}
                        className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px]"
                      >
                        {field}
                      </span>
                    ))
                  )}
                  {changedFields.length > 4 ? (
                    <span className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px] text-text-secondary">
                      +{changedFields.length - 4}
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    if (item.entity_id) {
                      router.push(`/issues?issue_id=${item.entity_id}`);
                    }
                  }}
                  disabled={!item.entity_id}
                  className="mt-3 h-8 rounded-md border border-border bg-surface px-3 text-[12px] disabled:opacity-50"
                >
                  {copy("Open Issue", "Открыть проблему", "פתח תקלה")}
                </button>
              </article>
              <div className="hidden md:grid grid-cols-[170px_1fr_1fr_220px] gap-3 px-4 py-3 text-[13px] items-start">
                <div className="text-text-secondary">
                  {formatDateTime(item.created_at)}
                </div>
                <div>
                  <div className="font-medium">{item.action}</div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    {item.reason ||
                      copy("No reason", "Без причины", "ללא סיבה")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {changedFields.length === 0 ? (
                    <span className="text-[12px] text-text-secondary">
                      {copy(
                        "No detected changes",
                        "Изменений не обнаружено",
                        "לא זוהו שינויים",
                      )}
                    </span>
                  ) : (
                    changedFields.slice(0, 4).map((field) => (
                      <span
                        key={field}
                        className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px]"
                      >
                        {field}
                      </span>
                    ))
                  )}
                  {changedFields.length > 4 ? (
                    <span className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px] text-text-secondary">
                      +{changedFields.length - 4}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      if (item.entity_id) {
                        router.push(`/issues?issue_id=${item.entity_id}`);
                      }
                    }}
                    disabled={!item.entity_id}
                    className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
                  >
                    {copy("Open Issue", "Открыть проблему", "פתח תקלה")}
                  </button>
                  <button
                    onClick={() =>
                      setExpandedId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                  >
                    {isExpanded
                      ? copy("Hide Diff", "Скрыть изменения", "הסתר שינויים")
                      : copy("Show Diff", "Показать изменения", "הצג שינויים")}
                  </button>
                </div>
              </div>
              {isExpanded ? (
                <div className="px-4 pb-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-surface-subtle">
                      <div className="px-3 py-2 border-b border-border text-[11px] uppercase text-text-secondary">
                        {copy("Before", "До", "לפני")}
                      </div>
                      <pre className="p-3 text-[11px] leading-5 whitespace-pre-wrap break-all text-text-secondary overflow-x-auto">
                        {prettyJson(item.before)}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle">
                      <div className="px-3 py-2 border-b border-border text-[11px] uppercase text-text-secondary">
                        {copy("After", "После", "אחרי")}
                      </div>
                      <pre className="p-3 text-[11px] leading-5 whitespace-pre-wrap break-all text-text-secondary overflow-x-auto">
                        {prettyJson(item.after)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <div className="text-text-secondary">
          {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
          {summary?.total || 0}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!canPrev}
            onClick={() =>
              onOffsetChange((x) =>
                Math.max(0, x - AUDIT_PREVIEW_LIMIT),
              )
            }
            className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
          >
            {tt("reports.prev")}
          </button>
          <button
            disabled={!canNext}
            onClick={() =>
              onOffsetChange((x) => x + AUDIT_PREVIEW_LIMIT)
            }
            className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
          >
            {tt("reports.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
