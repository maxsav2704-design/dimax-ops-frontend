import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type InlineNoticeTone = "success" | "error" | "warning" | "info";

const toneClass: Record<InlineNoticeTone, string> = {
  success: "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
  error: "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  info: "border-status-progress-border bg-status-progress-bg text-status-progress-fg",
};

const toneIcon = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const dismissCopy = { en: "Dismiss", ru: "Скрыть", he: "סגירה" } as const;

type InlineNoticeProps = {
  tone: InlineNoticeTone;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
  testId?: string;
};

// The single feedback banner for success/error/warning/info messages inside a
// page. Replaces the per-page *NoticeClass helpers; errors announce via alert.
export function InlineNotice({ tone, children, action, onDismiss, className, testId }: InlineNoticeProps) {
  const { locale } = useI18n();
  const Icon = toneIcon[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
      data-tone={tone}
      className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-13 leading-5", toneClass[tone], className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissCopy[locale]}
          className="-me-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
