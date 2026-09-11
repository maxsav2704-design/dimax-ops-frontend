import { describe, expect, it } from "vitest";
import { formatImportRowError } from "./import-row-error";

describe("import row error messages", () => {
  it.each([
    ["en", "Door type not identified: check the type code in the file or select a default door type"],
    ["ru", "Тип двери не определён: проверьте код типа в файле или выберите тип по умолчанию"],
    ["he", "סוג הדלת לא זוהה: בדוק את קוד הסוג בקובץ או בחר סוג דלת כברירת מחדל"],
  ] as const)("explains an unresolved door type in %s", (locale, expected) => {
    expect(formatImportRowError("door_type_id or door_type_code is required", locale)).toBe(expected);
  });

  it.each([
    ["en", "Quantity must be a whole number from 1 to 1000"],
    ["ru", "Количество должно быть целым числом от 1 до 1000"],
    ["he", "הכמות חייבת להיות מספר שלם בין 1 ל-1000"],
  ] as const)("explains all quantity errors in %s", (locale, label) => {
    for (const message of ["invalid quantity", "quantity out of range", "quantity must be a finite whole number"]) {
      expect(formatImportRowError(`${message}: 1.5`, locale)).toBe(`${label}: 1.5`);
    }
  });

  it.each([
    ["en", "Enter a numeric price of 0 or greater"],
    ["ru", "Укажите цену числом не меньше 0"],
    ["he", "יש להזין מחיר מספרי שאינו שלילי"],
  ] as const)("explains all price errors in %s", (locale, label) => {
    for (const message of ["invalid price", "price must be finite", "price must be >= 0"]) {
      expect(formatImportRowError(`${message}: -5`, locale)).toBe(`${label}: -5`);
    }
  });

  it.each([
    ["en", "Missing required values: floor, apartment/location"],
    ["ru", "Не заполнены обязательные поля: этаж, квартира/позиция"],
    ["he", "חסרים ערכי חובה: קומה, דירה/מיקום"],
  ] as const)("preserves missing-field translations in %s", (locale, expected) => {
    expect(formatImportRowError("missing required row values: floor_label, apartment_number", locale)).toBe(expected);
  });

  it("preserves unknown errors and source values", () => {
    expect(formatImportRowError("unrecognized source format", "ru")).toBe("unrecognized source format");
    expect(formatImportRowError("price must be finite: Infinity", "ru")).toBe("Укажите цену числом не меньше 0: Infinity");
  });
});
