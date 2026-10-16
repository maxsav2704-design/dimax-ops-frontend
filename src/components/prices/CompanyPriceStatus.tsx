import { FileCheck2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, useCopy } from "@/lib/i18n";
import { formatLocaleDateTime } from "@/lib/formatting";
import type { CompanyPricingState } from "@/lib/factory-prices";

export function CompanyPriceStatus({ state, loading, error, refresh, onOpen }: {
  state?: CompanyPricingState; loading: boolean; error: boolean; refresh: () => void;
  onOpen: (id: string) => void;
}) {
  const { locale } = useI18n();
  const copy = useCopy();
  const active = state?.mode === "FACTORY" ? state.active_price : null;
  return <section aria-label={copy("Current pricing", "Действующие цены", "מחירים בתוקף")}
    className="min-w-0 space-y-2 border-s-2 border-accent ps-3 text-sm">
    {error ? <div role="alert" className="space-y-2 text-status-problem-fg">
      <p>{copy("Pricing could not be verified. Price changes are locked.",
        "Не удалось проверить режим цен. Изменение цен заблокировано.",
        "לא ניתן לאמת את מצב המחירים. שינוי מחירים חסום.")}</p>
      <Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className="me-2 size-4" />
        {copy("Retry", "Повторить", "ניסיון חוזר")}</Button>
    </div> : active ? <>
      <p className="font-semibold">{copy("Active factory price list", "Действующий прайс завода", "מחירון מפעל בתוקף")} v{active.version}</p>
      <p className="text-xs text-text-secondary">{copy("Effective from: ", "Действует с: ", "בתוקף מתאריך: ")}
        {formatLocaleDateTime(active.effective_from, locale)}</p>
      <p className="text-xs text-text-secondary">{copy("One price list for all projects. Individual rates are retained as history.",
        "Единый прайс для всех объектов. Персональные ставки сохранены как история.",
        "מחירון אחיד לכל הפרויקטים. תעריפים אישיים נשמרים כהיסטוריה.")}</p>
      <Button variant="outline" size="sm" onClick={() => onOpen(active.price_list_id)} disabled={loading}>
        <FileCheck2 className="me-2 size-4" />{copy("Open active version", "Открыть действующую версию", "פתיחת הגרסה בתוקף")}</Button>
    </> : state?.mode === "LEGACY" ? <p>{copy("Factory pricing is not enabled. Legacy rates still apply.",
      "Заводской прайс ещё не включён. Действуют прежние ставки.", "מחירון המפעל טרם הופעל. התעריפים הקודמים עדיין בתוקף.")}</p>
      : <p role="status">{copy("Checking pricing...", "Проверяем режим цен...", "בודק את מצב המחירים...")}</p>}
  </section>;
}
