"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, DoorClosed, FileCheck2, Loader2, Mail, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiBaseUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatLocaleMoney } from "@/lib/formatting";

type Approval = {
  company_name: string; factory_name: string; recipient_name: string;
  version: number; currency: "ILS"; reason: string; agreement_reference: string;
  items: Array<{ kind: "DOOR" | "ADDON"; name: string; unit: string; installer_price: string }>;
  snapshot_hash: string; expires_at: string; status: "PENDING" | "CONFIRMED";
  confirmed_at: string | null; confirmed_name: string | null; affects_earnings: false;
};
type CodeRequest = { status: "QUEUED"; expires_at: string; resend_after: string };

const copy = {
  en: {
    title: "Price confirmation", version: "Version", factory: "Factory", recipient: "Representative",
    agreement: "Agreement", reason: "Change request", work: "Work", unit: "Unit", price: "Installer rate",
    expiry: "Link valid until", fullName: "Your full name", consent: "I represent the named factory and confirm all rates in this version.",
    confirm: "Confirm prices", confirmed: "Factory confirmation recorded", recordOnly: "This records approval of the price list. Existing earnings are not changed.",
    unavailable: "This link is unavailable or has expired. Request a new invitation from the administrator.",
    changed: "This offer has changed or been replaced. Request a new invitation from the administrator.",
    retry: "Check again", result: "Check result", loading: "Loading price list", busy: "Please wait before trying again.",
    network: "The server could not be reached. Try again.", uncertain: "The result could not be verified. Check it before submitting again.",
    pcs: "pcs", hour: "hour", loadingConfirm: "Recording confirmation", door: "Installation", addon: "Additional work",
    sendCode: "Email verification code", resendCode: "Send a new code", code: "Code from email",
    codeHint: "The code goes to the representative's email specified in the invitation. Do not share it.",
    codeQueued: "Code email queued", codeExpiry: "Code valid until", codeError: "The code is missing, incorrect or expired. After five incorrect attempts, request a new invitation from the administrator.",
    codeUnavailable: "Verification email is unavailable. Contact the administrator.",
    codeBusy: "Please wait a minute before requesting another code. If the limit has been reached, request a new invitation.",
  },
  ru: {
    title: "Согласование прайса", version: "Версия", factory: "Завод", recipient: "Представитель",
    agreement: "Договорённость", reason: "Причина изменения", work: "Работа", unit: "Ед.", price: "Ставка монтажника",
    expiry: "Ссылка действует до", fullName: "Ваше имя и фамилия", consent: "Я представляю указанный завод и подтверждаю все расценки этой версии.",
    confirm: "Подтвердить расценки", confirmed: "Подтверждение завода сохранено", recordOnly: "Фиксируется согласование прайса. Ранее начисленный заработок не изменяется.",
    unavailable: "Ссылка недоступна или срок её действия истёк. Запросите новое приглашение у администратора.",
    changed: "Предложение изменено или заменено новой версией. Запросите новое приглашение у администратора.",
    retry: "Проверить снова", result: "Проверить результат", loading: "Загрузка прайса", busy: "Подождите немного перед повторной попыткой.",
    network: "Не удалось связаться с сервером. Попробуйте снова.", uncertain: "Результат не удалось проверить. Проверьте его перед повторным подтверждением.",
    pcs: "шт.", hour: "час", loadingConfirm: "Сохранение подтверждения", door: "Монтаж", addon: "Допработа",
    sendCode: "Получить код на почту", resendCode: "Отправить новый код", code: "Код из письма",
    codeHint: "Код поступит на почту представителя, указанную в приглашении. Никому его не передавайте.",
    codeQueued: "Письмо с кодом в очереди отправки", codeExpiry: "Код действует до", codeError: "Код отсутствует, неверен или просрочен. После пяти неверных попыток запросите новое приглашение у администратора.",
    codeUnavailable: "Отправка кода недоступна. Обратитесь к администратору.",
    codeBusy: "Подождите минуту перед повторной отправкой. Если лимит исчерпан, запросите новое приглашение.",
  },
  he: {
    title: "אישור מחירון", version: "גרסה", factory: "מפעל", recipient: "נציג",
    agreement: "אסמכתה להסכמה", reason: "סיבת השינוי", work: "עבודה", unit: "יחידה", price: "תעריף מתקין",
    expiry: "הקישור בתוקף עד", fullName: "השם המלא שלך", consent: "אני מייצג את המפעל המצוין ומאשר את כל התעריפים בגרסה זו.",
    confirm: "אישור התעריפים", confirmed: "אישור המפעל נשמר", recordOnly: "אישור המחירון נרשם. סכומים שכבר נצברו אינם משתנים.",
    unavailable: "הקישור אינו זמין או שפג תוקפו. יש לבקש הזמנה חדשה מהמנהל.",
    changed: "ההצעה השתנתה או הוחלפה בגרסה חדשה. יש לבקש הזמנה חדשה מהמנהל.",
    retry: "בדיקה חוזרת", result: "בדיקת התוצאה", loading: "טעינת מחירון", busy: "יש להמתין מעט לפני ניסיון נוסף.",
    network: "לא ניתן להתחבר לשרת. יש לנסות שוב.", uncertain: "לא ניתן לאמת את התוצאה. יש לבדוק אותה לפני אישור נוסף.",
    pcs: "יח׳", hour: "שעה", loadingConfirm: "שמירת האישור", door: "התקנה", addon: "עבודה נוספת",
    sendCode: "שליחת קוד בדוא״ל", resendCode: "שליחת קוד חדש", code: "הקוד מהדוא״ל",
    codeHint: "הקוד יישלח לכתובת הדוא״ל של הנציג שצוינה בהזמנה. אין לשתף אותו.",
    codeQueued: "הודעת הקוד ממתינה לשליחה", codeExpiry: "הקוד בתוקף עד", codeError: "הקוד חסר, שגוי או שפג תוקפו. לאחר חמישה ניסיונות שגויים יש לבקש הזמנה חדשה מהמנהל.",
    codeUnavailable: "שליחת הקוד אינה זמינה. יש לפנות למנהל.",
    codeBusy: "יש להמתין דקה לפני שליחה נוספת. אם הגעת למגבלה, יש לבקש הזמנה חדשה.",
  },
};

class ApprovalError extends Error {
  constructor(readonly status: number) { super("Price approval request failed"); }
}

async function request<T = Approval>(action: "preview" | "confirm" | "request-code", body: object, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(abort, 30_000);
  try {
    const response = await fetch(`${apiBaseUrl()}/api/v1/public/price-approvals/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) throw new ApprovalError(response.status);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export default function PriceApprovalPage() {
  const { locale, dir } = useI18n();
  const t = copy[locale];
  const [token, setToken] = useState<string | null>(null);
  const initialRead = useRef(false);
  const [data, setData] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<"unavailable" | "changed" | "network" | "busy" | "uncertain" | null>(null);
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [code, setCode] = useState("");
  const [codeRequest, setCodeRequest] = useState<CodeRequest | null>(null);
  const [codeError, setCodeError] = useState<"codeError" | "codeUnavailable" | "codeBusy" | "network" | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [retry, setRetry] = useState(0);
  const submitLock = useRef(false);
  const generation = useRef(0);
  const advanceGeneration = useCallback(() => ++generation.current, []);

  useEffect(() => {
    const read = () => {
      advanceGeneration();
      const raw = window.location.hash.slice(1);
      setToken(/^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : "");
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      setData(null); setName(""); setAccepted(false); setCode(""); setCodeRequest(null); setCodeError(null);
      setRetry((value) => value + 1);
    };
    if (!initialRead.current) { initialRead.current = true; read(); }
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [advanceGeneration]);

  const classify = useCallback((reason: unknown) => {
    if (reason instanceof ApprovalError) {
      if (reason.status === 404 || reason.status === 422) return "unavailable" as const;
      if (reason.status === 409) return "changed" as const;
      if (reason.status === 429) return "busy" as const;
    }
    return "network" as const;
  }, []);

  useEffect(() => {
    if (token === null) return;
    const controller = new AbortController();
    const current = advanceGeneration();
    setLoading(true); setError(null); setData(null); setAccepted(false);
    if (!token) { setError("unavailable"); setLoading(false); return; }
    void request("preview", { token }, controller.signal).then((result) => {
      if (current === generation.current && !controller.signal.aborted) setData(result);
    }).catch((reason) => {
      if (current === generation.current && !controller.signal.aborted) setError(classify(reason));
    }).finally(() => {
      if (current === generation.current && !controller.signal.aborted) setLoading(false);
    });
    return () => { controller.abort(); advanceGeneration(); };
  }, [token, retry, classify, advanceGeneration]);

  useEffect(() => {
    if (!codeRequest) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [codeRequest]);

  async function sendCode() {
    if (!token || !data || data.status !== "PENDING" || submitLock.current) return;
    submitLock.current = true; setSendingCode(true); setCodeError(null);
    const current = generation.current;
    try {
      const result = await request<CodeRequest>("request-code", { token });
      if (current === generation.current) {
        setCodeRequest(result); setCode(""); setClock(Date.now());
      }
    } catch (reason) {
      if (current === generation.current) {
        if (reason instanceof ApprovalError && [404, 409].includes(reason.status)) setError(classify(reason));
        else setCodeError(reason instanceof ApprovalError
          ? reason.status === 429 ? "codeBusy" : "codeUnavailable" : "network");
      }
    } finally {
      submitLock.current = false; setSendingCode(false);
    }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!data || !token || !accepted || name.trim().length < 2 || !/^[0-9]{6}$/.test(code) || submitLock.current || error) return;
    submitLock.current = true; setSubmitting(true); setError(null);
    const current = generation.current;
    try {
      const result = await request("confirm", {
        token, expected_version: data.version, snapshot_hash: data.snapshot_hash,
        signer_name: name.trim(), accepted: true, verification_code: code,
      });
      if (current === generation.current) setData(result);
    } catch (reason) {
      if (current === generation.current) {
        if (reason instanceof ApprovalError && reason.status === 403) setCodeError("codeError");
        else {
          const kind = classify(reason);
          setError(kind === "network" ? "uncertain" : kind);
        }
      }
    } finally {
      submitLock.current = false; setSubmitting(false);
    }
  }

  const date = (value: string) => new Intl.DateTimeFormat(locale, {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem",
  }).format(new Date(value));

  return (
    <main dir={dir} className="min-h-screen bg-surface-sunken text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <span className="rounded-md bg-[#191919] px-4 py-2 font-bold text-[#ffcd35]">DIMAX</span>
          <LanguageSwitcher compact />
        </div>
      </header>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-start gap-3">
          <FileCheck2 className="mt-1 size-6 shrink-0 text-text-secondary" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight">{t.title}</h1>
            {data && <p className="mt-1 break-words text-sm text-text-secondary">{data.company_name} · {t.version} {data.version}</p>}
          </div>
        </div>
        {loading && <p role="status" className="flex items-center gap-2 py-8 text-sm"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />{t.loading}</p>}
        {error && <div role="alert" className="space-y-3 border-s-4 border-amber-500 bg-amber-50 p-4 text-sm text-neutral-900">
          <p>{t[error]}</p>
          {token && <Button variant="outline" onClick={() => setRetry((value) => value + 1)} disabled={submitting}>
            <RefreshCw className="me-2 size-4" aria-hidden="true" />{error === "uncertain" ? t.result : t.retry}
          </Button>}
        </div>}
        {data && <>
          <dl className="grid min-w-0 gap-4 border-y border-border py-5 text-sm sm:grid-cols-2">
            {[[t.factory, data.factory_name], [t.recipient, data.recipient_name], [t.agreement, data.agreement_reference], [t.reason, data.reason]].map(([label, value]) =>
              <div key={label} className="min-w-0"><dt className="text-text-secondary">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
          </dl>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b border-border bg-surface-sunken text-text-secondary"><tr>
                <th scope="col" className="p-3 text-start font-medium">{t.work}</th>
                <th scope="col" className="w-14 p-2 text-start font-medium sm:w-20">{t.unit}</th>
                <th scope="col" className="w-32 p-3 text-end font-medium sm:w-44">{t.price}</th>
              </tr></thead>
              <tbody>{data.items.map((item, index) => <tr key={index} className="border-b border-border last:border-0">
                <td className="break-words p-3 font-medium">{item.name}<span className="mt-1 flex items-center gap-1 text-xs font-normal text-text-secondary">
                  {item.kind === "DOOR" ? <DoorClosed className="size-3 shrink-0" aria-hidden="true" /> : <Wrench className="size-3 shrink-0" aria-hidden="true" />}
                  {item.kind === "DOOR" ? t.door : t.addon}
                </span></td>
                <td className="break-words p-2 text-text-secondary">{item.unit === "pcs" ? t.pcs : item.unit === "hour" ? t.hour : item.unit}</td>
                <td className="break-words p-3 text-end text-xs font-semibold tabular-nums sm:text-sm">{formatLocaleMoney(item.installer_price, data.currency, locale, { minimumFractionDigits: 2 })}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {data.status === "CONFIRMED" ? <section role="status" className="flex gap-3 border-s-4 border-emerald-600 bg-emerald-50 p-4 text-emerald-950">
            <CheckCircle2 className="size-6 shrink-0" aria-hidden="true" /><div className="min-w-0">
              <h2 className="font-semibold">{t.confirmed}</h2><p className="mt-1 break-words text-sm">{data.confirmed_name} · {data.confirmed_at && date(data.confirmed_at)}</p>
              <p className="mt-2 text-sm">{t.recordOnly}</p>
            </div>
          </section> : <form onSubmit={confirm} className="space-y-4 border-t border-border pt-5">
            <p className="text-xs text-text-secondary">{t.expiry}: {date(data.expires_at)}</p>
            <div className="max-w-xl space-y-3 border-b border-border pb-4">
              <p id="factory-code-hint" className="text-sm text-text-secondary">{t.codeHint}</p>
              <Button type="button" variant="outline" onClick={() => void sendCode()}
                disabled={submitting || sendingCode || !!error || (!!codeRequest && clock < Date.parse(codeRequest.resend_after))}
                className="h-auto min-h-11 max-w-full whitespace-normal rounded-md">
                {sendingCode ? <Loader2 className="me-2 size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  : <Mail className="me-2 size-4 shrink-0" aria-hidden="true" />}
                {codeRequest ? t.resendCode : t.sendCode}
              </Button>
              {codeRequest && <p role="status" className="text-xs text-text-secondary">{t.codeQueued}. {t.codeExpiry}: {date(codeRequest.expires_at)}</p>}
              <div className="max-w-xs space-y-2">
                <label htmlFor="factory-code" className="text-sm font-medium">{t.code}</label>
                <Input id="factory-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
                  maxLength={6} value={code} required aria-describedby="factory-code-hint" aria-invalid={codeError === "codeError"}
                  onChange={(event) => { setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6)); setCodeError(null); }}
                  disabled={submitting || sendingCode} />
              </div>
              {codeError && <p role="alert" className="text-sm text-destructive">{t[codeError]}</p>}
            </div>
            <div className="max-w-md space-y-2"><label htmlFor="factory-signer" className="text-sm font-medium">{t.fullName}</label>
              <Input id="factory-signer" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required disabled={submitting} />
            </div>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[#191919]" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} disabled={submitting} />{t.consent}
            </label>
            <Button type="submit" disabled={!accepted || name.trim().length < 2 || !/^[0-9]{6}$/.test(code) || submitting || sendingCode || !!error} className="h-auto min-h-11 max-w-full whitespace-normal rounded-md px-5 py-3">
              {submitting ? <Loader2 className="me-2 size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ShieldCheck className="me-2 size-4 shrink-0" aria-hidden="true" />}
              {submitting ? t.loadingConfirm : t.confirm}
            </Button>
            <p className="max-w-xl text-xs leading-relaxed text-text-secondary">{t.recordOnly}</p>
          </form>}
        </>}
      </div>
    </main>
  );
}
