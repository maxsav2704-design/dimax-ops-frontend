import { useI18n } from "@/lib/i18n";

export type IssueExposureCoverage = {
  pricing_mode?: "LEGACY" | "FACTORY";
  price_list_version?: number | null;
  exposure_profit_total?: number | null;
  exposure_doors?: number;
  unpriced_exposure_doors?: number;
  unpriced_open_issue_doors?: number;
  unpriced_blocked_issue_doors?: number;
  unpriced_delayed_doors?: number;
  reason_rows_total?: number;
  addon_rows_total?: number | null;
  addon_unrecorded_completed_works?: number;
  addon_missing_client_prices?: number;
  incomplete_addon_rows?: number;
};

export function UnpricedExposureNotice({ count }: { count?: number }) {
  const { locale } = useI18n();
  if (!count) return null;
  return <p className="mt-1 text-xs text-status-warning-fg">
    {locale === "ru" ? "Двери без подтверждённой ставки" : locale === "he" ? "דלתות ללא תעריף מאושר" : "Doors without a confirmed rate"}: {count}.
  </p>;
}

export function IssueExposureBasis({ data, reasonsShown, addonsShown }: {
  data?: IssueExposureCoverage; reasonsShown?: number; addonsShown?: number;
}) {
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) => locale === "ru" ? ru : locale === "he" ? he : en;
  if (!data?.pricing_mode) return null;
  return <div role="status" className="min-w-0 space-y-1 px-3 py-2 text-xs text-text-secondary">
    <p>{copy("Risk across unique doors", "Риск по уникальным дверям", "סיכון לפי דלתות ייחודיות")}: {data.exposure_profit_total == null ? "-" : Number(data.exposure_profit_total).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIS.
      {" "}{copy("Doors", "Двери", "דלתות")}: {data.exposure_doors ?? "-"}.</p>
    <p>{copy("Forecast exposure, not earned wages or an invoice. Issue and delay figures overlap; the total counts each door once.",
      "Это оценка риска, не начисленный заработок и не счёт клиенту. Проблемы и задержки пересекаются; в общем итоге каждая дверь учтена один раз.",
      "זוהי הערכת סיכון, לא שכר שנצבר או חשבונית. נתוני תקלות ועיכובים חופפים; בסיכום כל דלת נספרת פעם אחת.")}</p>
    {data.pricing_mode === "FACTORY" && <>
      <p>{copy("Current client prices and active confirmed price list", "Текущие цены клиента и действующий подтверждённый прайс", "מחירי לקוח נוכחיים ומחירון מאושר פעיל")}: {data.price_list_version ?? "-"}.</p>
      <UnpricedExposureNotice count={data.unpriced_exposure_doors} />
      <p>{copy("Unpriced doors: open issues / blocked / delayed", "Двери без ставки: открытые проблемы / блокировки / задержки", "דלתות ללא תעריף: תקלות פתוחות / חסומות / מעוכבות")}: {data.unpriced_open_issue_doors ?? 0} / {data.unpriced_blocked_issue_doors ?? 0} / {data.unpriced_delayed_doors ?? 0}.</p>
      {addonsShown !== undefined && <>
        <p>{copy("Add-ons use net recorded earnings and surviving work at current client prices.",
          "Допработы: начисления из журнала с учётом отмен, сохранившиеся работы по текущим ценам клиента.",
          "תוספות: שכר רשום נטו ועבודות שלא בוטלו לפי מחירי הלקוח הנוכחיים.")}</p>
        {((data.addon_unrecorded_completed_works ?? 0) + (data.addon_missing_client_prices ?? 0) > 0) && <p className="text-status-warning-fg">
          {copy("Add-ons without earnings / client prices", "Допработы без начислений / цены клиента", "תוספות ללא שכר / מחיר לקוח")}: {data.addon_unrecorded_completed_works ?? 0} / {data.addon_missing_client_prices ?? 0}.
          {" "}{copy("Incomplete types, including outside this list", "Типы с неполными данными, включая не показанные в списке", "סוגים עם נתונים חסרים, כולל מחוץ לרשימה")}: {data.incomplete_addon_rows ?? 0}.
        </p>}
      </>}
    </>}
    {reasonsShown !== undefined && data.reason_rows_total !== undefined && <p>{copy("Reasons shown", "Показано причин", "סיבות מוצגות")}: {reasonsShown} / {data.reason_rows_total}.</p>}
    {addonsShown !== undefined && data.addon_rows_total != null && <p>{copy("Add-on types shown", "Показано типов допработ", "סוגי תוספות מוצגים")}: {addonsShown} / {data.addon_rows_total}.</p>}
  </div>;
}
