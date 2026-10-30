import { formatLocaleMoney } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";

/** Small helpers shared by the settlement panels (reconciliation, payments). */
export const field = "h-9 w-full rounded-md border border-border bg-surface px-2 text-sm";
export const AMOUNT = /^\d+(\.\d{1,2})?$/;
export const amountOk = (value: string, { zero = false } = {}) => AMOUNT.test(value) && (zero || Number(value) > 0);

export function useMoney() {
  const { locale } = useI18n();
  return (value: string | null) => value === null ? "—" : formatLocaleMoney(value, "ILS", locale, { minimumFractionDigits: 2 });
}
