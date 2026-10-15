import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppWindow, ArrowLeft, CheckCircle2, Eye, FileDown, RefreshCw, Save } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { apiDownload, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n } from "@/lib/i18n";

type JournalSnapshot = {
  journal: {
    id: string; project_id: string; status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    title: string | null; notes: string | null; snapshot_version: number;
    pdf_locale?: "en" | "ru" | "he";
    lock_header: boolean; lock_table: boolean; lock_footer: boolean;
    signed_at: string | null; signer_name: string | null;
  };
  project: {
    name: string; address: string | null;
    developer_company: string | null; contact_name: string | null;
  };
  items: {
    unit_label: string; door_type_id: string;
    door_type_name: string; installed_at: string | null;
  }[];
  addon_items: {
    name: string; quantity: string; unit: string;
    done_at: string; comment: string | null;
  }[];
  signing_url: string | null;
};

type Draft = Pick<JournalSnapshot["journal"], "lock_header" | "lock_table" | "lock_footer"> & {
  title: string; notes: string;
  pdf_locale: "en" | "ru" | "he";
};

function draftFrom({ journal }: JournalSnapshot): Draft {
  return {
    title: journal.title ?? "", notes: journal.notes ?? "",
    pdf_locale: journal.pdf_locale ?? "en",
    lock_header: journal.lock_header, lock_table: journal.lock_table,
    lock_footer: journal.lock_footer,
  };
}

export default function JournalFormPage() {
  const params = useParams<{ id: string }>();
  return (
    <DashboardLayout>
      <JournalEditor key={params?.id ?? ""} id={params?.id ?? ""} />
    </DashboardLayout>
  );
}

function JournalEditor({ id }: { id: string }) {
  const router = useRouter();
  const canManage = canRunPrivilegedAdminActions(useAuthSession());
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  const [model, setModel] = useState<JournalSnapshot | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<"saved" | "ready" | "refreshed" | null>(null);
  const [documentView, setDocumentView] = useState(true);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [destination, setDestination] = useState("/journal");
  const actionRef = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  const endpoint = `/api/v1/admin/journals/${encodeURIComponent(id)}`;

  const acceptModel = useCallback((next: JournalSnapshot) => {
    setModel(next);
    setDraft(draftFrom(next));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    setLoading(true);
    setError(null);
    if (!id) {
      setLoading(false);
      return () => controller.abort();
    }
    apiFetch<JournalSnapshot>(`${endpoint}/snapshot`, { signal: controller.signal })
      .then((next) => { if (!controller.signal.aborted) acceptModel(next); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [acceptModel, endpoint, id, retry]);

  const dirty = Boolean(model && draft && JSON.stringify(draft) !== JSON.stringify(draftFrom(model)));
  const editable = canManage && model?.journal.status === "DRAFT" && !model.journal.signed_at;
  const blocked = loading || Boolean(busy) || !model;

  useEffect(() => {
    if (!dirty && !busy) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    const preventNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin || target.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      if (!busy) {
        setDestination(target.pathname + target.search + target.hash);
        setDiscardOpen(true);
      }
    };
    document.addEventListener("click", preventNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", preventUnload);
      document.removeEventListener("click", preventNavigation, true);
    };
  }, [dirty, busy]);

  const runAction = async (name: string, action: (signal: AbortSignal) => Promise<void>) => {
    const controller = lifetime.current;
    if (blocked || actionRef.current || !controller || controller.signal.aborted) return;
    actionRef.current = true;
    setBusy(name);
    setError(null);
    setNotice(null);
    try {
      await action(controller.signal);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason);
    } finally {
      if (!controller.signal.aborted) {
        actionRef.current = false;
        setBusy("");
      }
    }
  };

  const reloadModel = async (signal: AbortSignal) => {
    const next = await apiFetch<JournalSnapshot>(`${endpoint}/snapshot`, { signal });
    if (!signal.aborted) acceptModel(next);
  };

  const save = () => {
    if (!editable || !draft || !model || !dirty) return;
    void runAction("save", async (signal) => {
      await apiFetch(endpoint, {
        method: "PATCH", signal,
        body: JSON.stringify({
          ...(!model.journal.lock_header ? { title: draft.title, pdf_locale: draft.pdf_locale } : {}),
          ...(!model.journal.lock_footer ? { notes: draft.notes } : {}),
          lock_header: draft.lock_header,
          lock_table: draft.lock_table,
          lock_footer: draft.lock_footer,
        }),
      });
      await reloadModel(signal);
      if (!signal.aborted) setNotice("saved");
    });
  };

  const transition = (action: "mark-ready" | "refresh-snapshot") => {
    if (!editable || dirty || (action === "refresh-snapshot" && draft?.lock_table)) return;
    void runAction(action, async (signal) => {
      await apiFetch(`${endpoint}/${action}`, { method: "POST", signal });
      // Preserve the successful transition even if the follow-up read fails.
      if (action === "mark-ready" && !signal.aborted) {
        setModel((current) => current && {
          ...current, journal: { ...current.journal, status: "ACTIVE" },
        });
      }
      await reloadModel(signal);
      if (!signal.aborted) setNotice(action === "mark-ready" ? "ready" : "refreshed");
    });
  };

  const download = () => {
    if (dirty) return;
    void runAction("pdf", async (signal) => {
      const response = await apiDownload(`${endpoint}/pdf`, { signal });
      const blob = await response.blob();
      if (signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `journal_${id}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  const goBack = () => {
    if (busy) return;
    if (dirty) {
      setDestination("/journal");
      setDiscardOpen(true);
    }
    else router.push("/journal");
  };
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(
    locale === "ru" ? "ru-RU" : locale === "he" ? "he-IL" : "en-GB",
    { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" },
  ).format(new Date(value)) : "-";

  return (
    <div className="page-shell page-stack-tight">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={goBack} disabled={Boolean(busy)}
            aria-label={copy("Back to journal", "Назад к журналу", "חזרה ליומן")}
            className="dmx-secondary-action h-9 w-9 shrink-0 p-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="dmx-page-title">{copy("Project handoff", "Сдача выполненных работ", "מסירת עבודות")}</h1>
            <p className="break-all text-xs text-text-secondary">
              {id || copy("Journal not selected", "Журнал не выбран", "לא נבחר יומן")}
            </p>
          </div>
        </div>
        {model && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={save} disabled={blocked || !editable || !dirty} className="dmx-secondary-action h-9">
              <Save className="h-4 w-4" />{copy("Save draft", "Сохранить черновик", "שמור טיוטה")}
            </button>
            <button type="button" onClick={() => transition("mark-ready")} disabled={blocked || !editable || dirty} className="dmx-primary-action h-9">
              <CheckCircle2 className="h-4 w-4" />{copy("Mark ready", "Подготовить к подписи", "הכן לחתימה")}
            </button>
            <button type="button" onClick={download} disabled={blocked || dirty} className="dmx-secondary-action h-9">
              <FileDown className="h-4 w-4" />{copy("Export PDF", "Скачать PDF", "הורד PDF")}
            </button>
          </div>
        )}
      </header>
      {Boolean(error) && (
        <div role="alert" className="rounded-lg border border-status-problem-border bg-status-problem-bg p-3 text-sm text-status-problem-fg">
          {readableApiError(error, locale, copy("Journal request failed", "Не удалось выполнить запрос журнала", "הבקשה ליומן נכשלה"))}
          {!dirty && (
            <button type="button" onClick={() => setRetry((v) => v + 1)} disabled={loading} className="dmx-secondary-action ms-3 h-9">
              {copy("Retry", "Повторить", "נסה שוב")}
            </button>
          )}
        </div>
      )}
      {loading && <p role="status">{copy("Loading journal...", "Загрузка журнала...", "טוען יומן...")}</p>}
      {busy && <p role="status">{copy("Processing...", "Выполняется...", "מעבד...")}</p>}
      {notice && (
        <p role="status" className="text-sm text-status-ok-fg">
          {notice === "saved" ? copy("Draft saved", "Черновик сохранён", "הטיוטה נשמרה")
            : notice === "ready" ? copy("Journal ready for signing", "Журнал подготовлен к подписи", "היומן מוכן לחתימה")
              : copy("Work snapshot refreshed", "Список выполненных работ обновлён", "רשימת העבודות עודכנה")}
        </p>
      )}
      {model && draft && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 text-sm">
              <span>{model.journal.signed_at ? copy("Signed", "Подписан", "חתום")
                : model.journal.status === "DRAFT" ? copy("Draft", "Черновик", "טיוטה")
                  : copy("Ready for signing", "Готов к подписи", "מוכן לחתימה")}</span>
              <span className="text-text-secondary">{copy("Version", "Версия", "גרסה")} {model.journal.snapshot_version}</span>
              {dirty && <span role="status" className="text-status-warning-fg">{copy("Unsaved changes", "Есть несохранённые изменения", "שינויים שלא נשמרו")}</span>}
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <button type="button" aria-pressed={documentView} onClick={() => setDocumentView(true)}
                className={`flex h-8 items-center gap-1 px-2 text-xs ${documentView ? "bg-accent text-accent-foreground" : "text-text-secondary"}`}>
                <Eye className="h-4 w-4" />{copy("Document", "Документ", "מסמך")}
              </button>
              <button type="button" aria-pressed={!documentView} onClick={() => setDocumentView(false)}
                className={`flex h-8 items-center gap-1 px-2 text-xs ${!documentView ? "bg-accent text-accent-foreground" : "text-text-secondary"}`}>
                <AppWindow className="h-4 w-4" />{copy("App", "Приложение", "אפליקציה")}
              </button>
            </div>
          </div>
          <article className={`mx-auto w-full border border-border bg-surface ${documentView ? "max-w-[900px]" : "max-w-none"}`}>
            <section className="space-y-4 border-b border-border p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong className="text-sm">DIMAX Operations</strong>
                <span className="text-xs text-text-secondary">
                  {copy("Completed works", "Выполненные работы", "עבודות שהושלמו")}: {model.items.length + model.addon_items.length}
                </span>
              </div>
              <label className="field-stack">
                <span className="field-label">{copy("Title", "Название", "כותרת")}</span>
                <input maxLength={200} className="control-input" value={draft.title}
                  disabled={blocked || !editable || model.journal.lock_header || draft.lock_header}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="field-stack max-w-64">
                    <span className="field-label">{copy("PDF language", "Язык PDF", "שפת המסמך")}</span>
                    <select className="control-input" value={draft.pdf_locale}
                      disabled={blocked || !editable || model.journal.lock_header || draft.lock_header}
                      onChange={(event) => setDraft({ ...draft, pdf_locale: event.target.value as Draft["pdf_locale"] })}>
                      <option value="en">English</option>
                      <option value="ru">Русский</option>
                      <option value="he">עברית</option>
                    </select>
                  </label>
                </div>
                {[
                  [copy("Project", "Объект", "פרויקט"), model.project.name],
                  [copy("Address", "Адрес", "כתובת"), model.project.address],
                  [copy("Developer", "Застройщик", "יזם"), model.project.developer_company],
                  [copy("Contact", "Контакт", "איש קשר"), model.project.contact_name],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-text-secondary">{label}</dt>
                    <dd className="break-words">{value || "-"}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="space-y-3 border-b border-border p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">{copy("Installed doors", "Установленные двери", "דלתות שהותקנו")} ({model.items.length})</h2>
                <button type="button" onClick={() => transition("refresh-snapshot")}
                  disabled={blocked || !editable || dirty || draft.lock_table} className="dmx-secondary-action h-9">
                  <RefreshCw className="h-4 w-4" />{copy("Refresh works", "Обновить работы", "עדכן עבודות")}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] text-start text-sm">
                  <thead><tr className="border-b border-border text-xs text-text-secondary">
                    {[copy("Door / position", "Дверь / позиция", "דלת / מיקום"),
                      copy("Type", "Тип", "סוג"), copy("Installed", "Установлена", "הותקנה")].map((label) => (
                      <th key={label} className="p-2 text-start font-medium">{label}</th>
                    ))}
                  </tr></thead>
                  <tbody>{model.items.map((item, index) => (
                    <tr key={`${item.unit_label}:${index}`} className="border-b border-border">
                      <td className="break-words p-2">{item.unit_label}</td>
                      <td className="p-2">{item.door_type_name}</td>
                      <td className="p-2">{date(item.installed_at)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {!model.items.length && <p className="text-sm text-text-secondary">{copy("No installed doors in this snapshot", "В этом снимке нет установленных дверей", "אין דלתות מותקנות בתצלום זה")}</p>}
              <h2 className="pt-3 text-sm font-semibold">{copy("Additional works", "Дополнительные работы", "עבודות נוספות")} ({model.addon_items.length})</h2>
              {model.addon_items.map((item, index) => (
                <div key={index} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm">
                  <div>
                    <span>{item.name} · {item.quantity} {item.unit}</span>
                    {item.comment && <p className="break-words text-text-secondary">{item.comment}</p>}
                  </div>
                  <span className="text-text-secondary">{date(item.done_at)}</span>
                </div>
              ))}
            </section>
            <section className="space-y-4 p-4 sm:p-6">
              <label className="field-stack">
                <span className="field-label">{copy("Notes", "Примечания", "הערות")}</span>
                <textarea className="control-textarea" rows={4} maxLength={5000} value={draft.notes}
                  disabled={blocked || !editable || model.journal.lock_footer || draft.lock_footer}
                  onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
              </label>
              <div className="flex flex-wrap gap-4 text-xs">
                {([
                  ["lock_header", copy("Lock header", "Зафиксировать шапку", "נעל כותרת")],
                  ["lock_table", copy("Lock works", "Зафиксировать работы", "נעל עבודות")],
                  ["lock_footer", copy("Lock notes", "Зафиксировать примечания", "נעל הערות")],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={draft[key]} disabled={blocked || !editable}
                      onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
              {model.journal.signed_at && (
                <p className="text-sm">{copy("Signed by", "Подписал", "נחתם על ידי")}: {model.journal.signer_name} · {date(model.journal.signed_at)}</p>
              )}
              {model.signing_url && (
                <a href={model.signing_url} target="_blank" rel="noopener noreferrer" className="dmx-secondary-action h-9">
                  {copy("Open signing page", "Открыть страницу подписи", "פתח דף חתימה")}
                </a>
              )}
            </section>
          </article>
        </>
      )}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy("Discard changes?", "Отменить изменения?", "לבטל שינויים?")}</AlertDialogTitle>
            <AlertDialogDescription>{copy("The unsaved changes will be lost.", "Несохранённые изменения будут потеряны.", "השינויים שלא נשמרו יאבדו.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy("Keep editing", "Продолжить редактирование", "המשך עריכה")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(destination)}>{copy("Discard and leave", "Отменить и выйти", "בטל וצא")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
