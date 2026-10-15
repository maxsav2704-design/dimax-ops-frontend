"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getBootstrapLocale, localeMeta, type Locale } from "@/lib/locale";

// Rendered by Next error boundaries (error.tsx / global-error.tsx). It reads the
// locale without providers on purpose: global-error replaces the root layout, so
// LanguageProvider and the query client are not available there.
const copy: Record<Locale, {
  eyebrow: string;
  title: string;
  description: string;
  retry: string;
  home: string;
  reference: string;
}> = {
  en: {
    eyebrow: "Something went wrong",
    title: "This screen could not be shown",
    description: "Your data is safe. Retry the screen, or go to the start page if the problem repeats.",
    retry: "Try again",
    home: "Go to start page",
    reference: "Reference",
  },
  ru: {
    eyebrow: "Произошла ошибка",
    title: "Не удалось показать этот экран",
    description: "Данные не потеряны. Повторите попытку или вернитесь на главную, если ошибка повторяется.",
    retry: "Повторить",
    home: "На главную",
    reference: "Код ошибки",
  },
  he: {
    eyebrow: "אירעה שגיאה",
    title: "לא ניתן להציג מסך זה",
    description: "הנתונים שמורים. נסו שוב או חזרו לדף הראשי אם התקלה חוזרת.",
    retry: "נסו שוב",
    home: "לדף הראשי",
    reference: "קוד שגיאה",
  },
};

export type AppErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  /** Full-page variant for global-error, which has no app shell around it. */
  standalone?: boolean;
};

export function AppErrorFallback({ error, reset, homeHref = "/", standalone = false }: AppErrorFallbackProps) {
  const locale = getBootstrapLocale();
  const text = copy[locale];
  const reference = error.digest || null;

  return (
    <div
      dir={localeMeta[locale].dir}
      lang={locale}
      role="alert"
      aria-live="assertive"
      className={standalone
        ? "flex min-h-screen items-center justify-center bg-canvas p-6 font-sans text-text"
        : "page-shell flex min-h-[60vh] items-center justify-center"}
    >
      <section className="w-full max-w-[520px] rounded-lg border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-status-problem-bg text-status-problem-fg">
            <AlertTriangle className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          </span>
          <p className="text-12 font-medium uppercase text-text-secondary">{text.eyebrow}</p>
        </div>
        <h1 className="mt-4 text-22 font-medium leading-tight text-text">{text.title}</h1>
        <p className="mt-2 text-14 leading-6 text-text-secondary">{text.description}</p>
        {reference ? (
          <p className="mt-3 text-12 text-text-tertiary">
            {text.reference}: <span dir="ltr" className="font-mono">{reference}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            <RefreshCcw className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            {text.retry}
          </Button>
          <Button asChild variant="outline">
            <a href={homeHref}>{text.home}</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
