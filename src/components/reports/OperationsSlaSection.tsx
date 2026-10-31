"use client";

import { useRouter } from "next/navigation";
import type { UseQueryResult } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import { SLA_HISTORY_DAYS_OPTIONS, SLA_STATUS_CLASS, reportsMetricCardClass, reportsPanelClass, useReportsText } from "./shared";
import type { OperationsSlaHistoryResponse, OperationsSlaResponse } from "./types";

type OperationsSlaSectionProps = {
  query: UseQueryResult<OperationsSlaResponse>;
  historyQuery: UseQueryResult<OperationsSlaHistoryResponse>;
  historyDays: number;
  onHistoryDaysChange: (days: number) => void;
};

// Reports → "Operations SLA": SLA metrics, playbooks and the SLA history trend. Markup moved verbatim from ReportsPage (section split).
type Triple = readonly [en: string, ru: string, he: string];

// The server sends stable codes with English titles; the office reads them in its own language.
const METRIC_TITLES: Record<string, Triple> = {
  imports_failure_rate_24h: ["Failed imports (24 h)", "Неудачные импорты (24 ч)", "ייבוא שנכשל (24 ש׳)"],
  outbox_failed_rate: ["Failed outgoing messages", "Неотправленные сообщения", "הודעות יוצאות שנכשלו"],
  outbox_pending_overdue_15m: ["Messages waiting over 15 min", "Сообщения ждут больше 15 мин", "הודעות ממתינות מעל 15 דק׳"],
  limit_alerts_danger_24h: ["Critical limit alerts (24 h)", "Критичные предупреждения лимитов (24 ч)", "התראות מגבלה קריטיות (24 ש׳)"],
  sync_danger_installers: ["Installers with sync problems", "Монтажники с проблемами синхронизации", "מתקינים עם בעיות סנכרון"],
};
const PLAYBOOKS: Record<string, { title: Triple; description: Triple }> = {
  PLAYBOOK_IMPORTS_RETRY_FAILED: {
    title: ["Retry failed imports", "Повторить неудачные импорты", "לנסות שוב ייבוא שנכשל"],
    description: ["Open Objects with the failed runs selected and retry only those.", "Открыть объекты с выбранными неудачными запусками и повторить только их.", "לפתוח פרויקטים עם הריצות שנכשלו ולנסות שוב רק אותן."],
  },
  PLAYBOOK_OUTBOX_TRIAGE: {
    title: ["Sort out failed messages", "Разобрать неотправленные сообщения", "לטפל בהודעות שנכשלו"],
    description: ["Review the failed queue and retry in a controlled way.", "Проверить очередь ошибок и повторить отправку под контролем.", "לבדוק את תור הכשלים ולשלוח שוב בצורה מבוקרת."],
  },
  PLAYBOOK_LIMIT_CAPACITY: {
    title: ["Relieve plan limits", "Снять давление лимитов", "להקל על מגבלות התוכנית"],
    description: ["Review plan limits for users, objects and doors.", "Проверить лимиты тарифа по пользователям, объектам и дверям.", "לבדוק מגבלות למשתמשים, פרויקטים ודלתות."],
  },
  PLAYBOOK_SYNC_RECOVERY: {
    title: ["Recover installers with sync problems", "Восстановить синхронизацию монтажников", "לשחזר סנכרון מתקינים"],
    description: ["Check sync health and help installers who are far behind or long offline.", "Проверить синхронизацию и помочь отстающим или долго офлайн.", "לבדוק סנכרון ולעזור למתקינים שמפגרים או לא מחוברים זמן רב."],
  },
};
const STATUS: Record<string, Triple> = {
  OK: ["OK", "Норма", "תקין"], WARN: ["At risk", "Риск", "אזהרה"], DANGER: ["Danger", "Опасно", "סכנה"],
  INFO: ["Info", "Сведения", "מידע"], LOW: ["Low", "Низкий", "נמוך"], MEDIUM: ["Medium", "Средний", "בינוני"], HIGH: ["High", "Высокий", "גבוה"],
};

export function OperationsSlaSection({ query, historyQuery, historyDays, onHistoryDaysChange }: OperationsSlaSectionProps) {
  const router = useRouter();
  const { tt, copy, readError } = useReportsText();
  const say = (triple: Triple | undefined, fallback: string) => (triple ? copy(...triple) : fallback);
  const statusText = (value: string | null | undefined) => (value ? say(STATUS[value], value) : "");
  const unitText = (unit: string) => (unit === "pct" ? "%" : unit === "count" ? "" : unit);
  const sla = query.data;
  const history = historyQuery.data;
  const slaMetrics = sla?.metrics || [];
  const slaPlaybooks = sla?.playbooks || [];
  const slaHistoryPoints = history?.points || [];
  const slaHistorySummary = history?.summary;
  const slaHistoryRecent = slaHistoryPoints.slice(-10).reverse();

  return (
    <div
      id="reports-operations-sla"
      className={reportsPanelClass("space-y-4 p-4")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.operationsSlaTitle")}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
            {tt("reports.healthMetricsPlaybooks")}
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold",
            SLA_STATUS_CLASS[sla?.overall_status || ""] ||
              "text-text-secondary bg-surface-subtle border-border",
          )}
        >
          {statusText(sla?.overall_status) || tt("reports.notAvailableShort")}
        </span>
      </div>

      {query.isLoading ? (
        <div className="text-[13px] text-text-secondary">
          {tt("reports.loadingSlaMetrics")}
        </div>
      ) : query.isError ? (
        <div className="text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            "Failed to load SLA metrics",
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            {slaMetrics.map((metric) => (
              <div
                key={metric.code}
                className={reportsMetricCardClass(
                  metric.status === "DANGER"
                    ? "danger"
                    : metric.status === "WARN"
                      ? "warning"
                      : "success",
                )}
              >
                <div className="text-[11px] uppercase text-text-secondary">
                  {say(METRIC_TITLES[metric.code], metric.title)}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="text-lg font-semibold text-text">
                    {metric.current}
                    <span className="ms-1 text-[11px] font-normal text-text-secondary">
                      {unitText(metric.unit)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                      SLA_STATUS_CLASS[metric.status] ||
                        "text-text-secondary bg-surface-subtle border-border",
                    )}
                  >
                    {statusText(metric.status)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-text-secondary">
                  {copy("target", "цель", "יעד")} {metric.target} |{" "}
                  {copy("warn", "предупр.", "אזהרה")}{" "}
                  {metric.warn_threshold} |{" "}
                  {copy("danger", "риск", "סיכון")}{" "}
                  {metric.danger_threshold}
                </div>
              </div>
            ))}
          </div>

          <div className="surface-subtle space-y-3 p-4">
            <div className="text-[11px] uppercase text-text-secondary">
              {copy(
                "Action Playbooks",
                "Сценарии действий",
                "תרחישי פעולה",
              )}
            </div>
            {slaPlaybooks.map((playbook) => (
              <div
                key={playbook.code}
                className="grid grid-cols-[1fr_120px] items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2.5 text-[12px]"
              >
                <div>
                  <div className="font-medium text-text">
                    {say(PLAYBOOKS[playbook.code]?.title, playbook.title)}
                    <span
                      className={cn(
                        "ms-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                        SLA_STATUS_CLASS[playbook.severity] ||
                          "text-text-secondary bg-surface-subtle border-border",
                      )}
                    >
                      {statusText(playbook.severity)}
                    </span>
                  </div>
                  <div className="text-text-secondary">
                    {say(PLAYBOOKS[playbook.code]?.description, playbook.description)}
                  </div>
                </div>
                <button
                  onClick={() => router.push(playbook.action_url)}
                  className="h-8 rounded-lg border border-border bg-surface-subtle px-3 text-[12px] font-medium"
                >
                  {copy("Open Playbook", "Открыть план действий", "פתח תוכנית פעולה")}
                </button>
              </div>
            ))}
          </div>

          <div className="surface-subtle space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] uppercase text-text-secondary">
                {copy("SLA Trend (last", "Тренд SLA (последний", "מגמת SLA (אחרון")} {historyDays} {copy("days)", "дней)", "ימים)")}
              </div>
              <div className="inline-flex items-center rounded-lg border border-border bg-surface-subtle p-0.5">
                {SLA_HISTORY_DAYS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => onHistoryDaysChange(option)}
                    className={cn(
                      "h-7 px-2 rounded text-[11px]",
                      option === historyDays
                        ? "bg-accent text-accent-foreground"
                        : "text-text-secondary",
                    )}
                  >
                    {option}d
                  </button>
                ))}
              </div>
            </div>
            {historyQuery.isLoading ? (
              <div className="text-[12px] text-text-secondary">
                {copy("Loading trend…", "Загружаем тренд…", "טוען מגמה…")}
              </div>
            ) : historyQuery.isError ? (
              <div className="text-[12px] text-status-problem-fg">
                {readError(
                  historyQuery.error,
                  copy(
                    "Failed to load SLA trend",
                    "Не удалось загрузить тренд SLA",
                    "טעינת מגמת SLA נכשלה",
                  ),
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-2 md:grid-cols-4 text-[12px]">
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                    <div className="text-text-secondary">
                      {copy("Current", "Текущее", "נוכחי")}
                    </div>
                    <div className="font-semibold">
                      {statusText(slaHistorySummary?.current_status) ||
                        tt("reports.notAvailableShort")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                    <div className="text-text-secondary">
                      {copy("Days by status", "Дней по статусам", "ימים לפי סטטוס")}
                    </div>
                    <div className="font-semibold">
                      {statusText("OK")} {slaHistorySummary?.ok_days ?? "-"} · {statusText("WARN")}{" "}
                      {slaHistorySummary?.warn_days ?? "-"} · {statusText("DANGER")}{" "}
                      {slaHistorySummary?.danger_days ?? "-"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                    <div className="text-text-secondary">
                      {copy("Delta Import % (d-1)", "Дельта импорта, % (d-1)", "% ייבוא דלתא (ד-1)")}
                    </div>
                    <div className="font-semibold">
                      {slaHistorySummary?.delta_import_failure_rate_pct ??
                        0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                    <div className="text-text-secondary">
                      {copy("Delta Outbox % (d-1)", "Дельта исходящих % (d-1)", "דלתא דואר יוצא % (d-1)")}
                    </div>
                    <div className="font-semibold">
                      {slaHistorySummary?.delta_outbox_failed_rate_pct ?? 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  {slaHistoryRecent.map((point) => (
                    <div
                      key={point.day}
                      className="grid grid-cols-[92px_62px_1fr_1fr_64px] gap-2 items-center text-[11px]"
                    >
                      <div className="text-text-secondary">{point.day}</div>
                      <span
                        className={cn(
                          "inline-flex justify-center rounded border px-1.5 py-0.5 font-semibold",
                          SLA_STATUS_CLASS[point.overall_status] ||
                            "text-text-secondary bg-surface-subtle border-border",
                        )}
                      >
                        {statusText(point.overall_status)}
                      </span>
                      <div className="h-2 rounded bg-surface-sunken overflow-hidden">
                        <div
                          className="h-full bg-status-warning-fg"
                          style={{
                            width: `${Math.min(100, point.import_failure_rate_pct)}%`,
                          }}
                        />
                      </div>
                      <div className="h-2 rounded bg-surface-sunken overflow-hidden">
                        <div
                          className="h-full bg-status-problem-fg"
                          style={{
                            width: `${Math.min(100, point.outbox_failed_rate_pct)}%`,
                          }}
                        />
                      </div>
                      <div className="text-end text-text-secondary">
                        A:{point.danger_alerts_count}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
