"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import {
  fetchInstallerIssueMedia,
  fetchInstallerIssues,
  fetchInstallerMediaUrl,
  type InstallerIssueMediaAsset,
  updateInstallerIssue,
} from "@/lib/installer-api";
import { type Locale, useI18n } from "@/lib/i18n";
import { readableApiError } from "@/lib/api-error-display";

type CopyFn = (en: string, ru: string, he: string) => string;

function IssueMediaPanel({
  issueId,
  mediaCount,
  locale,
  copy,
}: {
  issueId: string;
  mediaCount: number;
  locale: Locale;
  copy: CopyFn;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const mediaQuery = useQuery({
    queryKey: ["installer-issue-media", issueId],
    queryFn: () => fetchInstallerIssueMedia(issueId),
    enabled: isOpen && mediaCount > 0,
    staleTime: 30_000,
  });

  const openMediaMutation = useMutation({
    mutationFn: async (media: InstallerIssueMediaAsset) => {
      const url = await fetchInstallerMediaUrl(media.id);
      return { url, media };
    },
    onSuccess: ({ url }) => {
      setOpenError(null);
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (error) => {
      setOpenError(
        readableApiError(
          error,
          locale,
          copy(
            "Failed to open media file.",
            "Не удалось открыть медиафайл.",
            "לא ניתן לפתוח את קובץ המדיה."
          )
        )
      );
    },
  });

  if (mediaCount <= 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-background/55 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {copy("Issue media", "Медиа по проблеме", "מדיה לבעיה")}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 bg-background/80 px-3 text-xs font-medium transition-colors hover:bg-muted"
        >
          {isOpen
            ? copy("Hide media", "Скрыть медиа", "הסתר מדיה")
            : copy("Show media", "Показать медиа", "הצג מדיה")}
        </button>
      </div>

      {isOpen && mediaQuery.isLoading && (
        <div className="text-xs text-muted-foreground">
          {copy("Loading media...", "Загружаем медиа...", "טוען מדיה...")}
        </div>
      )}

      {isOpen && mediaQuery.isError && (
        <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2 text-xs text-[hsl(var(--destructive))]">
          {readableApiError(
            mediaQuery.error,
            locale,
            copy(
              "Failed to load media details.",
              "Не удалось загрузить детали медиа.",
              "לא ניתן לטעון את פרטי המדיה."
            )
          )}
        </div>
      )}

      {isOpen && openError && (
        <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2 text-xs text-[hsl(var(--destructive))]">
          {openError}
        </div>
      )}

      {isOpen && !mediaQuery.isLoading && !mediaQuery.isError && mediaQuery.data?.length === 0 && (
        <div className="text-xs text-muted-foreground">
          {copy(
            "Media count exists, but details are not available yet.",
            "Количество медиа есть, но детали пока недоступны.",
            "מספר המדיה קיים, אך הפרטים עדיין לא זמינים."
          )}
        </div>
      )}

      {isOpen && !!mediaQuery.data?.length && (
        <div className="space-y-2">
          {mediaQuery.data.map((media, index) => (
            <div
              key={media.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/75 px-3 py-2"
            >
              <div className="min-w-0 space-y-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {media.file_name ||
                    copy(
                      `Media file ${index + 1}`,
                      `Медиафайл ${index + 1}`,
                      `קובץ מדיה ${index + 1}`
                    )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[media.content_type, media.created_at].filter(Boolean).join(" • ") ||
                    copy("Attachment", "Вложение", "קובץ מצורף")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openMediaMutation.mutate(media)}
                disabled={openMediaMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border/70 bg-background px-3 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {openMediaMutation.isPending
                  ? copy("Opening...", "Открываем...", "פותח...")
                  : copy("Open media", "Открыть медиа", "פתח מדיה")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InstallerIssuesPage() {
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const copy: CopyFn = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };

  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [focusedIssueId, setFocusedIssueId] = useState("");
  const [isQueryInitialized, setIsQueryInitialized] = useState(false);
  const [draftComments, setDraftComments] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const issuesQuery = useQuery({
    queryKey: ["installer-issues"],
    queryFn: fetchInstallerIssues,
    refetchInterval: 30_000,
  });

  const updateIssueMutation = useMutation({
    mutationFn: async (payload: { issueId: string; comment: string }) =>
      updateInstallerIssue(payload.issueId, {
        comment: payload.comment.trim() ? payload.comment.trim() : null,
      }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["installer-issues"] });
    },
    onError: (error) => {
      setActionError(
        readableApiError(
          error,
          locale,
          copy(
            "Failed to update issue note.",
            "Не удалось обновить заметку по проблеме.",
            "לא ניתן לעדכן את ההערה לבעיה."
          )
        )
      );
    },
  });

  const issues = issuesQuery.data || [];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setProjectFilter(params.get("project_id") || "ALL");
    setStatusFilter(params.get("issue_status") || "ALL");
    const issueId = params.get("issue_id") || "";
    setFocusedIssueId(issueId);
    setSearch(params.get("issue_search") || issueId);
    setIsQueryInitialized(true);
  }, []);

  useEffect(() => {
    if (!issuesQuery.data) {
      return;
    }

    setDraftComments((current) => {
      const next = { ...current };
      for (const issue of issuesQuery.data) {
        if (!(issue.id in next)) {
          next[issue.id] = issue.comment || "";
        }
      }
      return next;
    });
  }, [issuesQuery.data]);

  useEffect(() => {
    if (!isQueryInitialized || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams();
    if (projectFilter !== "ALL") {
      params.set("project_id", projectFilter);
    }
    if (statusFilter !== "ALL") {
      params.set("issue_status", statusFilter);
    }
    if (search.trim()) {
      params.set("issue_search", search.trim());
    }
    if (focusedIssueId) {
      params.set("issue_id", focusedIssueId);
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [focusedIssueId, isQueryInitialized, projectFilter, search, statusFilter]);

  const projectOptions = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.project_id).filter(Boolean) as string[])).sort(),
    [issues]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.status).filter(Boolean))).sort(),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return issues.filter((issue) => {
      if (projectFilter !== "ALL" && issue.project_id !== projectFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && issue.status !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [issue.id, issue.title, issue.description, issue.details, issue.priority, issue.door_id, issue.comment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [issues, projectFilter, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: issues.length,
      blocked: issues.filter((issue) => issue.status === "BLOCKED").length,
      visible: filteredIssues.length,
      projects: new Set(issues.map((issue) => issue.project_id).filter(Boolean)).size,
    }),
    [filteredIssues.length, issues]
  );

  function resetFilters() {
    setProjectFilter("ALL");
    setStatusFilter("ALL");
    setSearch("");
    setFocusedIssueId("");
  }

  const hasActiveFilters = projectFilter !== "ALL" || statusFilter !== "ALL" || search.trim().length > 0;

  return (
    <div className="motion-stagger space-y-6">
      <section className="page-hero relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="page-eyebrow">{copy("Issues", "Проблемы", "בעיות")}</div>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
              {copy("Installer issues", "Проблемы монтажника", "בעיות המתקין")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {copy(
                "One simple list for blocked, open and project-linked issues.",
                "Один простой список для заблокированных, открытых и привязанных к проекту проблем.",
                "רשימה פשוטה אחת לבעיות חסומות, פתוחות ומקושרות לפרויקט."
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
              onClick={() => void issuesQuery.refetch()}
              disabled={issuesQuery.isFetching}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              {issuesQuery.isFetching ? copy("Refreshing...", "Обновляем...", "מרענן...") : copy("Refresh", "Обновить", "רענן")}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-tile">
          <div className="metric-label">{copy("Total", "Всего", "סך הכול")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">{stats.total}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("Blocked", "Заблокированы", "חסומות")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">{stats.blocked}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("Visible", "Видно", "גלויות")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">{stats.visible}</div>
        </div>
        <div className="metric-tile">
          <div className="metric-label">{copy("Projects", "Проекты", "פרויקטים")}</div>
          <div className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">{stats.projects}</div>
        </div>
      </div>

      <section className="surface-panel space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_1.2fr_auto]">
          <label className="field-stack">
            <span className="text-sm text-muted-foreground">{copy("Project", "Проект", "פרויקט")}</span>
            <select
              aria-label={copy("Project", "Проект", "פרויקט")}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="control-input"
            >
              <option value="ALL">{copy("All projects", "Все проекты", "כל הפרויקטים")}</option>
              {projectOptions.map((projectId) => (
                <option key={projectId} value={projectId}>
                  {projectId}
                </option>
              ))}
            </select>
          </label>
          <label className="field-stack">
            <span className="text-sm text-muted-foreground">{copy("Status", "Статус", "סטטוס")}</span>
            <select
              aria-label={copy("Status", "Статус", "סטטוס")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="control-input"
            >
              <option value="ALL">{copy("All statuses", "Все статусы", "כל הסטטוסים")}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field-stack">
            <span className="text-sm text-muted-foreground">{copy("Search", "Поиск", "חיפוש")}</span>
            <input
              aria-label={copy("Issue search", "Поиск проблемы", "חיפוש בעיה")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy("Door, title, details, priority", "Дверь, заголовок, детали, приоритет", "דלת, כותרת, פרטים, עדיפות")}
              className="control-input"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background/75 px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy("Reset filters", "Сбросить фильтры", "אפס מסננים")}
            </button>
          </div>
        </div>
      </section>

      {issuesQuery.isError && (
        <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {readableApiError(
            issuesQuery.error,
            locale,
            copy(
              "Failed to load installer issues.",
              "Не удалось загрузить проблемы монтажника.",
              "לא ניתן לטעון את בעיות המתקין."
            )
          )}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {actionError}
        </div>
      )}

      {issuesQuery.isLoading && (
        <div className="surface-panel text-sm text-muted-foreground">
          {copy("Loading issues...", "Загружаем проблемы...", "טוען בעיות...")}
        </div>
      )}

      {!issuesQuery.isLoading && issues.length === 0 && (
        <div className="surface-panel text-sm text-muted-foreground">
          {copy("No issues assigned right now.", "Сейчас нет назначенных проблем.", "כרגע אין בעיות משויכות.")}
        </div>
      )}

      {!issuesQuery.isLoading && issues.length > 0 && filteredIssues.length === 0 && (
        <div className="surface-panel text-sm text-muted-foreground">
          {copy("No issues match current filters.", "Нет проблем под текущие фильтры.", "אין בעיות שמתאימות למסננים הנוכחיים.")}
        </div>
      )}

      {!issuesQuery.isLoading && filteredIssues.length > 0 && (
        <section className="space-y-3">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`surface-panel space-y-3 ${
                focusedIssueId === issue.id
                  ? "border-accent/45 shadow-[0_24px_60px_-36px_hsl(var(--accent)/0.55)]"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-foreground">
                    {issue.title || copy("Issue", "Проблема", "בעיה")}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {issue.project_id || copy("No project", "Без проекта", "ללא פרויקט")}
                    {issue.door_id ? ` • ${issue.door_id}` : ""}
                    {issue.priority ? ` • ${issue.priority}` : ""}
                  </div>
                </div>
                <span className="rounded-lg border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                  {issue.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {issue.description || issue.details || copy("No details yet.", "Пока нет деталей.", "עדיין אין פרטים.")}
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="field-stack">
                  <span className="text-xs text-muted-foreground">{copy("Field note", "Заметка с объекта", "הערת שטח")}</span>
                  <textarea
                    aria-label={`${copy("Field note", "Заметка с объекта", "הערת שטח")} ${issue.id}`}
                    value={draftComments[issue.id] ?? issue.comment ?? ""}
                    onChange={(event) =>
                      setDraftComments((current) => ({
                        ...current,
                        [issue.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    className="control-textarea min-h-[92px]"
                    placeholder={copy(
                      "Add a short installer note for admin and office follow-up.",
                      "Добавь короткую заметку для админа и дальнейшей обработки.",
                      "הוסף הערה קצרה למנהל ולהמשך טיפול במשרד."
                    )}
                  />
                </label>
                <div className="flex flex-col justify-between gap-2">
                  <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    {copy("Media", "Медиа", "מדיה")}: <span className="font-medium text-foreground">{issue.media_count ?? 0}</span>
                  </div>
                  <button
                    type="button"
                    disabled={updateIssueMutation.isPending}
                    onClick={() =>
                      updateIssueMutation.mutate({
                        issueId: issue.id,
                        comment: draftComments[issue.id] ?? issue.comment ?? "",
                      })
                    }
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background/75 px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updateIssueMutation.isPending
                      ? copy("Saving...", "Сохраняем...", "שומר...")
                      : copy("Save note", "Сохранить заметку", "שמור הערה")}
                  </button>
                </div>
              </div>
              <IssueMediaPanel
                issueId={issue.id}
                mediaCount={issue.media_count ?? 0}
                locale={locale}
                copy={copy}
              />
              <div className="flex flex-wrap gap-2">
                {issue.project_id && (
                  <Link
                    href={`/installer/projects/${issue.project_id}`}
                    className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    {copy("Open project", "Открыть проект", "פתח פרויקט")}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

