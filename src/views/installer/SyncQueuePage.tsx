"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FolderOpen,
  MessageSquareWarning,
  RefreshCcw,
  WalletCards,
} from "lucide-react";

import {
  KpiCard as DimaxKpiCard,
  WidgetCard,
} from "@/components/dimax";
import { LtrText } from "@/components/ui/LtrText";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  readableApiError,
  readableConflictCode,
} from "@/lib/api-error-display";
import { formatLocaleDateTime, formatLocaleNumber } from "@/lib/formatting";
import { fetchInstallerSyncQueue } from "@/lib/installer-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function syncNoticeClass(): string {
  return "rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-sm text-status-problem-fg";
}

const syncPrimaryActionClass =
  "dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60";

const syncSmallActionClass =
  "dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60";

function syncQueueItemClass(status: string, hasConflict: boolean): string {
  const normalized = status.trim().toUpperCase();
  return cn(
    "rounded-lg border p-4 transition-colors",
    hasConflict || normalized === "FAILED"
      ? "border-status-problem-border bg-status-problem-bg"
      : normalized === "BLOCKED"
        ? "border-status-blocked-border bg-status-blocked-bg"
        : "border-border bg-surface hover:border-border-strong hover:bg-surface-subtle",
  );
}

export default function InstallerSyncQueuePage() {
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const syncStatusLabel = (status: string) => {
    const normalized = status.trim().toUpperCase();
    switch (normalized) {
      case "PENDING":
        return copy("Pending", "Ожидает", "ממתין");
      case "FAILED":
        return copy("Failed", "Ошибка", "נכשל");
      case "BLOCKED":
        return copy("Blocked", "Заблокировано", "חסום");
      case "SYNCED":
      case "SUCCESS":
        return copy("Synced", "Синхронизировано", "סונכרן");
      case "CONFLICT":
        return copy("Conflict", "Конфликт", "קונפליקט");
      default:
        return status || "-";
    }
  };
  const focusedProjectId = (searchParams?.get("project_id") || "").trim();

  const syncQuery = useQuery({
    queryKey: ["installer-sync-queue"],
    queryFn: fetchInstallerSyncQueue,
    refetchInterval: 30_000,
  });

  const allItems = useMemo(
    () => syncQuery.data?.items || [],
    [syncQuery.data?.items],
  );
  const items = useMemo(() => {
    if (!focusedProjectId) {
      return allItems;
    }
    return allItems.filter(
      (item) =>
        item.project_id === focusedProjectId ||
        (item.entity_type === "project" && item.entity_id === focusedProjectId),
    );
  }, [allItems, focusedProjectId]);
  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((item) => item.status === "PENDING").length,
      failed: items.filter((item) => item.status === "FAILED").length,
      blocked: items.filter((item) => item.status === "BLOCKED").length,
    }),
    [items],
  );

  return (
    <div className="motion-stagger page-stack">
      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="page-eyebrow">
              {copy("Sync queue", "Очередь синка", "תור סנכרון")}
            </div>
            <h1 className="dmx-page-title mt-4 flex items-center gap-2">
              <RefreshCcw aria-hidden="true" className="h-6 w-6" />
              {copy(
                "Installer sync queue",
                "Очередь синка монтажника",
                "תור הסנכרון של המתקין",
              )}
            </h1>
            <p className="dmx-page-subtitle mt-3 max-w-2xl">
              {copy(
                "Pending, failed and blocked actions in one simple list.",
                "Ожидающие, неудачные и заблокированные действия в одном простом списке.",
                "פעולות ממתינות, נכשלות וחסומות ברשימה פשוטה אחת.",
              )}
            </p>
            {focusedProjectId ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">
                  {copy("Focused project", "Фокус на проекте", "פרויקט במיקוד")}{" "}
                  {focusedProjectId}
                </span>
                <Link
                  href="/installer/sync-queue"
                  className={syncSmallActionClass}
                >
                  {copy(
                    "Show full sync queue",
                    "Показать всю очередь синка",
                    "הצג את כל תור הסנכרון",
                  )}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="toolbar-row">
            <Link href="/installer" className={syncSmallActionClass}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {copy(
                "Back to workspace",
                "Назад в рабочее место",
                "חזרה למרחב העבודה",
              )}
            </Link>
            <button
              type="button"
              onClick={() => void syncQuery.refetch()}
              disabled={syncQuery.isFetching}
              className={syncPrimaryActionClass}
            >
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />
              {syncQuery.isFetching
                ? copy("Refreshing…", "Обновляем…", "מרענן…")
                : copy("Refresh", "Обновить", "רענן")}
            </button>
          </div>
        </div>
      </section>

      {syncQuery.isError && (
        <div className={syncNoticeClass()}>
          {readableApiError(
            syncQuery.error,
            locale,
            copy(
              "Failed to load sync queue.",
              "Не удалось загрузить очередь синка.",
              "לא ניתן לטעון את תור הסנכרון.",
            ),
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DimaxKpiCard
          label={copy("Total", "Всего", 'סה"כ')}
          value={<LtrText>{formatLocaleNumber(stats.total, locale)}</LtrText>}
          hint={copy("Queue items", "Элементы очереди", "פריטי תור")}
          barColor="blue"
        />
        <DimaxKpiCard
          label={copy("Pending", "Ожидают", "ממתינות")}
          value={<LtrText>{formatLocaleNumber(stats.pending, locale)}</LtrText>}
          hint={copy("Waiting to sync", "Ждут синка", "ממתין לסנכרון")}
          barColor="yellow"
        />
        <DimaxKpiCard
          label={copy("Failed", "Ошибки", "נכשלו")}
          value={<LtrText>{formatLocaleNumber(stats.failed, locale)}</LtrText>}
          hint={copy("Needs attention", "Нужна проверка", "דורש טיפול")}
          barColor="red"
          emphasis={stats.failed > 0 ? "problem" : "default"}
        />
        <DimaxKpiCard
          label={copy("Blocked", "Заблокированы", "חסומות")}
          value={<LtrText>{formatLocaleNumber(stats.blocked, locale)}</LtrText>}
          hint={copy("Conflict or dependency", "Конфликт или зависимость", "קונפליקט או תלות")}
          barColor="orange"
        />
      </div>

      {syncQuery.isLoading && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          {copy(
            "Loading sync queue…",
            "Загружаем очередь синка…",
            "טוען את תור הסנכרון…",
          )}
        </div>
      )}

      {!syncQuery.isLoading && !syncQuery.data && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          {copy(
            "Sync queue is currently unavailable.",
            "Очередь синка сейчас недоступна.",
            "תור הסנכרון אינו זמין כרגע.",
          )}
        </div>
      )}

      {!syncQuery.isLoading && syncQuery.data && items.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          {focusedProjectId
            ? copy(
                "No sync items for the focused project.",
                "Для выбранного проекта нет элементов в очереди синка.",
                "אין פריטי סנכרון לפרויקט שבמיקוד.",
              )
            : copy(
                "Sync queue is empty.",
                "Очередь синка пуста.",
                "תור הסנכרון ריק.",
              )}
        </div>
      )}

      {!syncQuery.isLoading && items.length > 0 && (
        <WidgetCard
          title={copy("Action list", "Список действий", "רשימת פעולות")}
          headerMeta={copy("Queue items", "Элементы очереди", "פריטי תור")}
        >
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={syncQueueItemClass(
                  item.status,
                  Boolean(item.conflict_code),
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <LtrText className="block truncate text-sm font-semibold text-text">
                      {item.operation_type}
                    </LtrText>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-text-secondary">
                      <LtrText>{item.entity_type}</LtrText>
                      {item.entity_id ? (
                        <>
                          <span aria-hidden="true">|</span>
                          <LtrText>{item.entity_id}</LtrText>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge
                    status={item.status}
                    label={syncStatusLabel(item.status)}
                    domain="sync"
                    className="shrink-0"
                  />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
                  <div>
                    <span className="font-medium text-text">
                      {copy("Created", "Создано", "נוצר")}:{" "}
                    </span>
                    <LtrText>
                      {formatLocaleDateTime(item.created_at, locale)}
                    </LtrText>
                  </div>
                  <div>
                    <span className="font-medium text-text">
                      {copy("Synced", "Синхронизировано", "סונכרן")}:{" "}
                    </span>
                    <LtrText>
                      {formatLocaleDateTime(item.synced_at, locale)}
                    </LtrText>
                  </div>
                  <div>
                    <span className="font-medium text-text">
                      {copy("Conflict", "Конфликт", "קונפליקט")}:{" "}
                    </span>
                    {item.conflict_code ? (
                      <span className="inline-flex flex-wrap items-center gap-1 text-status-problem-fg">
                        <span>
                          {readableConflictCode(item.conflict_code, locale)}
                        </span>
                        <LtrText className="text-[11px] text-text-secondary">
                          ({item.conflict_code})
                        </LtrText>
                      </span>
                    ) : (
                      copy("None", "Нет", "אין")
                    )}
                  </div>
                </div>
                {(item.entity_type === "issue" ||
                  item.project_id ||
                  item.entity_type === "project") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.entity_type === "issue" && item.entity_id ? (
                      <Link
                        href={`/installer/issues?${new URLSearchParams({
                          issue_id: item.entity_id,
                          issue_search: item.entity_id,
                          ...(item.project_id
                            ? { project_id: item.project_id }
                            : {}),
                        }).toString()}`}
                        className={syncSmallActionClass}
                      >
                        <MessageSquareWarning
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                        {copy("Open issue", "Открыть проблему", "פתח בעיה")}
                      </Link>
                    ) : null}
                    {(item.project_id || item.entity_type === "project") &&
                    (item.project_id || item.entity_id) ? (
                      <>
                        <Link
                          href={`/installer/projects/${encodeURIComponent(item.project_id || item.entity_id || "")}`}
                          className={syncSmallActionClass}
                        >
                          <FolderOpen aria-hidden="true" className="h-4 w-4" />
                          {copy("Open project", "Открыть проект", "פתח פרויקט")}
                        </Link>
                        <Link
                          href={`/installer/calendar?project_id=${encodeURIComponent(item.project_id || item.entity_id || "")}`}
                          className={syncSmallActionClass}
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
                          href={`/installer/earnings?project_id=${encodeURIComponent(item.project_id || item.entity_id || "")}`}
                          className={syncSmallActionClass}
                        >
                          <WalletCards aria-hidden="true" className="h-4 w-4" />
                          {copy(
                            "Open earnings",
                            "Открыть заработок",
                            "פתח רווחים",
                          )}
                        </Link>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </WidgetCard>
      )}
    </div>
  );
}
