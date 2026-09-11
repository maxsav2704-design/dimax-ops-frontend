import type { Locale } from "./i18n";

export function formatImportRowError(message: string, locale: Locale): string {
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  if (message.trim() === "door_type_id or door_type_code is required") {
    return copy(
      "Door type not identified: check the type code in the file or select a default door type",
      "Тип двери не определён: проверьте код типа в файле или выберите тип по умолчанию",
      "סוג הדלת לא זוהה: בדוק את קוד הסוג בקובץ או בחר סוג דלת כברירת מחדל",
    );
  }
  const quantity = /^(?:invalid quantity|quantity out of range|quantity must be a finite whole number):\s*(.*)$/i.exec(message.trim());
  if (quantity) {
    return `${copy(
      "Quantity must be a whole number from 1 to 1000",
      "Количество должно быть целым числом от 1 до 1000",
      "הכמות חייבת להיות מספר שלם בין 1 ל-1000",
    )}: ${quantity[1]}`;
  }
  const price = /^(?:invalid price|price must be finite|price must be >= 0):\s*(.*)$/i.exec(message.trim());
  if (price) {
    return `${copy(
      "Enter a numeric price of 0 or greater",
      "Укажите цену числом не меньше 0",
      "יש להזין מחיר מספרי שאינו שלילי",
    )}: ${price[1]}`;
  }
  const missing = /^missing required row values:\s*(.+)$/i.exec(message.trim());
  if (!missing) return message;
  const fieldLabels: Record<string, string> = {
    house_number: copy("house", "дом", "בניין"),
    floor_label: copy("floor", "этаж", "קומה"),
    apartment_number: copy("apartment/location", "квартира/позиция", "דירה/מיקום"),
    door_marking: copy("door marking", "маркировка двери", "סימון דלת"),
    order_number: copy("order number", "номер заказа", "מספר הזמנה"),
  };
  const fields = missing[1].split(",").map((field) => field.trim()).filter(Boolean)
    .map((field) => fieldLabels[field] || field).join(", ");
  return `${copy(
    "Missing required values",
    "Не заполнены обязательные поля",
    "חסרים ערכי חובה",
  )}: ${fields}`;
}
