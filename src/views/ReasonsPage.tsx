import { CatalogCrudPage } from "@/components/catalogs/CatalogCrudPage";
import { useI18n } from "@/lib/i18n";

export default function ReasonsPage() {
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;

  return (
    <CatalogCrudPage
      title={copy("Issue reasons", "Причины проблем", "סיבות לתקלות")}
      eyebrow={copy("Catalog / field control", "Справочник / контроль работ", "קטלוג / בקרת שטח")}
      subtitle={copy(
        "Maintain the reasons used when a door cannot be installed or a field problem needs classification.",
        "Управление причинами, по которым дверь не установлена или проблема на объекте требует классификации.",
        "ניהול הסיבות לכך שדלת לא הותקנה או שתקלה בשטח דורשת סיווג.",
      )}
      purpose={copy(
        "Reasons keep not-installed flows, installer reports, dispatcher follow-up and admin analytics consistent.",
        "Единые причины связывают отметки «не установлено», сообщения монтажников, контроль диспетчера и аналитику администратора.",
        "סיבות אחידות מקשרות בין סטטוס לא הותקן, דיווחי מתקינים, מעקב המוקד וניתוחי המנהל.",
      )}
      endpoint="/api/v1/admin/reasons"
      queryKey="reasons"
      entityLabel={copy("Reason", "причину", "סיבה")}
    />
  );
}
