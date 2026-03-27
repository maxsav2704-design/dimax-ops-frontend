"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { readableApiError } from "@/lib/api-error-display";
import { fetchInstallerEarningsSummary } from "@/lib/installer-api";
import { useI18n } from "@/lib/i18n";

function formatMoney(value: string | number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);

  return currency ? `${formatted} ${currency}` : formatted;
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
    return (new URLSearchParams(window.location.search).get("project_id") || "").trim();
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
    <div className="motion-stagger space-y-6">
      <section className="page-hero relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="page-eyebrow">{copy("Earnings", "Заработок", "רווחים")}</div>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
              {copy("Installer earnings", "Заработок монтажника", "רווחי מתקין")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {copy(
                "A simple breakdown for today, month, install types and projects.",
                "Простая разбивка по дню, месяцу, типам работ и проектам.",
                "פירוט פשוט להיום, לחודש, לסוגי התקנה ולפרויקטים."
              )}
            </p>
            {focusedProjectId ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">
                  {copy("Focused project", "Фокус на проекте", "פרויקט במיקוד")} {focusedProjectId}
                </span>
                <Link
                  href="/installer/earnings"
                  className="inline-flex items-center rounded-lg border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {copy("Show all earnings", "Показать весь заработок", "הצג את כל הרווחים")}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Link
              href="/installer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background/75 px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              {copy("Back to workspace", "Назад в рабочее место", "חזרה למרחב העבודה")}
            </Link>
            <button
              type="button"
              onClick={() => void earningsQuery.refetch()}
              disabled={earningsQuery.isFetching}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              {earningsQuery.isFetching ? copy("Refreshing...", "Обновляем...", "מרענן...") : copy("Refresh", "Обновить", "רענן")}
            </button>
          </div>
        </div>
      </section>

      {earningsQuery.isError && (
        <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {readableApiError(
            earningsQuery.error,
            locale,
            copy(
              "Failed to load earnings summary.",
              "Не удалось загрузить заработок.",
              "לא ניתן לטעון את סיכום הרווחים."
            )
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-tile">
          <div className="metric-label">{copy("Today", "Сегодня", "היום")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {earningsQuery.isLoading ? "…" : formatMoney(summary?.today_total, summary?.currency)}
          </div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("This month", "Этот месяц", "החודש")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {earningsQuery.isLoading ? "…" : formatMoney(summary?.month_total, summary?.currency)}
          </div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("Install types", "Типы работ", "סוגי התקנה")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {installTypes.length}
          </div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("Projects", "Проекты", "פרויקטים")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {projects.length}
          </div>
        </div>
      </div>

      {earningsQuery.isLoading && (
        <div className="surface-panel text-sm text-muted-foreground">
          {copy("Loading earnings...", "Загружаем заработок...", "טוען רווחים...")}
        </div>
      )}

      {!earningsQuery.isLoading && !summary && (
        <div className="surface-panel text-sm text-muted-foreground">
          {copy(
            "Earnings are currently unavailable.",
            "Заработок сейчас недоступен.",
            "סיכום הרווחים אינו זמין כרגע."
          )}
        </div>
      )}

      {!earningsQuery.isLoading && summary && (
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="surface-panel space-y-3 xl:col-span-1">
            <div>
              <div className="page-eyebrow">{copy("Install types", "Типы работ", "סוגי התקנה")}</div>
              <h2 className="mt-2 text-lg font-semibold">{copy("Breakdown", "Разбивка", "פירוט")}</h2>
            </div>
            {installTypes.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {copy("No install type rows yet.", "Пока нет строк по типам работ.", "עדיין אין שורות לפי סוגי התקנה.")}
              </div>
            ) : (
              <div className="space-y-3">
                {installTypes.map((row) => (
                  <div key={row.install_type} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
                    <div className="text-sm font-medium text-foreground">{row.install_type}</div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {formatMoney(row.amount, summary.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-panel space-y-3 xl:col-span-1">
            <div>
              <div className="page-eyebrow">{copy("Projects", "Проекты", "פרויקטים")}</div>
              <h2 className="mt-2 text-lg font-semibold">{copy("Project rows", "Строки по проектам", "שורות לפי פרויקט")}</h2>
            </div>
            {visibleProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {focusedProjectId
                  ? copy(
                      "No earnings rows match the selected project yet.",
                      "Пока нет строк заработка по выбранному проекту.",
                      "עדיין אין שורות רווח שתואמות לפרויקט שנבחר."
                    )
                  : copy("No project-linked earnings yet.", "Пока нет строк по проектам.", "עדיין אין שורות רווח לפי פרויקט.")}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleProjects.map((row, index) => (
                  <div
                    key={`${row.project_id || "none"}-${index}`}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 py-3 ${
                      focusedProjectId && row.project_id === focusedProjectId
                        ? "border-accent/45 shadow-[0_18px_40px_-28px_hsl(var(--accent)/0.5)]"
                        : "border-border/70"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {row.project_name || copy("No project", "Без проекта", "ללא פרויקט")}
                      </div>
                      {row.project_id ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Link
                            href={`/installer/projects/${row.project_id}`}
                            className="inline-flex items-center rounded-lg border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            {copy("Open project", "Открыть проект", "פתח פרויקט")}
                          </Link>
                          <Link
                            href={`/installer/calendar?project_id=${row.project_id}`}
                            className="inline-flex items-center rounded-lg border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            {copy("Open calendar", "Открыть календарь", "פתח יומן")}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {formatMoney(row.amount, summary.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-panel space-y-3 xl:col-span-1">
            <div>
              <div className="page-eyebrow">{copy("Days", "Дни", "ימים")}</div>
              <h2 className="mt-2 text-lg font-semibold">{copy("Daily totals", "Итоги по дням", "סיכומים יומיים")}</h2>
            </div>
            {days.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {copy("No daily rows yet.", "Пока нет дневных строк.", "עדיין אין שורות יומיות.")}
              </div>
            ) : (
              <div className="space-y-3">
                {days.map((row) => (
                  <div key={row.date} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
                    <div className="text-sm font-medium text-foreground">{row.date}</div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {formatMoney(row.amount, summary.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
