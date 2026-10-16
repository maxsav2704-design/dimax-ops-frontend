"use client";

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";

import { reportsPanelClass, useReportsText } from "./shared";
import type { OutboxListResponse, OutboxRetryResponse } from "./types";

type FailedOutboxSectionProps = {
  query: UseQueryResult<OutboxListResponse>;
  retryMutation: UseMutationResult<OutboxRetryResponse, Error, string>;
  canRunPrivilegedActions: boolean;
  privilegedActionHint: string | undefined;
  scopedDeliveryChannel: string | null;
};

// Reports → "Failed outbox queue": failed deliveries with a manual retry. Markup moved verbatim from ReportsPage (section split).
export function FailedOutboxSection({ query, retryMutation, canRunPrivilegedActions, privilegedActionHint, scopedDeliveryChannel }: FailedOutboxSectionProps) {
  const { t, copy } = useReportsText();
  const failedItems = query.data?.items || [];

  return (
    <div
      id="reports-failed-outbox"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
        {t("reports.failedOutboxQueue")}
      </div>
      {query.isLoading && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {t("reports.loadingFailedMessages")}
        </div>
      )}
      {!query.isLoading && failedItems.length === 0 && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {scopedDeliveryChannel
            ? t("reports.noFailedOutboxMessagesFor").replace(
                "{scope}",
                scopedDeliveryChannel,
              )
            : t("reports.noFailedOutboxMessages")}
        </div>
      )}
      {!query.isLoading &&
        failedItems.map((item) => (
          <div key={item.id} className="border-t border-border">
            <article className="px-4 py-3 md:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-5 text-text">
                    {item.channel}
                  </div>
                  <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                    {item.status} | {item.delivery_status}
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                  {item.attempts}/{item.max_attempts}
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2 text-[12px] leading-5 text-text-secondary">
                {item.last_error ||
                  copy(
                    "No error payload",
                    "Нет данных об ошибке",
                    "אין נתוני שגיאה",
                  )}
              </div>
              <button
                onClick={() => retryMutation.mutate(item.id)}
                disabled={
                  !canRunPrivilegedActions || retryMutation.isPending
                }
                title={privilegedActionHint}
                className="mt-3 h-8 px-3 rounded-md border border-border bg-surface text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {copy("Retry", "Повторить", "נסה שוב")}
              </button>
            </article>
            <div className="hidden md:grid grid-cols-[120px_120px_120px_160px_1fr_120px] gap-3 px-4 py-3 text-[13px] items-center">
              <div className="font-medium">{item.channel}</div>
              <div>{item.status}</div>
              <div>{item.delivery_status}</div>
              <div className="text-text-secondary">
                {item.attempts}/{item.max_attempts}
              </div>
              <div className="text-text-secondary truncate">
                {item.last_error ||
                  copy(
                    "No error payload",
                    "Нет данных об ошибке",
                    "אין נתוני שגיאה",
                  )}
              </div>
              <button
                onClick={() => retryMutation.mutate(item.id)}
                disabled={
                  !canRunPrivilegedActions || retryMutation.isPending
                }
                title={privilegedActionHint}
                className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {copy("Retry", "Повторить", "נסה שוב")}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
