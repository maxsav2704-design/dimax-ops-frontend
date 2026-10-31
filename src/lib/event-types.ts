import type { Locale } from "./locale";

// Calendar event types in the reader's language (office calendar and installer schedule share them).
export const EVENT_TYPE_LABELS = {
  installation: { en: "Installation", ru: "Установка", he: "התקנה" },
  delivery: { en: "Delivery", ru: "Доставка", he: "אספקה" },
  meeting: { en: "Meeting", ru: "Встреча", he: "פגישה" },
  consultation: { en: "Consultation", ru: "Консультация", he: "ייעוץ" },
  inspection: { en: "Inspection", ru: "Осмотр", he: "בדיקה" },
} as const;

export type CalendarEventType = keyof typeof EVENT_TYPE_LABELS;

/** A known type in the reader's language; an unknown code is shown as sent. */
export function eventTypeLabel(eventType: string, locale?: Locale): string {
  const labels = (EVENT_TYPE_LABELS as Record<string, { en: string; ru: string; he: string }>)[eventType];
  if (!labels) return eventType;
  return locale === "ru" ? labels.ru : locale === "he" ? labels.he : labels.en;
}
