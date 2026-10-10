const en = {
  open: "Apply confirmed prices", title: "Activate company price list", current: "Currently effective",
  legacy: "Individual legacy rates", candidate: "New version", reason: "Transition reason", review: "Items to review",
  policy: "The server records the start time for all projects. Work uses the price effective when it was performed. Recorded earnings are not recalculated.",
  legacyPolicy: "Old offline work without a price version uses the first confirmed list, not a later amendment. Work without a matching price requires a separate resolution.",
  consent: "I reviewed the rate differences and pending work and approve this company-wide transition.",
  submit: "Activate for all projects", loading: "Checking factory decision and price coverage", saving: "Activating prices",
  blocked: "Activation is blocked. Resolve the items below and check again.", already: "This version is already effective or has been replaced.",
  error: "Could not check the transition. Prices have not been submitted.", denied: "You cannot activate prices.",
  conflict: "The active version or application conditions changed. Close and review the latest data.",
  unknown: "The activation result is unknown. Close and check the effective version before taking another action. Do not repeat blindly.",
  failed: "The server rejected activation. Check the reason and review again.",
  success: "Price activation recorded", effective: "Effective from", close: "Close", refresh: "Check again",
};
type ActivationCopy = { [K in keyof typeof en]: string };
const ru: ActivationCopy = {
  open: "Применить подтверждённые цены", title: "Ввести прайс компании в действие", current: "Сейчас действует",
  legacy: "Индивидуальные старые ставки", candidate: "Новая версия", reason: "Причина перехода", review: "Требует проверки",
  policy: "Сервер зафиксирует начало действия для всех объектов. Работа оплачивается по цене на момент выполнения. Сохранённые начисления не пересчитываются.",
  legacyPolicy: "Старые офлайн-работы без версии цены оплачиваются по первому подтверждённому прайсу, а не по последующему. Работы без подходящей цены требуют отдельного решения.",
  consent: "Я проверил расхождения ставок и ожидающие работы и подтверждаю переход всей компании.",
  submit: "Ввести в действие для всех объектов", loading: "Проверяем решение завода и полноту цен", saving: "Вводим цены в действие",
  blocked: "Переход заблокирован. Устраните замечания ниже и повторите проверку.", already: "Эта версия уже действует или заменена более новой.",
  error: "Не удалось проверить переход. Запрос на активацию не отправлен.", denied: "Нет права вводить цены в действие.",
  conflict: "Действующая версия или условия применения изменились. Закройте окно и проверьте свежие данные.",
  unknown: "Результат активации неизвестен. Закройте окно и проверьте действующую версию перед следующим действием. Не повторяйте запрос вслепую.",
  failed: "Сервер отклонил активацию. Проверьте причину и повторите проверку.",
  success: "Ввод прайса в действие зафиксирован", effective: "Действует с", close: "Закрыть", refresh: "Проверить снова",
};
const he: ActivationCopy = {
  open: "החלת מחירים מאושרים", title: "הפעלת מחירון החברה", current: "בתוקף כעת",
  legacy: "תעריפים אישיים קודמים", candidate: "גרסה חדשה", reason: "סיבת המעבר", review: "נושאים לבדיקה",
  policy: "השרת ירשום את תחילת התוקף לכל הפרויקטים. העבודה תחושב לפי המחיר שהיה בתוקף בעת ביצועה. תשלומים שנרשמו לא יחושבו מחדש.",
  legacyPolicy: "עבודות ישנות בתור הלא מקוון ללא גרסת מחיר יחושבו לפי המחירון המאושר הראשון, ולא לפי עדכון מאוחר יותר. עבודה ללא מחיר מתאים דורשת החלטה נפרדת.",
  consent: "בדקתי את פערי התעריפים והעבודות הממתינות ואני מאשר את המעבר לכל החברה.",
  submit: "הפעלה לכל הפרויקטים", loading: "בדיקת אישור המפעל וכיסוי המחירים", saving: "הפעלת מחירים",
  blocked: "המעבר חסום. יש לטפל בנושאים הבאים ולבדוק שוב.", already: "גרסה זו כבר בתוקף או הוחלפה בגרסה חדשה יותר.",
  error: "לא ניתן לבדוק את המעבר. בקשת הפעלה לא נשלחה.", denied: "אין הרשאה להפעיל מחירים.",
  conflict: "הגרסה בתוקף או תנאי ההחלה השתנו. יש לסגור ולבדוק את הנתונים המעודכנים.",
  unknown: "תוצאת ההפעלה אינה ידועה. יש לסגור ולבדוק את הגרסה בתוקף לפני פעולה נוספת. אין לחזור על הבקשה ללא בדיקה.",
  failed: "השרת דחה את ההפעלה. יש לבדוק את הסיבה ולבצע בדיקה חוזרת.",
  success: "הפעלת המחירון נרשמה", effective: "בתוקף החל מ", close: "סגירה", refresh: "בדיקה חוזרת",
};
export const activationCopy = { en, ru, he };
