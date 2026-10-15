import { formatLocaleDateTime, formatLocaleMoney, formatLocaleNumber } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Company currency. Views used "ILS", "NIS" and bare numbers side by side;
// every money value rendered through <Money> now reads the same way.
export const COMPANY_CURRENCY = "ILS";

type MoneyProps = {
  value: string | number | null | undefined;
  currency?: string | null;
  className?: string;
  options?: Intl.NumberFormatOptions;
};

export function Money({ value, currency = COMPANY_CURRENCY, className, options }: MoneyProps) {
  const { locale } = useI18n();
  return <span className={cn("num", className)}>{formatLocaleMoney(value, currency, locale, options)}</span>;
}

type NumberValueProps = {
  value: string | number | null | undefined;
  className?: string;
  options?: Intl.NumberFormatOptions;
};

export function NumberValue({ value, className, options }: NumberValueProps) {
  const { locale } = useI18n();
  return <span className={cn("num", className)}>{formatLocaleNumber(value, locale, options)}</span>;
}

type DateTimeProps = {
  value: string | number | Date | null | undefined;
  /** "date" hides the time part; "time" shows only hours and minutes. */
  mode?: "datetime" | "date" | "time";
  className?: string;
};

const modeOptions: Record<NonNullable<DateTimeProps["mode"]>, Intl.DateTimeFormatOptions | undefined> = {
  datetime: undefined,
  date: { hour: undefined, minute: undefined },
  time: { year: undefined, month: undefined, day: undefined },
};

export function DateTime({ value, mode = "datetime", className }: DateTimeProps) {
  const { locale } = useI18n();
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  const iso = date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  return (
    <time dateTime={iso} className={cn("num", className)}>
      {formatLocaleDateTime(value, locale, modeOptions[mode])}
    </time>
  );
}
