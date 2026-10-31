import type { Locale } from "./locale";
import { formatStatusLabel, normalizeStatus } from "./status-tokens";

// One place for the people-facing names of the server's status codes (RU/EN/HE).
// The same code can mean different things in different places: a project "ACTIVE" is in progress,
// an installer "ACTIVE" is available; a project health "BLOCKED" means it has open problems, not that work is locked.
export type StatusLabelDomain = "generic" | "project" | "health" | "door" | "issue" | "installer" | "journal" | "import" | "delivery";

type Triple = readonly [en: string, ru: string, he: string];

const GENERIC: Record<string, Triple> = {
  OK: ["OK", "Норма", "תקין"],
  PROBLEM: ["Problem", "Проблема", "בעיה"],
  SUCCESS: ["Success", "Успешно", "הצליח"],
  FAILED: ["Failed", "Ошибка", "נכשל"],
  PARTIAL: ["Partial", "Частично", "חלקי"],
  ANALYZED: ["Analyzed", "Проанализировано", "נותח"],
  OPEN: ["Open", "Открыто", "פתוח"],
  CLOSED: ["Closed", "Закрыто", "סגור"],
  BLOCKED: ["Blocked", "Заблокировано", "חסום"],
  LOCKED: ["Locked", "Закрыто для изменений", "נעול"],
  READY: ["Ready", "Готово", "מוכן"],
  DONE: ["Done", "Выполнено", "בוצע"],
  DANGER: ["Danger", "Опасно", "סכנה"],
  WARN: ["At risk", "Риск", "אזהרה"],
  AT_RISK: ["At risk", "Под риском", "בסיכון"],
  UNASSIGNED: ["Unassigned", "Не назначено", "לא משויך"],
  NORMAL: ["Normal", "Норма", "תקין"],
  PLANNED: ["Planned", "Запланирован", "מתוכנן"],
  ACTIVE: ["Active", "Активно", "פעיל"],
  ON_HOLD: ["On hold", "На паузе", "בהמתנה"],
  COMPLETED: ["Completed", "Завершён", "הושלם"],
  CANCELLED: ["Cancelled", "Отменено", "בוטל"],
  NOT_INSTALLED: ["Not installed", "Не установлено", "לא הותקן"],
  IN_PROGRESS: ["In progress", "В работе", "בעבודה"],
  INSTALLED: ["Installed", "Установлено", "הותקן"],
  ISSUE_OPEN: ["Open issue", "Есть проблема", "בעיה פתוחה"],
  NEW: ["New", "Новое", "חדש"],
  TRIAGED: ["Triaged", "Разобрано", "מוין"],
  RESOLVED: ["Resolved", "Решено", "נפתר"],
  PENDING: ["Pending", "Ожидает", "ממתין"],
  SENT: ["Sent", "Отправлено", "נשלח"],
  DELIVERED: ["Delivered", "Доставлено", "נמסר"],
  DRAFT: ["Draft", "Черновик", "טיוטה"],
  ARCHIVED: ["Archived", "В архиве", "בארכיון"],
  BUSY: ["Busy", "Занят", "עסוק"],
  INACTIVE: ["Inactive", "Неактивен", "לא פעיל"],
  NEEDS_PROJECT: ["Needs a project", "Нужен объект", "נדרש פרויקט"],
  IMPORTED: ["Imported", "Импортировано", "יובא"],
  DISMISSED: ["Dismissed", "Отклонено", "נדחה"],
  NONE: ["Not sent", "Не отправлялось", "לא נשלח"],
};

const BY_DOMAIN: Partial<Record<StatusLabelDomain, Record<string, Triple>>> = {
  project: { ACTIVE: ["In progress", "В работе", "בעבודה"] },
  // Health is derived from open issues and overdue work; "BLOCKED" there means open problems on the site.
  health: { BLOCKED: ["Open problems", "Есть открытые проблемы", "יש בעיות פתוחות"], AT_RISK: ["At risk", "Под риском", "בסיכון"] },
  door: { LOCKED: ["Locked", "Закрыто для изменений", "נעול"] },
  installer: { ACTIVE: ["Available", "Доступен", "זמין"] },
  journal: { ACTIVE: ["Awaiting signature", "Ждёт подписи", "ממתין לחתימה"], ARCHIVED: ["Signed", "Подписан", "נחתם"] },
};

export function statusLabel(status: string | null | undefined, locale: Locale, domain: StatusLabelDomain = "generic"): string {
  const code = normalizeStatus(status);
  if (!code) return "-";
  const triple = BY_DOMAIN[domain]?.[code] ?? GENERIC[code];
  if (!triple) return formatStatusLabel(code);
  return triple[locale === "ru" ? 1 : locale === "he" ? 2 : 0];
}
