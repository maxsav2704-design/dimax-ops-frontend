"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, UserPlus, Users } from "lucide-react";
import { ConfirmActionDialog, InlineNotice, WidgetCard } from "@/components/dimax";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useCopy, useI18n } from "@/lib/i18n";

type Scope = "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER";
export type CompanyUser = {
  id: string; full_name: string; email: string; role: "ADMIN" | "INSTALLER"; is_active: boolean;
  admin_scope: Scope | null; can_view_rates: boolean; can_manage_imports: boolean; can_manage_users: boolean;
  installer_id: string | null; installer_name: string | null; created_at: string;
};
type InstallerOption = { id: string; full_name: string; user_id: string | null; is_active?: boolean };
type Pending = { kind: "toggle" | "reset"; user: CompanyUser } | null;
type OneTime = { name: string; email: string; password: string } | null;

const USERS = "/api/v1/admin/users";
const SCOPES: Scope[] = ["OWNER", "OPERATIONS", "FINANCE", "VIEWER"];

/** The owner manages the company's accounts. A new or reset password is shown once, here, and never again. */
export function CompanyUsersCard() {
  const { locale } = useI18n();
  const copy = useCopy();
  const client = useQueryClient();
  // Your own row is marked and its actions are off: your account is changed by another owner.
  const me = useQuery({ queryKey: ["company-users", "me"], queryFn: () => apiFetch<{ id: string }>("/api/v1/auth/me") });
  const currentUserId = me.data?.id;
  const users = useQuery({ queryKey: ["company-users"], queryFn: () => apiFetch<{ items: CompanyUser[] }>(USERS) });
  const installers = useQuery({
    queryKey: ["company-users", "installers"],
    queryFn: () => apiFetch<{ items: InstallerOption[] }>("/api/v1/admin/installers?limit=200"),
  });
  const [form, setForm] = useState({ full_name: "", email: "", role: "ADMIN" as "ADMIN" | "INSTALLER", admin_scope: "VIEWER" as Scope, installer_id: "" });
  const [pending, setPending] = useState<Pending>(null);
  const [oneTime, setOneTime] = useState<OneTime>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const scopeLabel = (scope: Scope | null) => scope === "OWNER" ? copy("Owner", "Владелец", "בעלים")
    : scope === "OPERATIONS" ? copy("Operations", "Операции", "תפעול")
      : scope === "FINANCE" ? copy("Finance", "Финансы", "כספים")
        : scope === "VIEWER" ? copy("Viewer", "Просмотр", "צפייה") : copy("Installer", "Монтажник", "מתקין");
  const refresh = () => client.invalidateQueries({ queryKey: ["company-users"] });
  const fail = (error: unknown, fallback: string) => setNotice({ tone: "error", message: readableApiError(error, locale, fallback) });
  const reveal = (user: CompanyUser, password: string) => { setCopied(false); setOneTime({ name: user.full_name, email: user.email, password }); };

  const create = useMutation({
    mutationFn: () => apiFetch<{ user: CompanyUser; temporary_password: string }>(USERS, {
      method: "POST",
      body: JSON.stringify({
        full_name: form.full_name.trim(), email: form.email.trim(), role: form.role,
        ...(form.role === "ADMIN" ? { admin_scope: form.admin_scope } : {}),
        ...(form.role === "INSTALLER" && form.installer_id ? { installer_id: form.installer_id } : {}),
      }),
    }),
    onSuccess: async (result) => {
      reveal(result.user, result.temporary_password);
      setNotice(null);
      setForm({ full_name: "", email: "", role: "ADMIN", admin_scope: "VIEWER", installer_id: "" });
      await refresh();
    },
    onError: (error) => fail(error, copy("The account was not created.", "Учётная запись не создана.", "החשבון לא נוצר.")),
  });
  const change = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      apiFetch<CompanyUser>(`${USERS}/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: async (user) => {
      setNotice({ tone: "success", message: `${copy("Saved", "Сохранено", "נשמר")}: ${user.full_name}` });
      await refresh();
    },
    onError: (error) => fail(error, copy("The change was not saved.", "Изменение не сохранено.", "השינוי לא נשמר.")),
  });
  const reset = useMutation({
    mutationFn: (user: CompanyUser) => apiFetch<{ temporary_password: string }>(`${USERS}/${user.id}/reset-password`, { method: "POST" }),
    onSuccess: (result, user) => { reveal(user, result.temporary_password); setNotice(null); },
    onError: (error) => fail(error, copy("The password was not reset.", "Пароль не сброшен.", "הסיסמה לא אופסה.")),
  });

  const freeInstallers = (installers.data?.items || []).filter((row) => !row.user_id && row.is_active !== false);
  const canCreate = form.full_name.trim().length >= 2 && /.+@.+\..+/.test(form.email.trim()) && !create.isPending;

  return (
    <WidgetCard
      title={copy("Company users", "Пользователи компании", "משתמשי החברה")}
      headerMeta={copy("Who signs in to the office and to the phone app, and with what access.",
        "Кто входит в офис и в приложение монтажника и с какими правами.",
        "מי נכנס למשרד ולאפליקציית המתקין ובאילו הרשאות.")}
      actionSlot={<Users className="h-4 w-4 text-text-secondary" />}
      className="xl:col-span-3"
    >
      <div className="space-y-4" data-testid="company-users">
        {notice && <InlineNotice tone={notice.tone}>{notice.message}</InlineNotice>}
        {oneTime && (
          <div data-testid="one-time-password" role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3">
            <p className="text-13 font-medium text-text">
              {copy(`Password for ${oneTime.name} (${oneTime.email})`, `Пароль для ${oneTime.name} (${oneTime.email})`, `סיסמה עבור ${oneTime.name} (${oneTime.email})`)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code dir="ltr" className="rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-16 tracking-wide text-text">{oneTime.password}</code>
              <button type="button" className="dmx-secondary-action h-9"
                onClick={() => { void navigator.clipboard?.writeText(oneTime.password).then(() => setCopied(true), () => setCopied(false)); }}>
                <Copy className="h-4 w-4" />{copied ? copy("Copied", "Скопировано", "הועתק") : copy("Copy", "Скопировать", "העתק")}
              </button>
              <button type="button" className="dmx-secondary-action h-9" onClick={() => setOneTime(null)}>
                {copy("Done", "Готово", "סיום")}
              </button>
            </div>
            <p className="mt-2 text-12 text-text-secondary">
              {copy("Shown once. Hand it over in person or by phone; they change it after signing in.",
                "Показываем один раз. Передайте лично или по телефону; после входа его меняют на свой.",
                "מוצגת פעם אחת. מסרו אותה באופן אישי או בטלפון; לאחר הכניסה מחליפים אותה.")}
            </p>
          </div>
        )}

        {users.isPending && <p role="status" className="text-13 text-text-secondary">{copy("Loading…", "Загрузка…", "טוען…")}</p>}
        {users.isError && <InlineNotice tone="error">{readableApiError(users.error, locale, copy("Users did not load.", "Пользователи не загрузились.", "המשתמשים לא נטענו."))}</InlineNotice>}
        {users.data && (
          <ul className="divide-y divide-border-subtle rounded-lg border border-border">
            {users.data.items.map((user) => {
              const self = user.id === currentUserId;
              return (
                <li key={user.id} data-testid="company-user-row" className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-48 flex-1">
                    <div className={user.is_active ? "text-13 font-medium text-text" : "text-13 font-medium text-text-secondary line-through"}>
                      {user.full_name}{self ? ` · ${copy("you", "вы", "את/ה")}` : ""}
                    </div>
                    <div dir="ltr" className="text-12 text-text-secondary [unicode-bidi:plaintext]">{user.email}</div>
                    {user.installer_name && <div className="text-12 text-text-secondary">{copy("Installer card", "Карточка монтажника", "כרטיס מתקין")}: {user.installer_name}</div>}
                  </div>
                  {user.role === "ADMIN" ? (
                    <select aria-label={`${copy("Access", "Права", "הרשאה")}: ${user.full_name}`} value={user.admin_scope || "VIEWER"}
                      disabled={self || change.isPending}
                      onChange={(e) => change.mutate({ id: user.id, body: { admin_scope: e.target.value } })}
                      className="control-input h-9 w-40 disabled:cursor-not-allowed disabled:opacity-60">
                      {SCOPES.map((scope) => <option key={scope} value={scope}>{scopeLabel(scope)}</option>)}
                    </select>
                  ) : <span className="w-40 text-13 text-text-secondary">{scopeLabel(null)}</span>}
                  <span className={user.is_active ? "text-12 text-status-ok-fg" : "text-12 text-text-secondary"}>
                    {user.is_active ? copy("Active", "Активен", "פעיל") : copy("Switched off", "Отключён", "מושבת")}
                  </span>
                  <button type="button" className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-50" disabled={self}
                    onClick={() => setPending({ kind: "toggle", user })}>
                    {user.is_active ? copy("Switch off", "Отключить", "השבת") : copy("Switch on", "Включить", "הפעל")}
                  </button>
                  <button type="button" className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-50" disabled={self || !user.is_active}
                    onClick={() => setPending({ kind: "reset", user })}>
                    <KeyRound className="h-4 w-4" />{copy("New password", "Новый пароль", "סיסמה חדשה")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form className="grid gap-3 rounded-lg border border-border bg-surface-subtle p-3 md:grid-cols-5" aria-label={copy("Add a user", "Добавить пользователя", "הוספת משתמש")}
          onSubmit={(e) => { e.preventDefault(); if (canCreate) create.mutate(); }}>
          <div className="field-stack md:col-span-1">
            <label className="field-label" htmlFor="new-user-name">{copy("Name", "Имя", "שם")}</label>
            <input id="new-user-name" className="control-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="field-stack md:col-span-1">
            <label className="field-label" htmlFor="new-user-email">{copy("Email", "Почта", "דוא״ל")}</label>
            <input id="new-user-email" dir="ltr" type="email" className="control-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field-stack md:col-span-1">
            <label className="field-label" htmlFor="new-user-role">{copy("Signs in to", "Входит в", "נכנס ל")}</label>
            <select id="new-user-role" className="control-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "INSTALLER" })}>
              <option value="ADMIN">{copy("Office", "Офис", "משרד")}</option>
              <option value="INSTALLER">{copy("Installer app", "Приложение монтажника", "אפליקציית מתקין")}</option>
            </select>
          </div>
          <div className="field-stack md:col-span-1">
            {form.role === "ADMIN" ? (
              <>
                <label className="field-label" htmlFor="new-user-scope">{copy("Access", "Права", "הרשאה")}</label>
                <select id="new-user-scope" className="control-input" value={form.admin_scope} onChange={(e) => setForm({ ...form, admin_scope: e.target.value as Scope })}>
                  {SCOPES.map((scope) => <option key={scope} value={scope}>{scopeLabel(scope)}</option>)}
                </select>
              </>
            ) : (
              <>
                <label className="field-label" htmlFor="new-user-installer">{copy("Installer card", "Карточка монтажника", "כרטיס מתקין")}</label>
                <select id="new-user-installer" className="control-input" value={form.installer_id} onChange={(e) => setForm({ ...form, installer_id: e.target.value })}>
                  <option value="">{copy("Link later", "Связать позже", "לקשר מאוחר יותר")}</option>
                  {freeInstallers.map((row) => <option key={row.id} value={row.id}>{row.full_name}</option>)}
                </select>
              </>
            )}
          </div>
          <div className="flex items-end md:col-span-1">
            <button type="submit" className="dmx-primary-action h-10 w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={!canCreate}>
              <UserPlus className="h-4 w-4" />{copy("Add user", "Добавить", "הוסף משתמש")}
            </button>
          </div>
        </form>
      </div>

      <ConfirmActionDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        testId="company-user-confirm"
        tone={pending?.kind === "toggle" && pending.user.is_active ? "danger" : "default"}
        title={pending?.kind === "reset"
          ? copy(`New password for ${pending.user.full_name}?`, `Новый пароль для ${pending.user.full_name}?`, `סיסמה חדשה עבור ${pending.user.full_name}?`)
          : pending?.user.is_active
            ? copy(`Switch off ${pending.user.full_name}?`, `Отключить ${pending.user.full_name}?`, `להשבית את ${pending.user.full_name}?`)
            : copy(`Switch on ${pending?.user.full_name ?? ""}?`, `Включить ${pending?.user.full_name ?? ""}?`, `להפעיל את ${pending?.user.full_name ?? ""}?`)}
        changes={pending?.kind === "reset"
          ? copy("The old password stops working and every session of this account ends.", "Старый пароль перестанет работать, все сессии этой учётной записи завершатся.", "הסיסמה הישנה תפסיק לעבוד וכל ההפעלות של החשבון יסתיימו.")
          : pending?.user.is_active
            ? copy("The account can no longer sign in; every open session ends now. Its history stays.", "Учётная запись больше не сможет войти; все открытые сессии завершатся сейчас. История сохраняется.", "החשבון לא יוכל להיכנס; כל ההפעלות הפתוחות יסתיימו עכשיו. ההיסטוריה נשמרת.")
            : copy("The account can sign in again with its password.", "Учётная запись снова сможет войти со своим паролем.", "החשבון יוכל להיכנס שוב עם הסיסמה שלו.")}
        confirmLabel={pending?.kind === "reset" ? copy("Make a new password", "Создать пароль", "צור סיסמה")
          : pending?.user.is_active ? copy("Switch off", "Отключить", "השבת") : copy("Switch on", "Включить", "הפעל")}
        busy={change.isPending || reset.isPending}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          if (!action) return;
          if (action.kind === "reset") reset.mutate(action.user);
          else change.mutate({ id: action.user.id, body: { is_active: !action.user.is_active } });
        }}
      />
    </WidgetCard>
  );
}
