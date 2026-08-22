import { CatalogCrudPage } from "@/components/catalogs/CatalogCrudPage";
import { useI18n } from "@/lib/i18n";

export default function DoorTypesPage() {
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;

  return (
    <CatalogCrudPage
      title={copy("Door types", "Типы дверей", "סוגי דלתות")}
      eyebrow={copy("Catalog / door installation", "Справочник / монтаж дверей", "קטלוג / התקנת דלתות")}
      subtitle={copy(
        "Control the door categories used by imports, project allocation, installer rates and payroll.",
        "Управление типами дверей для импорта, распределения по объектам, расценок и начислений.",
        "ניהול סוגי הדלתות לייבוא, שיוך לפרויקטים, תעריפים וחישוב תשלומים.",
      )}
      purpose={copy(
        "Door types connect imported factory rows to installer pricing, project plan/fact reports, and the real door categories DIMAX installs on site.",
        "Типы связывают строки заводского файла с расценками монтажников, отчётами план/факт и фактическими категориями дверей на объекте.",
        "סוגי הדלתות מקשרים בין שורות קובץ המפעל, תעריפי המתקינים, דוחות תכנון מול ביצוע והדלתות המותקנות בפועל.",
      )}
      endpoint="/api/v1/admin/door-types"
      queryKey="door-types"
      entityLabel={copy("Door Type", "тип двери", "סוג דלת")}
    />
  );
}
