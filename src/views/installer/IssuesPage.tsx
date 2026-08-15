"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  RefreshCcw,
  Save,
  WalletCards,
} from "lucide-react";
import { KpiCard as DimaxKpiCard, WidgetCard } from "@/components/dimax";
import { LtrText } from "@/components/ui/LtrText";
import {
  fetchInstallerIssueMedia,
  fetchInstallerIssues,
  fetchInstallerMediaUrl,
  type InstallerIssueMediaAsset,
  updateInstallerIssue,
} from "@/lib/installer-api";
import { type Locale, useI18n } from "@/lib/i18n";
import { readableApiError } from "@/lib/api-error-display";
import { formatLocaleNumber } from "@/lib/formatting";
import { cn } from "@/lib/utils";
type CopyFn = (en: string, ru: string, he: string) => string;
function issuesNoticeClass(): string {
  return "rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-sm text-status-problem-fg";
}
const issuesPrimaryActionClass =
  "dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60";
const issuesSmallActionClass =
  "dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60";
function issueStatusClass(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "BLOCKED") {
    return "rounded-lg border border-status-problem-border bg-status-problem-bg px-2.5 py-1 text-xs font-medium text-status-problem-fg";
  }
  if (normalized === "OPEN") {
    return "rounded-lg border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-xs font-medium text-status-warning-fg";
  }
  return "rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text";
}
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
            "לא ניתן לפתוח את קובץ המדיה.",
          ),
        ),
      );
    },
  });
  if (mediaCount <= 0) {
    return null;
  }
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3">
      {" "}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {" "}
        <div className="text-xs font-medium uppercase text-text-secondary">
          {" "}
          {copy("Issue media", "Медиа по проблеме", "מדיה לבעיה")}{" "}
        </div>{" "}
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={issuesSmallActionClass}
        >
          {" "}
          <ImageIcon aria-hidden="true" className="h-4 w-4" />{" "}
          {isOpen
            ? copy("Hide media", "Скрыть медиа", "הסתר מדיה")
            : copy("Show media", "Показать медиа", "הצג מדיה")}{" "}
        </button>{" "}
      </div>{" "}
      {isOpen && mediaQuery.isLoading && (
        <div className="text-xs text-text-secondary">
          {" "}
          {copy("Loading media...", "Загружаем медиа...", "טוען מדיה...")}{" "}
        </div>
      )}{" "}
      {isOpen && mediaQuery.isError && (
        <div className="rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2 text-xs text-status-problem-fg">
          {" "}
          {readableApiError(
            mediaQuery.error,
            locale,
            copy(
              "Failed to load media details.",
              "Не удалось загрузить детали медиа.",
              "לא ניתן לטעון את פרטי המדיה.",
            ),
          )}{" "}
        </div>
      )}{" "}
      {isOpen && openError && (
        <div className="rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2 text-xs text-status-problem-fg">
          {" "}
          {openError}{" "}
        </div>
      )}{" "}
      {isOpen &&
        !mediaQuery.isLoading &&
        !mediaQuery.isError &&
        mediaQuery.data?.length === 0 && (
          <div className="text-xs text-text-secondary">
            {" "}
            {copy(
              "Media count exists, but details are not available yet.",
              "Количество медиа есть, но детали пока недоступны.",
              "מספר המדיה קיים, אך הפרטים עדיין לא זמינים.",
            )}{" "}
          </div>
        )}{" "}
      {isOpen && !!mediaQuery.data?.length && (
        <div className="space-y-2">
          {" "}
          {mediaQuery.data.map((media, index) => (
            <div
              key={media.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              {" "}
              <div className="min-w-0 space-y-1">
                {" "}
                <div className="truncate text-sm font-medium text-text">
                  {" "}
                  {media.file_name ||
                    copy(
                      `Media file ${index + 1}`,
                      `Медиафайл ${index + 1}`,
                      `קובץ מדיה ${index + 1}`,
                    )}{" "}
                </div>{" "}
                <div className="text-xs text-text-secondary">
                  {" "}
                  {[media.content_type, media.created_at]
                    .filter(Boolean)
                    .join(" • ") ||
                    copy("Attachment", "Вложение", "קובץ מצורף")}{" "}
                </div>{" "}
              </div>{" "}
              <button
                type="button"
                onClick={() => openMediaMutation.mutate(media)}
                disabled={openMediaMutation.isPending}
                className={issuesSmallActionClass}
              >
                {" "}
                <Eye aria-hidden="true" className="h-4 w-4" />{" "}
                {openMediaMutation.isPending
                  ? copy("Opening...", "Открываем...", "פותח...")
                  : copy("Open media", "Открыть медиа", "פתח מדיה")}{" "}
              </button>{" "}
            </div>
          ))}{" "}
        </div>
      )}{" "}
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
  const [draftComments, setDraftComments] = useState<Record<string, string>>(
    {},
  );
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
            "לא ניתן לעדכן את ההערה לבעיה.",
          ),
        ),
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
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [focusedIssueId, isQueryInitialized, projectFilter, search, statusFilter]);
  const projectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          issues.map((issue) => issue.project_id).filter(Boolean) as string[],
        ),
      ).sort(),
    [issues],
  );
  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(issues.map((issue) => issue.status).filter(Boolean)),
      ).sort(),
    [issues],
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
      return [
        issue.id,
        issue.title,
        issue.description,
        issue.details,
        issue.priority,
        issue.door_id,
        issue.comment,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [issues, projectFilter, search, statusFilter]);
  const stats = useMemo(
    () => ({
      total: issues.length,
      blocked: issues.filter((issue) => issue.status === "BLOCKED").length,
      visible: filteredIssues.length,
      projects: new Set(issues.map((issue) => issue.project_id).filter(Boolean))
        .size,
    }),
    [filteredIssues.length, issues],
  );
  function resetFilters() {
    setProjectFilter("ALL");
    setStatusFilter("ALL");
    setSearch("");
    setFocusedIssueId("");
  }
  const hasActiveFilters =
    projectFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    search.trim().length > 0;
  return (
    <div className="motion-stagger page-stack">
      {" "}
      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        {" "}
        <div className="flex flex-wrap items-start justify-between gap-4">
          {" "}
          <div className="max-w-2xl">
            {" "}
            <div className="page-eyebrow">
              {copy("Issues", "Проблемы", "בעיות")}
            </div>{" "}
            <h1 className="dmx-page-title mt-4 flex items-center gap-2">
              {" "}
              <CircleAlert aria-hidden="true" className="h-6 w-6" />{" "}
              {copy(
                "Installer issues",
                "Проблемы монтажника",
                "בעיות המתקין",
              )}{" "}
            </h1>{" "}
            <p className="dmx-page-subtitle mt-3 max-w-2xl">
              {" "}
              {copy(
                "One simple list for blocked, open and project-linked issues.",
                "Один простой список для заблокированных, открытых и привязанных к проекту проблем.",
                "רשימה פשוטה אחת לבעיות חסומות, פתוחות ומקושרות לפרויקט.",
              )}{" "}
            </p>{" "}
            {projectFilter !== "ALL" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {" "}
                <span className="metric-chip">
                  {" "}
                  {copy(
                    "Focused project",
                    "Фокус на проекте",
                    "פרויקט במיקוד",
                  )}{" "}
                  {projectFilter}{" "}
                </span>{" "}
                <Link
                  href="/installer/issues"
                  className={issuesSmallActionClass}
                >
                  {" "}
                  {copy(
                    "Show all issues",
                    "Показать все проблемы",
                    "הצג את כל הבעיות",
                  )}{" "}
                </Link>{" "}
              </div>
            ) : null}{" "}
          </div>{" "}
          <div className="toolbar-row">
            {" "}
            <Link href="/installer" className={issuesSmallActionClass}>
              {" "}
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />{" "}
              {copy(
                "Back to workspace",
                "Назад в рабочее место",
                "חזרה למרחב העבודה",
              )}{" "}
            </Link>{" "}
            <button
              type="button"
              onClick={() => void issuesQuery.refetch()}
              disabled={issuesQuery.isFetching}
              className={issuesPrimaryActionClass}
            >
              {" "}
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />{" "}
              {issuesQuery.isFetching
                ? copy("Refreshing...", "Обновляем...", "מרענן...")
                : copy("Refresh", "Обновить", "רענן")}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {" "}
        <DimaxKpiCard
          label={copy("Total", "Всего", "סך הכול")}
          value={<LtrText>{formatLocaleNumber(stats.total, locale)}</LtrText>}
          hint={copy("Assigned issues", "Назначенные проблемы", "בעיות משויכות")}
          barColor="blue"
        />{" "}
        <DimaxKpiCard
          label={copy("Blocked", "Заблокированы", "חסומות")}
          value={<LtrText>{formatLocaleNumber(stats.blocked, locale)}</LtrText>}
          hint={copy("Needs admin help", "Нужна помощь админа", "דורש טיפול מנהל")}
          barColor="red"
          emphasis={stats.blocked > 0 ? "problem" : "default"}
        />{" "}
        <DimaxKpiCard
          label={copy("Visible", "Видно", "גלויות")}
          value={<LtrText>{formatLocaleNumber(stats.visible, locale)}</LtrText>}
          hint={copy("After filters", "После фильтров", "אחרי מסננים")}
          barColor="yellow"
        />{" "}
        <DimaxKpiCard
          label={copy("Projects", "Проекты", "פרויקטים")}
          value={<LtrText>{formatLocaleNumber(stats.projects, locale)}</LtrText>}
          hint={copy("Linked sites", "Связанные объекты", "אתרים מקושרים")}
          barColor="orange"
        />{" "}
      </div>{" "}
      <WidgetCard
        title={copy("Filters", "Фильтры", "מסננים")}
        headerMeta={copy(
          "Project, status and issue search",
          "Проект, статус и поиск проблемы",
          "פרויקט, סטטוס וחיפוש בעיה",
        )}
      >
        {" "}
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_1.2fr_auto]">
          {" "}
          <label className="field-stack">
            {" "}
            <span className="text-sm text-text-secondary">
              {copy("Project", "Проект", "פרויקט")}
            </span>{" "}
            <select
              aria-label={copy("Project", "Проект", "פרויקט")}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="control-input"
            >
              {" "}
              <option value="ALL">
                {copy("All projects", "Все проекты", "כל הפרויקטים")}
              </option>{" "}
              {projectOptions.map((projectId) => (
                <option key={projectId} value={projectId}>
                  {" "}
                  {projectId}{" "}
                </option>
              ))}{" "}
            </select>{" "}
          </label>{" "}
          <label className="field-stack">
            {" "}
            <span className="text-sm text-text-secondary">
              {copy("Status", "Статус", "סטטוס")}
            </span>{" "}
            <select
              aria-label={copy("Status", "Статус", "סטטוס")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="control-input"
            >
              {" "}
              <option value="ALL">
                {copy("All statuses", "Все статусы", "כל הסטטוסים")}
              </option>{" "}
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {" "}
                  {status}{" "}
                </option>
              ))}{" "}
            </select>{" "}
          </label>{" "}
          <label className="field-stack">
            {" "}
            <span className="text-sm text-text-secondary">
              {copy("Search", "Поиск", "חיפוש")}
            </span>{" "}
            <input
              aria-label={copy("Issue search", "Поиск проблемы", "חיפוש בעיה")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy(
                "Door, title, details, priority",
                "Дверь, заголовок, детали, приоритет",
                "דלת, כותרת, פרטים, עדיפות",
              )}
              className="control-input"
            />{" "}
          </label>{" "}
          <div className="flex items-end">
            {" "}
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={issuesSmallActionClass}
            >
              {" "}
              {copy("Reset filters", "Сбросить фильтры", "אפס מסננים")}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </WidgetCard>{" "}
      {issuesQuery.isError && (
        <div className={issuesNoticeClass()}>
          {" "}
          {readableApiError(
            issuesQuery.error,
            locale,
            copy(
              "Failed to load installer issues.",
              "Не удалось загрузить проблемы монтажника.",
              "לא ניתן לטעון את בעיות המתקין.",
            ),
          )}{" "}
        </div>
      )}{" "}
      {actionError && (
        <div className={issuesNoticeClass()}> {actionError} </div>
      )}{" "}
      {issuesQuery.isLoading && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          {" "}
          {copy(
            "Loading issues...",
            "Загружаем проблемы...",
            "טוען בעיות...",
          )}{" "}
        </div>
      )}{" "}
      {!issuesQuery.isLoading && issues.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          {" "}
          {copy(
            "No issues assigned right now.",
            "Сейчас нет назначенных проблем.",
            "כרגע אין בעיות משויכות.",
          )}{" "}
        </div>
      )}{" "}
      {!issuesQuery.isLoading &&
        issues.length > 0 &&
        filteredIssues.length === 0 && (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
            {" "}
            {copy(
              "No issues match current filters.",
              "Нет проблем под текущие фильтры.",
              "אין בעיות שמתאימות למסננים הנוכחיים.",
            )}{" "}
          </div>
        )}{" "}
      {!issuesQuery.isLoading && filteredIssues.length > 0 && (
        <WidgetCard
          title={copy("Issue list", "Список проблем", "רשימת בעיות")}
          headerMeta={copy(
            "Only assigned installer issues are shown here",
            "Здесь показаны только назначенные монтажнику проблемы",
            "מוצגות כאן רק בעיות שהוקצו למתקין",
          )}
        >
          <div className="space-y-3">
          {" "}
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={cn(
                "space-y-3 rounded-lg border border-border bg-surface p-4",
                focusedIssueId === issue.id &&
                  "border-accent bg-surface-subtle",
              )}
            >
              {" "}
              <div className="flex flex-wrap items-start justify-between gap-3">
                {" "}
                <div>
                  {" "}
                  <div className="text-base font-semibold text-text">
                    {" "}
                    {issue.title || copy("Issue", "Проблема", "בעיה")}{" "}
                  </div>{" "}
                  <div className="mt-1 text-xs text-text-secondary">
                    {" "}
                    {issue.project_id ||
                      copy("No project", "Без проекта", "ללא פרויקט")}{" "}
                    {issue.door_id ? ` • ${issue.door_id}` : ""}{" "}
                    {issue.priority ? ` • ${issue.priority}` : ""}{" "}
                  </div>{" "}
                </div>{" "}
                <span className={issueStatusClass(issue.status)}>
                  {" "}
                  {issue.status}{" "}
                </span>{" "}
              </div>{" "}
              <div className="text-sm text-text-secondary">
                {" "}
                {issue.description ||
                  issue.details ||
                  copy(
                    "No details yet.",
                    "Пока нет деталей.",
                    "עדיין אין פרטים.",
                  )}{" "}
              </div>{" "}
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                {" "}
                <label className="field-stack">
                  {" "}
                  <span className="text-xs text-text-secondary">
                    {copy("Field note", "Заметка с объекта", "הערת שטח")}
                  </span>{" "}
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
                      "הוסף הערה קצרה למנהל ולהמשך טיפול במשרד.",
                    )}
                  />{" "}
                </label>{" "}
                <div className="flex flex-col justify-between gap-2">
                  {" "}
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
                    {" "}
                    {copy("Media", "Медиа", "מדיה")}:{" "}
                    <LtrText className="font-medium text-text">
                      {" "}
                      {formatLocaleNumber(issue.media_count ?? 0, locale)}{" "}
                    </LtrText>{" "}
                  </div>{" "}
                  <button
                    type="button"
                    disabled={updateIssueMutation.isPending}
                    onClick={() =>
                      updateIssueMutation.mutate({
                        issueId: issue.id,
                        comment: draftComments[issue.id] ?? issue.comment ?? "",
                      })
                    }
                    className={issuesPrimaryActionClass}
                  >
                    {" "}
                    <Save aria-hidden="true" className="h-4 w-4" />{" "}
                    {updateIssueMutation.isPending
                      ? copy("Saving...", "Сохраняем...", "שומר...")
                      : copy(
                          "Save note",
                          "Сохранить заметку",
                          "שמור הערה",
                        )}{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
              <IssueMediaPanel
                issueId={issue.id}
                mediaCount={issue.media_count ?? 0}
                locale={locale}
                copy={copy}
              />{" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                {issue.project_id && (
                  <>
                    {" "}
                    <Link
                      href={`/installer/projects/${issue.project_id}`}
                      className={issuesSmallActionClass}
                    >
                      {" "}
                      <FolderOpen aria-hidden="true" className="h-4 w-4" />{" "}
                      {copy(
                        "Open project",
                        "Открыть проект",
                        "פתח פרויקט",
                      )}{" "}
                    </Link>{" "}
                    <Link
                      href={`/installer/calendar?project_id=${issue.project_id}`}
                      className={issuesSmallActionClass}
                    >
                      {" "}
                      <CalendarDays
                        aria-hidden="true"
                        className="h-4 w-4"
                      />{" "}
                      {copy(
                        "Open calendar",
                        "Открыть календарь",
                        "פתח יומן",
                      )}{" "}
                    </Link>{" "}
                    <Link
                      href={`/installer/earnings?project_id=${issue.project_id}`}
                      className={issuesSmallActionClass}
                    >
                      {" "}
                      <WalletCards
                        aria-hidden="true"
                        className="h-4 w-4"
                      />{" "}
                      {copy(
                        "Open earnings",
                        "Открыть заработок",
                        "פתח רווחים",
                      )}{" "}
                    </Link>{" "}
                  </>
                )}{" "}
              </div>{" "}
            </div>
          ))}{" "}
          </div>
        </WidgetCard>
      )}{" "}
    </div>
  );
}
