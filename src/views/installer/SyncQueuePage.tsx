"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { readableApiError, readableConflictCode } from "@/lib/api-error-display";
import { fetchInstallerSyncQueue } from "@/lib/installer-api";
import { useI18n } from "@/lib/i18n";

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InstallerSyncQueuePage() {
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };

  const syncQuery = useQuery({
    queryKey: ["installer-sync-queue"],
    queryFn: fetchInstallerSyncQueue,
    refetchInterval: 30_000,
  });

  const items = syncQuery.data?.items || [];
  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((item) => item.status === "PENDING").length,
    failed: items.filter((item) => item.status === "FAILED").length,
    blocked: items.filter((item) => item.status === "BLOCKED").length,
  }), [items]);

  return (
    <div className="motion-stagger space-y-6">
      <section className="page-hero relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="page-eyebrow">{copy("Sync queue", "Очередь синка", "תור סנכרון")}</div>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
              {copy("Installer sync queue", "Очередь синка монтажника", "תור הסנכרון של המתקין")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {copy(
                "Pending, failed and blocked actions in one simple list.",
                "Ожидающие, неудачные и заблокированные действия в одном простом списке.",
                "פעולות ממתינות, נכשלות וחסומות ברשימה פשוטה אחת."
              )}
            </p>
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
              onClick={() => void syncQuery.refetch()}
              disabled={syncQuery.isFetching}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              {syncQuery.isFetching ? copy("Refreshing...", "Обновляем...", "מרענן...") : copy("Refresh", "Обновить", "רענן")}
            </button>
          </div>
        </div>
      </section>

      {syncQuery.isError && (
        <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {readableApiError(
            syncQuery.error,
            locale,
            copy(
              "Failed to load sync queue.",
              "Не удалось загрузить очередь синка.",
              "לא ניתן לטעון את תור הסנכרון."
            )
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-tile">
          <div className="metric-label">{copy("Total", "Всего", "סה\"כ")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">{stats.total}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("Pending", "Ожидают", "ממתינות")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">{stats.pending}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("Failed", "Ошибки", "נכשלו")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">{stats.failed}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("Blocked", "Заблокированы", "חסומות")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">{stats.blocked}</div>
        </div>
      </div>

      {syncQuery.isLoading && (
        <div className="surface-panel text-sm text-muted-foreground">
          {copy("Loading sync queue...", "Загружаем очередь синка...", "טוען את תור הסנכרון...")}
        </div>
      )}

      {!syncQuery.isLoading && !syncQuery.data && (
        <div className="surface-panel text-sm text-muted-foreground">
          {copy(
            "Sync queue is currently unavailable.",
            "Очередь синка сейчас недоступна.",
            "תור הסנכרון אינו זמין כרגע."
          )}
        </div>
      )}

      {!syncQuery.isLoading && syncQuery.data && items.length === 0 && (
        <div className="surface-panel text-sm text-muted-foreground">
          {copy("Sync queue is empty.", "Очередь синка пуста.", "תור הסנכרון ריק.")}
        </div>
      )}

      {!syncQuery.isLoading && items.length > 0 && (
        <section className="surface-panel space-y-3">
          <div>
            <div className="page-eyebrow">{copy("Queue items", "Элементы очереди", "פריטי תור")}</div>
            <h2 className="mt-2 text-lg font-semibold">{copy("Action list", "Список действий", "רשימת פעולות")}</h2>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.operation_type}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.entity_type}
                      {item.entity_id ? ` • ${item.entity_id}` : ""}
                    </div>
                  </div>
                  <span className="rounded-lg border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <span className="font-medium text-foreground">{copy("Created", "Создано", "נוצר")}: </span>
                    {formatDate(item.created_at)}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{copy("Synced", "Синхронизировано", "סונכרן")}: </span>
                    {formatDate(item.synced_at)}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{copy("Conflict", "Конфликт", "קונפליקט")}: </span>
                    {item.conflict_code ? (
                      <>
                        {readableConflictCode(item.conflict_code, locale)}
                        <span className="text-[11px] text-muted-foreground"> ({item.conflict_code})</span>
                      </>
                    ) : (
                      copy("None", "Нет", "אין")
                    )}
                  </div>
                </div>
                {(item.entity_type === "issue" || item.project_id || item.entity_type === "project") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.entity_type === "issue" && item.entity_id ? (
                      <Link
                        href={`/installer/issues?issue_id=${encodeURIComponent(item.entity_id)}&issue_search=${encodeURIComponent(item.entity_id)}`}
                        className="inline-flex items-center rounded-lg border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        {copy("Open issue", "Открыть проблему", "פתח בעיה")}
                      </Link>
                    ) : null}
                    {(item.project_id || item.entity_type === "project") && (item.project_id || item.entity_id) ? (
                      <Link
                        href={`/installer/projects/${encodeURIComponent(item.project_id || item.entity_id || "")}`}
                        className="inline-flex items-center rounded-lg border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        {copy("Open project", "Открыть проект", "פתח פרויקט")}
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
