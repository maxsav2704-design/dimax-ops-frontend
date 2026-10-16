"use client";

import { useCopy, useI18n } from "@/lib/i18n";
import { formatImportRowError } from "@/lib/import-row-error";

/** Localized labels for import rows and mapping profiles (shared by the page and its import sections). */
export function useImportCopy() {
  const { locale } = useI18n();
  const copy = useCopy();
  const importRowErrorLabel = (message: string): string => formatImportRowError(message, locale);
  const importProfileLabel = (code: string, fallback = code) => {
    switch (code) {
      case "auto_v1":
        return copy("Auto detect", "Автоопределение", "זיהוי אוטומטי");
      case "factory_he_v1":
        return copy("Factory Hebrew", "Заводской файл на иврите", "קובץ מפעל בעברית");
      case "supplier_delivery_he_v1":
        return copy("Hebrew delivery report", "Отчёт поставки на иврите", "דוח אספקה בעברית");
      case "factory_ru_v1":
        return copy("Factory Russian", "Заводской файл на русском", "קובץ מפעל ברוסית");
      case "generic_en_v1":
        return copy("Generic English", "Универсальный файл на английском", "קובץ כללי באנגלית");
      default:
        return fallback;
    }
  };
  return { importRowErrorLabel, importProfileLabel };
}
