"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Eraser,
  FileCheck2,
  Loader2,
  PenLine,
  ShieldCheck,
} from "lucide-react";

import { apiBaseUrl } from "@/lib/api";

type Point = { x: number; y: number };
type AcceptancePayload = {
  journal: {
    id: string;
    title: string | null;
    status: string;
    snapshot_version: number;
  };
  project: {
    name: string;
    address: string | null;
    developer_company: string | null;
    contact_name: string | null;
  };
  items: Array<{
    unit_label: string;
    door_type_name: string;
    installed_at: string | null;
  }>;
  addon_items: Array<{
    name: string;
    quantity: string;
    unit: string;
    done_at: string;
    comment: string | null;
  }>;
};

type SignResponse = {
  ok: boolean;
  pdf_ready: boolean;
  email_queued: boolean;
};

type Locale = "en" | "ru" | "he";

function browserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const locale = navigator.language.toLowerCase();
  if (locale.startsWith("ru")) return "ru";
  if (locale.startsWith("he")) return "he";
  return "en";
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function copy(locale: Locale, en: string, ru: string, he: string): string {
  return locale === "ru" ? ru : locale === "he" ? he : en;
}

export default function AcceptancePage({ token }: { token: string }) {
  const [locale] = useState<Locale>(browserLocale);
  const [payload, setPayload] = useState<AcceptancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [completed, setCompleted] = useState<SignResponse | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const activeStrokeRef = useRef<Point[]>([]);
  const viewportRef = useRef({ width: 1, height: 1 });

  const redraw = useCallback((nextStrokes: Point[][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    if (
      canvas.width !== Math.round(width * ratio) ||
      canvas.height !== Math.round(height * ratio)
    ) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    viewportRef.current = { width, height };
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "#111318";
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const stroke of nextStrokes) {
      if (stroke.length < 2) continue;
      context.beginPath();
      context.moveTo(stroke[0].x, stroke[0].y);
      for (const point of stroke.slice(1)) context.lineTo(point.x, point.y);
      context.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => redraw(strokes));
    observer.observe(canvas);
    redraw(strokes);
    return () => observer.disconnect();
  }, [redraw, strokes]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${apiBaseUrl()}/api/v1/public/journals/${encodeURIComponent(token)}`,
          { headers: { "Accept-Language": locale } },
        );
        if (!response.ok)
          throw new Error(
            copy(
              locale,
              "This signing link is invalid or expired.",
              "Ссылка недействительна или истекла.",
              "קישור החתימה אינו תקף או שפג תוקפו.",
            ),
          );
        const body = (await response.json()) as AcceptancePayload;
        if (!cancelled) setPayload(body);
      } catch (reason) {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "Loading failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, token]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    activeStrokeRef.current = [pointFromEvent(event)];
  }

  function continueDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const nextStroke = [...activeStrokeRef.current, pointFromEvent(event)];
    activeStrokeRef.current = nextStroke;
    redraw([...strokes, nextStroke]);
  }

  function finishDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (activeStrokeRef.current.length >= 2) {
      setStrokes((current) => [...current, activeStrokeRef.current]);
    }
    activeStrokeRef.current = [];
  }

  async function submit() {
    if (
      !payload ||
      submitting ||
      signerName.trim().length < 2 ||
      !accepted ||
      !strokes.length
    )
      return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl()}/api/v1/public/journals/${encodeURIComponent(token)}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": locale,
          },
          body: JSON.stringify({
            signer_name: signerName.trim(),
            signature_payload: {
              version: 1,
              viewport: viewportRef.current,
              strokes,
            },
          }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(
          body?.error?.message ||
            copy(
              locale,
              "Signing failed.",
              "Не удалось подписать документ.",
              "החתימה נכשלה.",
            ),
        );
      }
      setCompleted((await response.json()) as SignResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Signing failed");
    } finally {
      setSubmitting(false);
    }
  }

  const direction = locale === "he" ? "rtl" : "ltr";
  return (
    <main
      dir={direction}
      className="min-h-screen bg-[#f1f2f4] px-4 py-6 text-[#15171b] sm:px-6 sm:py-10"
    >
      <div className="mx-auto w-full max-w-[920px] overflow-hidden rounded-lg border border-[#d9dce2] bg-white shadow-[0_18px_55px_rgba(17,19,24,0.08)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#25272d] bg-[#111318] px-5 py-5 text-white sm:px-8">
          <div>
            <div className="text-xl font-extrabold">DIMAX</div>
            <div className="mt-1 text-[10px] font-semibold uppercase text-[#c4c7ce]">
              Operations Suite
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[#454851] px-3 py-2 text-xs text-[#e7e8eb]">
            <ShieldCheck className="h-4 w-4 text-[#ffc83a]" />
            {copy(
              locale,
              "Secure acceptance",
              "Защищённая приёмка",
              "אישור מאובטח",
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[440px] items-center justify-center gap-3 text-sm text-[#626873]">
            <Loader2 className="h-5 w-5 animate-spin" />
            {copy(
              locale,
              "Loading document",
              "Загрузка документа",
              "טוען מסמך",
            )}
          </div>
        ) : error && !payload ? (
          <div className="m-6 rounded-lg border border-[#f1b9b4] bg-[#fff0ee] p-5 text-sm text-[#a62c22]">
            {error}
          </div>
        ) : completed ? (
          <div className="flex min-h-[480px] flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f7ee] text-[#23864b]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">
              {copy(
                locale,
                "Document signed",
                "Документ подписан",
                "המסמך נחתם",
              )}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#646a75]">
              {completed.email_queued
                ? copy(
                    locale,
                    "The final PDF was created and queued for delivery to the developer and DIMAX administration.",
                    "Финальный PDF сформирован и поставлен на отправку застройщику и администратору DIMAX.",
                    "קובץ ה-PDF הסופי נוצר ונשלח ליזם ולהנהלת DIMAX.",
                  )
                : copy(
                    locale,
                    "The PDF was created. DIMAX administration will review the email delivery settings.",
                    "PDF сформирован. Администратор DIMAX проверит настройки отправки по электронной почте.",
                    "קובץ ה-PDF נוצר. הנהלת DIMAX תבדוק את הגדרות הדוא״ל.",
                  )}
            </p>
          </div>
        ) : payload ? (
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-5 border-b border-[#e1e3e8] pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#8b6b16]">
                  {copy(
                    locale,
                    "Work acceptance",
                    "Акт выполненных работ",
                    "אישור ביצוע עבודות",
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-bold leading-tight">
                  {payload.journal.title || payload.project.name}
                </h1>
                <p className="mt-2 text-sm text-[#646a75]">
                  {payload.project.address || "-"}
                </p>
              </div>
              <div className="rounded-md border border-[#dfe2e7] bg-[#f6f7f8] px-4 py-3 text-sm">
                <div className="text-xs text-[#777d87]">
                  {copy(locale, "Developer", "Застройщик", "יזם")}
                </div>
                <div className="mt-1 font-semibold">
                  {payload.project.developer_company ||
                    payload.project.contact_name ||
                    "-"}
                </div>
              </div>
            </div>

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">
                  {copy(
                    locale,
                    "Completed doors",
                    "Завершённые двери",
                    "דלתות שהושלמו",
                  )}
                </h2>
                <span className="rounded-full bg-[#fff4d0] px-3 py-1 text-xs font-bold text-[#78580c]">
                  {payload.items.length}
                </span>
              </div>
              <div className="overflow-x-auto rounded-md border border-[#dfe2e7]">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead className="bg-[#17191e] text-left text-xs text-white">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">
                        {copy(
                          locale,
                          "Door / position",
                          "Дверь / позиция",
                          "דלת / מיקום",
                        )}
                      </th>
                      <th className="px-4 py-3">
                        {copy(locale, "Type", "Тип", "סוג")}
                      </th>
                      <th className="px-4 py-3">
                        {copy(locale, "Completed", "Завершено", "הושלם")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.items.map((item, index) => (
                      <tr
                        key={`${item.unit_label}-${index}`}
                        className="border-t border-[#e5e7eb] even:bg-[#f8f9fa]"
                      >
                        <td className="px-4 py-3 text-[#858b95]">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {item.unit_label}
                        </td>
                        <td className="px-4 py-3">{item.door_type_name}</td>
                        <td className="px-4 py-3 text-[#646a75]">
                          {formatDate(item.installed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {payload.addon_items.length ? (
              <section className="mt-6">
                <h2 className="mb-3 text-base font-bold">
                  {copy(
                    locale,
                    "Additional works",
                    "Дополнительные работы",
                    "עבודות נוספות",
                  )}
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {payload.addon_items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="rounded-md border border-[#dfe2e7] bg-[#f8f9fa] p-4"
                    >
                      <div className="font-semibold">{item.name}</div>
                      <div className="mt-1 text-sm text-[#646a75]">
                        {item.quantity} {item.unit} · {formatDate(item.done_at)}
                      </div>
                      {item.comment ? (
                        <div className="mt-2 text-xs text-[#777d87]">
                          {item.comment}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-8 rounded-lg border border-[#dfe2e7] bg-[#f7f8f9] p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-[#8b6b16]" />
                <h2 className="text-base font-bold">
                  {copy(
                    locale,
                    "Developer signature",
                    "Подпись застройщика",
                    "חתימת היזם",
                  )}
                </h2>
              </div>
              <label
                htmlFor="acceptance-signer-name"
                className="mt-5 block text-xs font-semibold text-[#555b66]"
              >
                {copy(locale, "Full name", "Имя и фамилия", "שם מלא")}
              </label>
              <input
                id="acceptance-signer-name"
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                maxLength={200}
                autoComplete="name"
                className="mt-2 h-11 w-full rounded-md border border-[#cfd3da] bg-white px-3 text-sm outline-none focus:border-[#b8891f] focus:ring-2 focus:ring-[#ffc83a]/30"
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#555b66]">
                  {copy(locale, "Sign below", "Распишитесь ниже", "חתום למטה")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStrokes([]);
                    redraw([]);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f6570] hover:text-[#17191e]"
                >
                  <Eraser className="h-4 w-4" />
                  {copy(locale, "Clear", "Очистить", "נקה")}
                </button>
              </div>
              <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={finishDrawing}
                onPointerCancel={finishDrawing}
                onPointerLeave={finishDrawing}
                className="mt-2 h-[170px] w-full touch-none rounded-md border border-[#cfd3da] bg-white"
                aria-label={copy(
                  locale,
                  "Signature field",
                  "Поле подписи",
                  "שדה חתימה",
                )}
              />
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#555b66]">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#17191e]"
                />
                <span>
                  {copy(
                    locale,
                    "I confirm that the listed work was completed and accepted.",
                    "Подтверждаю, что перечисленные работы выполнены и приняты.",
                    "אני מאשר שהעבודות המפורטות הושלמו והתקבלו.",
                  )}
                </span>
              </label>
              {error ? (
                <div className="mt-4 rounded-md border border-[#f1b9b4] bg-[#fff0ee] p-3 text-sm text-[#a62c22]">
                  {error}
                </div>
              ) : null}
              <button
                type="button"
                disabled={
                  submitting ||
                  signerName.trim().length < 2 ||
                  !accepted ||
                  !strokes.length
                }
                onClick={() => void submit()}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#ffc83a] px-5 text-sm font-bold text-[#17191e] transition-colors hover:bg-[#f3bb2b] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileCheck2 className="h-5 w-5" />
                )}
                {copy(
                  locale,
                  "Sign and create PDF",
                  "Подписать и сформировать PDF",
                  "חתום וצור PDF",
                )}
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
