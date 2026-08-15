"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  FolderOpen,
  RefreshCcw,
  WalletCards,
} from "lucide-react";

import { readableApiError } from "@/lib/api-error-display";
import {
  KpiCard as DimaxKpiCard,
  WidgetCard,
} from "@/components/dimax";
import { LtrText } from "@/components/ui/LtrText";
import { formatLocaleMoney, formatLocaleNumber } from "@/lib/formatting";
import { fetchInstallerEarningsSummary } from "@/lib/installer-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function earningsNoticeClass(): string {
  return "rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-sm text-status-problem-fg";
}

const earningsPrimaryActionClass =
  "dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60";

const earningsSmallActionClass =
  "dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60";

function earningsProjectRowClass(active: boolean): string {
  return cn(
    "flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 transition-colors",
    active
      ? "border-accent bg-surface-subtle"
      : "border-border hover:border-border-strong hover:bg-surface-subtle",
  );
}

export default function InstallerEarningsPage() {
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const focusedProjectId = (() => {
    const fromParams = (searchParams?.get("project_id") || "").trim();
    if (fromParams) {
      return fromParams;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return (
      new URLSearchParams(window.location.search).get("project_id") || ""
    ).trim();
  })();

  const earningsQuery = useQuery({
    queryKey: ["installer-earnings-summary"],
    queryFn: fetchInstallerEarningsSummary,
    refetchInterval: 30_000,
  });

  const summary = earningsQuery.data;
  const installTypes = summary?.by_install_type || [];
  const projects = summary?.by_project || [];
  const visibleProjects = focusedProjectId
    ? projects.filter((row) => row.project_id === focusedProjectId)
    : projects;
  const days = summary?.by_day || [];

  return (
    <div className="motion-stagger page-stack">
      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="page-eyebrow">
              {copy("Earnings", "Заработок", "רווחים")}
            </div>
            <h1 className="dmx-page-title mt-4 flex items-center gap-2">
              <WalletCards aria-hidden="true" className="h-6 w-6" />
              {copy(
                "Installer earnings",
                "Заработок монтажника",
                "רווחי מתקין",
              )}
            </h1>
            <p className="dmx-page-subtitle mt-3 max-w-2xl">
              {copy(
                "A simple breakdown for today, month, install types and projects.",
                "Простая разбивка по дню, месяцу, типам работ и проектам.",
                "פירוט פשוט להיום, לחודש, לסוגי התקנה ולפרויקטים.",
              )}
            </p>
            {focusedProjectId ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">
                  {copy("Focused project", "Фокус на проекте", "פרויקט במיקוד")}{" "}
                  {focusedProjectId}
                </span>
                <Link
                  href="/installer/earnings"
                  className={earningsSmallActionClass}
                >
                  {copy(
                    "Show all earnings",
                    "Показать весь заработок",
                    "הצג את כל הרווחים",
                  )}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="toolbar-row">
            <Link href="/installer" className={earningsSmallActionClass}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {copy(
                "Back to workspace",
                "Назад в рабочее место",
                "חזרה למרחב העבודה",
              )}
            </Link>
            <button
              type="button"
              onClick={() => void earningsQuery.refetch()}
              disabled={earningsQuery.isFetching}
              className={earningsPrimaryActionClass}
            >
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />
              {earningsQuery.isFetching
                ? copy("Refreshing…", "Обновляем…", "מרענן…")
                : copy("Refresh", "Обновить", "רענן")}
            </button>
          </div>
        </div>
      </section>

      {earningsQuery.isError && (
        <div className={earningsNoticeClass()}>
          {readableApiError(
            earningsQuery.error,
            locale,
            copy(
              "Failed to load earnings summary.",
              "Не удалось загрузить заработок.",
              "לא ניתן לטעון את סיכום הרווחים.",
            ),
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DimaxKpiCard
          label={copy("Today", "Сегодня", "היום")}
          value={
            <LtrText>
              {earningsQuery.isLoading
                ? "..."
                : formatLocaleMoney(
                    summary?.today_total,
                    summary?.currency,
                    locale,
                  )}
            </LtrText>
          }
          hint={copy("Completed work", "Выполненные работы", "עבודה שבוצעה")}
          barColor="green"
        />
        <DimaxKpiCard
          label={copy("This month", "Этот месяц", "החודש")}
          value={
            <LtrText>
              {earningsQuery.isLoading
                ? "..."
                : formatLocaleMoney(
                    summary?.month_total,
                    summary?.currency,
                    locale,
                  )}
            </LtrText>
          }
          hint={copy("Current payout view", "Текущий расчёт", "תצוגת תשלום")}
          barColor="blue"
        />
        <DimaxKpiCard
          label={copy("Install types", "Типы работ", "סוגי התקנה")}
          value={
            <LtrText>{formatLocaleNumber(installTypes.length, locale)}</LtrText>
          }
          hint={copy("Grouped by work", "По типам работ", "לפי סוג עבודה")}
          barColor="yellow"
        />
        <DimaxKpiCard
          label={copy("Projects", "Проекты", "פרויקטים")}
          value={
            <LtrText>{formatLocaleNumber(projects.length, locale)}</LtrText>
          }
          hint={copy("Linked sites", "Связанные объекты", "אתרים מקושרים")}
          barColor="orange"
        />
      </div>

      {earningsQuery.isLoading && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          {copy("Loading earnings…", "Загружаем заработок…", "טוען רווחים…")}
        </div>
      )}

      {!earningsQuery.isLoading && !summary && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          {copy(
            "Earnings are currently unavailable.",
            "Заработок сейчас недоступен.",
            "סיכום הרווחים אינו זמין כרגע.",
          )}
        </div>
      )}

      {!earningsQuery.isLoading && summary && (
        <div className="grid gap-6 xl:grid-cols-3">
          <WidgetCard
            title={copy("Breakdown", "Разбивка", "פירוט")}
            headerMeta={copy("Install types", "Типы работ", "סוגי התקנה")}
            className="xl:col-span-1"
          >
            {installTypes.length === 0 ? (
              <div className="text-sm text-text-secondary">
                {copy(
                  "No install type rows yet.",
                  "Пока нет строк по типам работ.",
                  "עדיין אין שורות לפי סוגי התקנה.",
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {installTypes.map((row) => (
                  <div
                    key={row.install_type}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                  >
                    <LtrText className="truncate text-sm font-medium text-text">
                      {row.install_type}
                    </LtrText>
                    <LtrText className="text-sm font-semibold text-text">
                      {formatLocaleMoney(
                        row.amount ?? row.total,
                        summary.currency,
                        locale,
                      )}
                    </LtrText>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>

          <WidgetCard
            title={copy(
              "Project rows",
              "Строки по проектам",
              "שורות לפי פרויקט",
            )}
            headerMeta={copy("Projects", "Проекты", "פרויקטים")}
            className="xl:col-span-1"
          >
            {visibleProjects.length === 0 ? (
              <div className="text-sm text-text-secondary">
                {focusedProjectId
                  ? copy(
                      "No earnings rows match the selected project yet.",
                      "Пока нет строк заработка по выбранному проекту.",
                      "עדיין אין שורות רווח שתואמות לפרויקט שנבחר.",
                    )
                  : copy(
                      "No project-linked earnings yet.",
                      "Пока нет строк по проектам.",
                      "עדיין אין שורות רווח לפי פרויקט.",
                    )}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleProjects.map((row, index) => (
                  <div
                    key={`${row.project_id || "none"}-${index}`}
                    className={earningsProjectRowClass(
                      Boolean(
                        focusedProjectId && row.project_id === focusedProjectId,
                      ),
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text">
                        {row.project_name ||
                          copy("No project", "Без проекта", "ללא פרויקט")}
                      </div>
                      {row.project_id ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Link
                            href={`/installer/projects/${row.project_id}`}
                            className={earningsSmallActionClass}
                          >
                            <FolderOpen
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            {copy(
                              "Open project",
                              "Открыть проект",
                              "פתח פרויקט",
                            )}
                          </Link>
                          <Link
                            href={`/installer/calendar?project_id=${row.project_id}`}
                            className={earningsSmallActionClass}
                          >
                            <CalendarDays
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            {copy(
                              "Open calendar",
                              "Открыть календарь",
                              "פתח יומן",
                            )}
                          </Link>
                          <Link
                            href={`/installer/sync-queue?project_id=${row.project_id}`}
                            className={earningsSmallActionClass}
                          >
                            <RefreshCcw
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            {copy(
                              "Open sync queue",
                              "Открыть очередь синка",
                              "פתח תור סנכרון",
                            )}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    <LtrText className="text-sm font-semibold text-text">
                      {formatLocaleMoney(
                        row.amount ?? row.total,
                        summary.currency,
                        locale,
                      )}
                    </LtrText>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>

          <WidgetCard
            title={copy("Daily totals", "Итоги по дням", "סיכומים יומיים")}
            headerMeta={copy("Days", "Дни", "ימים")}
            className="xl:col-span-1"
          >
            {days.length === 0 ? (
              <div className="text-sm text-text-secondary">
                {copy(
                  "No daily rows yet.",
                  "Пока нет дневных строк.",
                  "עדיין אין שורות יומיות.",
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {days.map((row) => (
                  <div
                    key={row.date}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                  >
                    <LtrText className="text-sm font-medium text-text">
                      {row.date}
                    </LtrText>
                    <LtrText className="text-sm font-semibold text-text">
                      {formatLocaleMoney(row.amount, summary.currency, locale)}
                    </LtrText>
                  </div>
                ))}
              </div>
            )}
          </WidgetCard>
        </div>
      )}
    </div>
  );
}
