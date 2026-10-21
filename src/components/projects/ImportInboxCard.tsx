"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, RefreshCw, Upload } from "lucide-react";
import { WidgetCard } from "@/components/dimax";
import { formatDateTime } from "@/components/projects/shared";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useCopy, useI18n } from "@/lib/i18n";

import { useImportCopy } from "./import-copy";

/** Document import inbox (backend 0083): factory files arrive by upload, watched folder or mailbox,
 * the server matches the project and imports clean files by itself; the office decides the rest here. */

export type ImportInboxSummary = {
  mode?: string | null;
  parsed_rows: number;
  prepared_rows: number;
  would_import?: number;
  would_skip?: number;
  imported?: number;
  skipped?: number;
  errors: number;
  first_errors?: Array<{ row: number | null; message: string }>;
  missing_required_fields?: string[];
  mapping_profile?: string | null;
};

export type ImportInboxItem = {
  id: string;
  source: "UPLOAD" | "FOLDER" | "EMAIL";
  source_ref?: string | null;
  filename: string;
  status: "NEW" | "ANALYZED" | "NEEDS_PROJECT" | "IMPORTED" | "FAILED" | "DISMISSED";
  detected_profile?: string | null;
  order_numbers: string[];
  matched_project_id: string | null;
  matched_project_name?: string | null;
  match_reason?: "ORDER_NUMBER" | "PROJECT_CODE" | "PROJECT_NAME" | "MANUAL" | null;
  candidate_projects: Array<{ id: string; name: string | null }>;
  analysis: ImportInboxSummary | null;
  import_result: ImportInboxSummary | null;
  error: string | null;
  created_at: string;
  decided_at: string | null;
};

export type ImportInboxListResponse = { items: ImportInboxItem[]; auto_commit: boolean };

type ProjectOption = { id: string; name: string };

type ImportInboxCardProps = {
  canManage: boolean;
  isOwner: boolean;
};

const INBOX_PATH = "/api/v1/admin/projects/import-inbox";
const OPEN_STATUSES = new Set(["NEW", "ANALYZED", "NEEDS_PROJECT", "FAILED"]);

export function ImportInboxCard({ canManage, isOwner }: ImportInboxCardProps) {
  const { locale } = useI18n();
  const copy = useCopy();
  const { importProfileLabel } = useImportCopy();
  const [items, setItems] = useState<ImportInboxItem[]>([]);
  const [autoCommit, setAutoCommit] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDecided, setShowDecided] = useState(false);
  const [chosenProject, setChosenProject] = useState<Record<string, string>>({});

  const statusLabel = useCallback(
    (status: ImportInboxItem["status"]) => {
      switch (status) {
        case "IMPORTED":
          return copy("Imported", "Импортирован", "יובא");
        case "NEEDS_PROJECT":
          return copy("Choose project", "Нужен проект", "בחרו פרויקט");
        case "ANALYZED":
          return copy("Needs decision", "Нужно решение", "דרושה החלטה");
        case "FAILED":
          return copy("Failed", "Ошибка", "נכשל");
        case "DISMISSED":
          return copy("Dismissed", "Отклонён", "נדחה");
        default:
          return copy("New", "Новый", "חדש");
      }
    },
    [copy],
  );
  const sourceLabel = useCallback(
    (source: ImportInboxItem["source"]) =>
      source === "EMAIL"
        ? copy("mailbox", "почта", "דוא״ל")
        : source === "FOLDER"
          ? copy("folder", "папка", "תיקייה")
          : copy("upload", "загрузка", "העלאה"),
    [copy],
  );
  const reasonLabel = useCallback(
    (reason: ImportInboxItem["match_reason"]) => {
      switch (reason) {
        case "ORDER_NUMBER":
          return copy("by order number", "по номеру заказа", "לפי מספר הזמנה");
        case "PROJECT_CODE":
          return copy("by project code", "по коду проекта", "לפי קוד פרויקט");
        case "PROJECT_NAME":
          return copy("by project name", "по названию проекта", "לפי שם פרויקט");
        case "MANUAL":
          return copy("chosen manually", "выбран вручную", "נבחר ידנית");
        default:
          return "";
      }
    },
    [copy],
  );

  const load = useCallback(async () => {
    if (!canManage) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [inbox, list] = await Promise.all([
        apiFetch<ImportInboxListResponse>(`${INBOX_PATH}?limit=100`),
        apiFetch<{ items: ProjectOption[] }>("/api/v1/admin/projects?limit=200"),
      ]);
      setItems(inbox?.items ?? []);
      setAutoCommit(typeof inbox?.auto_commit === "boolean" ? inbox.auto_commit : null);
      setProjects((list?.items ?? []).map((p) => ({ id: p.id, name: p.name })));
    } catch (e) {
      setError(readableApiError(e, locale, copy("Could not load the import inbox", "Не удалось загрузить входящие документы", "לא ניתן לטעון את תיבת הייבוא")));
    } finally {
      setLoading(false);
    }
  }, [canManage, copy, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => items.filter((item) => showDecided || OPEN_STATUSES.has(item.status)),
    [items, showDecided],
  );
  const openCount = useMemo(() => items.filter((item) => OPEN_STATUSES.has(item.status)).length, [items]);

  const replaceItem = (next: ImportInboxItem) =>
    setItems((prev) => (prev.some((x) => x.id === next.id) ? prev.map((x) => (x.id === next.id ? next : x)) : [next, ...prev]));

  const upload = async (file: File) => {
    setBusy("upload");
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const item = await apiFetch<ImportInboxItem>(INBOX_PATH, { method: "POST", body });
      replaceItem(item);
      setNotice(
        item.status === "IMPORTED"
          ? copy("Imported automatically", "Импортировано автоматически", "יובא אוטומטית")
          : copy("Received; see the decision below", "Получено; решение ниже", "התקבל; ההחלטה למטה"),
      );
    } catch (e) {
      setError(readableApiError(e, locale, copy("Upload failed", "Загрузка не удалась", "ההעלאה נכשלה")));
    } finally {
      setBusy("");
    }
  };

  const commit = async (item: ImportInboxItem, allowPartial: boolean) => {
    const projectId = item.matched_project_id ?? chosenProject[item.id] ?? "";
    if (!projectId) {
      setError(copy("Choose the project first", "Сначала выберите проект", "בחרו פרויקט תחילה"));
      return;
    }
    setBusy(item.id);
    setError(null);
    setNotice(null);
    try {
      const next = await apiFetch<ImportInboxItem>(`${INBOX_PATH}/${item.id}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: item.matched_project_id ? null : projectId,
          allow_partial_import: allowPartial,
        }),
      });
      replaceItem(next);
      if (next.status !== "IMPORTED") {
        setNotice(next.error ?? copy("The file was not imported", "Файл не импортирован", "הקובץ לא יובא"));
      }
    } catch (e) {
      setError(readableApiError(e, locale, copy("Import failed", "Импорт не удался", "הייבוא נכשל")));
    } finally {
      setBusy("");
    }
  };

  const dismiss = async (item: ImportInboxItem) => {
    setBusy(item.id);
    setError(null);
    try {
      replaceItem(await apiFetch<ImportInboxItem>(`${INBOX_PATH}/${item.id}/dismiss`, { method: "POST" }));
    } catch (e) {
      setError(readableApiError(e, locale, copy("Could not dismiss", "Не удалось отклонить", "לא ניתן לדחות")));
    } finally {
      setBusy("");
    }
  };

  const togglePolicy = async (enabled: boolean) => {
    setBusy("policy");
    setError(null);
    try {
      const next = await apiFetch<{ auto_commit: boolean }>(`${INBOX_PATH}/policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_commit: enabled }),
      });
      setAutoCommit(next.auto_commit);
    } catch (e) {
      setError(readableApiError(e, locale, copy("Could not change the policy", "Не удалось изменить политику", "לא ניתן לשנות את המדיניות")));
    } finally {
      setBusy("");
    }
  };

  if (!canManage) {
    return null;
  }

  const summaryLine = (summary: ImportInboxSummary | null) => {
    if (!summary) {
      return null;
    }
    const parts = [
      `${copy("rows", "строк", "שורות")}: ${summary.prepared_rows}`,
      typeof summary.imported === "number" && summary.mode === "import"
        ? `${copy("imported", "импортировано", "יובאו")}: ${summary.imported}`
        : `${copy("to import", "к импорту", "לייבוא")}: ${summary.would_import ?? 0}`,
      `${copy("skipped", "пропущено", "דולגו")}: ${summary.mode === "import" ? summary.skipped ?? 0 : summary.would_skip ?? 0}`,
      `${copy("errors", "ошибок", "שגיאות")}: ${summary.errors}`,
    ];
    if (summary.missing_required_fields?.length) {
      parts.push(`${copy("missing columns", "нет колонок", "חסרות עמודות")}: ${summary.missing_required_fields.join(", ")}`);
    }
    return parts.join(" · ");
  };

  return (
    <WidgetCard
      data-testid="import-inbox-card"
      title={copy("Document inbox", "Входящие документы", "מסמכים נכנסים")}
      headerMeta={copy(
        "Factory files are matched to projects and imported automatically when clean; only the rest needs a decision.",
        "Заводские файлы сопоставляются с проектами и импортируются автоматически, если чистые; решение нужно только по остальным.",
        "קובצי מפעל משויכים לפרויקטים ומיובאים אוטומטית כשהם תקינים; רק השאר דורש החלטה.",
      )}
      titleAccessory={
        <span className="inline-flex items-center gap-1.5">
          <Inbox className="h-4 w-4 text-text-secondary" aria-hidden="true" />
          {openCount > 0 ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-11 font-medium text-accent-foreground">{openCount}</span>
          ) : null}
        </span>
      }
      actionSlot={
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex h-8 cursor-pointer items-center rounded-full border border-dashed border-border bg-surface px-3 text-12 text-text-secondary transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-accent/35">
            <Upload className="me-2 h-4 w-4 shrink-0" aria-hidden="true" />
            {busy === "upload" ? copy("Uploading…", "Загрузка…", "מעלה…") : copy("Add document", "Добавить документ", "הוספת מסמך")}
            <input
              type="file"
              className="sr-only"
              disabled={busy === "upload"}
              aria-label={copy("Add document to the inbox", "Добавить документ во входящие", "הוספת מסמך לתיבה")}
              accept=".csv,.txt,.tsv,.json,.xml,.xlsx,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  void upload(file);
                }
              }}
            />
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {copy("Refresh", "Обновить", "רענון")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 px-4 py-3 text-13">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-12 text-text-secondary">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              checked={autoCommit === true}
              disabled={!isOwner || autoCommit === null || busy === "policy"}
              onChange={(event) => void togglePolicy(event.target.checked)}
            />
            {copy("Import clean files automatically", "Импортировать чистые файлы автоматически", "ייבוא אוטומטי של קבצים תקינים")}
            {!isOwner ? <span>({copy("owner only", "только владелец", "בעלים בלבד")})</span> : null}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={showDecided} onChange={(event) => setShowDecided(event.target.checked)} />
            {copy("Show decided", "Показать решённые", "הצגת מסמכים שהוחלטו")}
          </label>
        </div>
        {error ? <p className="text-12 text-danger">{error}</p> : null}
        {notice ? <p className="text-12 text-text-secondary">{notice}</p> : null}
        {visible.length === 0 ? (
          <p className="text-12 text-text-secondary">
            {loading
              ? copy("Loading…", "Загрузка…", "טוען…")
              : copy("No documents waiting. Drop a file here, into the watched folder or send it to the factory mailbox.", "Документов в ожидании нет. Добавьте файл здесь, положите в отслеживаемую папку или отправьте на почту для завода.", "אין מסמכים ממתינים. הוסיפו קובץ כאן, לתיקייה המנוטרת או לתיבת הדוא״ל של המפעל.")}
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {visible.map((item) => {
              const summary = item.import_result ?? item.analysis;
              const needsProject = !item.matched_project_id;
              const isBusy = busy === item.id;
              const open = OPEN_STATUSES.has(item.status);
              const options = item.candidate_projects.length
                ? [
                    ...item.candidate_projects.map((candidate) => ({ id: candidate.id, name: candidate.name ?? candidate.id })),
                    ...projects.filter((project) => !item.candidate_projects.some((candidate) => candidate.id === project.id)),
                  ]
                : projects;
              return (
                <li key={item.id} data-testid="import-inbox-item" className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text" dir="auto">{item.filename}</span>
                    <StatusBadge status={item.status} label={statusLabel(item.status)} />
                    <span className="text-11 text-text-secondary">
                      {sourceLabel(item.source)} · {formatDateTime(item.created_at)}
                      {item.detected_profile ? ` · ${importProfileLabel(item.detected_profile)}` : ""}
                    </span>
                  </div>
                  <div className="text-12 text-text-secondary">
                    {item.matched_project_id ? (
                      <span>
                        {copy("Project", "Проект", "פרויקט")}: <b className="font-medium text-text">{item.matched_project_name ?? item.matched_project_id}</b>
                        {item.match_reason ? ` (${reasonLabel(item.match_reason)})` : ""}
                      </span>
                    ) : (
                      <span>
                        {copy("Project not recognised", "Проект не распознан", "הפרויקט לא זוהה")}
                        {item.order_numbers.length ? ` · ${copy("orders", "заказы", "הזמנות")}: ${item.order_numbers.slice(0, 5).join(", ")}` : ""}
                      </span>
                    )}
                    {summary ? <div>{summaryLine(summary)}</div> : null}
                    {summary?.first_errors?.length ? (
                      <ul className="list-disc ps-5">
                        {summary.first_errors.slice(0, 3).map((row, index) => (
                          <li key={index}>{row.row != null ? `${copy("row", "строка", "שורה")} ${row.row}: ` : ""}{row.message}</li>
                        ))}
                      </ul>
                    ) : null}
                    {item.error ? <div className="text-danger" dir="auto">{item.error}</div> : null}
                  </div>
                  {open ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {needsProject ? (
                        <select
                          aria-label={copy("Project for this document", "Проект для документа", "פרויקט למסמך")}
                          className="h-8 rounded-md border border-border bg-surface px-2 text-12"
                          value={chosenProject[item.id] ?? ""}
                          disabled={isBusy}
                          onChange={(event) => setChosenProject((prev) => ({ ...prev, [item.id]: event.target.value }))}
                        >
                          <option value="">{copy("Choose project…", "Выберите проект…", "בחרו פרויקט…")}</option>
                          {options.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                      ) : null}
                      {item.status !== "FAILED" || item.analysis ? (
                        <Button type="button" size="sm" disabled={isBusy} onClick={() => void commit(item, false)}>
                          {copy("Import", "Импортировать", "ייבוא")}
                        </Button>
                      ) : null}
                      {summary && summary.errors > 0 ? (
                        <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => void commit(item, true)}>
                          {copy("Import valid rows only", "Импортировать только верные строки", "ייבוא שורות תקינות בלבד")}
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={() => void dismiss(item)}>
                        {copy("Dismiss", "Отклонить", "דחייה")}
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </WidgetCard>
  );
}
