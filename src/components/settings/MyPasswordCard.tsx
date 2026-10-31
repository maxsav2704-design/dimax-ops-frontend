"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { InlineNotice, WidgetCard } from "@/components/dimax";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useCopy, useI18n } from "@/lib/i18n";

const MIN = 10;

/** The signed-in person replaces their password (for example the one-time password the owner gave them). */
export function MyPasswordCard() {
  const { locale } = useI18n();
  const copy = useCopy();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const mismatch = repeat.length > 0 && repeat !== next;
  const ready = current.length > 0 && next.length >= MIN && next === repeat;

  const save = useMutation({
    mutationFn: () => apiFetch<void>("/api/v1/auth/change-password", {
      method: "POST", body: JSON.stringify({ current_password: current, new_password: next }),
    }),
    onSuccess: () => {
      setCurrent(""); setNext(""); setRepeat("");
      setNotice({ tone: "success", message: copy("Password changed. Every session ends; sign in again with the new password.",
        "Пароль изменён. Все сессии завершены; войдите снова с новым паролем.",
        "הסיסמה שונתה. כל ההפעלות הסתיימו; היכנסו שוב עם הסיסמה החדשה.") });
    },
    onError: (error) => setNotice({ tone: "error", message: readableApiError(error, locale,
      copy("The password was not changed.", "Пароль не изменён.", "הסיסמה לא שונתה.")) }),
  });

  return (
    <WidgetCard title={copy("My password", "Мой пароль", "הסיסמה שלי")}
      headerMeta={copy("Replace the password you were given with your own.", "Замените выданный пароль на свой.", "החליפו את הסיסמה שקיבלתם בסיסמה משלכם.")}
      actionSlot={<KeyRound className="h-4 w-4 text-text-secondary" />}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ready) save.mutate(); }}>
        {notice && <InlineNotice tone={notice.tone}>{notice.message}</InlineNotice>}
        <div className="field-stack">
          <label className="field-label" htmlFor="my-current-password">{copy("Current password", "Текущий пароль", "סיסמה נוכחית")}</label>
          <input id="my-current-password" type="password" autoComplete="current-password" className="control-input" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="my-new-password">{copy("New password", "Новый пароль", "סיסמה חדשה")}</label>
          <input id="my-new-password" type="password" autoComplete="new-password" className="control-input" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="my-new-password-hint" />
          <p id="my-new-password-hint" className="text-12 text-text-secondary">{copy(`At least ${MIN} characters.`, `Не меньше ${MIN} символов.`, `לפחות ${MIN} תווים.`)}</p>
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="my-repeat-password">{copy("Repeat the new password", "Повторите новый пароль", "חזרו על הסיסמה החדשה")}</label>
          <input id="my-repeat-password" type="password" autoComplete="new-password" className="control-input" value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-invalid={mismatch}
            aria-describedby={mismatch ? "my-repeat-password-error" : undefined} />
          {mismatch && <p id="my-repeat-password-error" className="text-12 text-status-problem-fg">{copy("The two passwords differ.", "Пароли не совпадают.", "הסיסמאות שונות.")}</p>}
        </div>
        <button type="submit" className="dmx-primary-action h-10 w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={!ready || save.isPending}>
          {copy("Change password", "Сменить пароль", "שנה סיסמה")}
        </button>
      </form>
    </WidgetCard>
  );
}
