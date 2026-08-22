import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { messages, type Locale } from "@/lib/i18n";

const localeIndependentKeys = new Set([
  "landing.eyebrow",
  "landing.previewOpsRoute",
  "landing.previewReportsRoute",
  "landing.previewInstallerRoute",
  "landing.trustMetricQualityValue",
  "landing.trustMetricLocalesValue",
  "landing.trustMetricPreviewValue",
  "landing.readinessPreviewValue",
  "landing.readinessI18nValue",
  "login.admin",
  "journal.whatsapp",
  "projects.resultSummary",
]);

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
}

type InlineTranslation = {
  file: string;
  line: number;
  en: string;
  ru: string;
  he: string;
};

const localeFunctionNames = new Set(["copy", "lt", "tr", "text"]);
const localeIndependentInlineValues = new Set([
  "DD.MM.YYYY",
  "SKU",
  "D-1201",
  "12-04",
  "12",
  "dira",
  "AZ-5001",
  "service",
]);

function sourceFilesUnder(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(entryPath);
    return entry.name.endsWith(".tsx") ? [entryPath] : [];
  });
}

function inlineTranslations(): InlineTranslation[] {
  const files = [
    ...sourceFilesUnder(join(process.cwd(), "src", "views")),
    ...sourceFilesUnder(join(process.cwd(), "src", "components", "catalogs")),
  ];

  return files.flatMap((file) => {
    const sourceText = readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const translations: InlineTranslation[] = [];

    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        localeFunctionNames.has(node.expression.text) &&
        node.arguments.length >= 3
      ) {
        const values = node.arguments.slice(0, 3).map((argument) =>
          ts.isStringLiteralLike(argument) ? argument.text : null,
        );
        if (values.every((value): value is string => value !== null)) {
          translations.push({
            file,
            line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            en: values[0],
            ru: values[1],
            he: values[2],
          });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
    return translations;
  });
}

describe("admin translation catalog", () => {
  const englishKeys = Object.keys(messages.en).sort();

  it.each(["ru", "he"] satisfies Locale[])("keeps the %s catalog complete", (locale) => {
    expect(Object.keys(messages[locale]).sort()).toEqual(englishKeys);
  });

  it.each(["ru", "he"] satisfies Locale[])(
    "preserves interpolation parameters in the %s catalog",
    (locale) => {
      for (const key of englishKeys) {
        expect(placeholders(messages[locale][key]), key).toEqual(placeholders(messages.en[key]));
      }
    },
  );

  it.each(["ru", "he"] satisfies Locale[])(
    "does not silently fall back to English in the %s catalog",
    (locale) => {
      const untranslated = englishKeys.filter(
        (key) => messages[locale][key] === messages.en[key] && !localeIndependentKeys.has(key),
      );
      expect(untranslated).toEqual([]);
    },
  );

  it("does not mix Hebrew characters into Russian or Cyrillic into Hebrew", () => {
    expect(Object.values(messages.ru).filter((value) => /[\u0590-\u05ff]/.test(value))).toEqual([]);
    expect(Object.values(messages.he).filter((value) => /[А-Яа-яЁё]/.test(value))).toEqual([]);
  });

  it("keeps inline page translations complete and script-safe", () => {
    const errors = inlineTranslations().flatMap(({ file, line, en, ru, he }) => {
      const location = `${file}:${line}`;
      const translationErrors: string[] = [];

      if (/[\u0590-\u05ff]/.test(ru)) translationErrors.push(`${location}: Hebrew text in Russian value`);
      if (/[А-Яа-яЁё]/.test(he)) translationErrors.push(`${location}: Cyrillic text in Hebrew value`);
      if (placeholders(ru).join("|") !== placeholders(en).join("|")) {
        translationErrors.push(`${location}: Russian placeholders differ from English`);
      }
      if (placeholders(he).join("|") !== placeholders(en).join("|")) {
        translationErrors.push(`${location}: Hebrew placeholders differ from English`);
      }
      if (ru === en && !localeIndependentInlineValues.has(en)) {
        translationErrors.push(`${location}: Russian value falls back to English: ${en}`);
      }
      if (he === en && !localeIndependentInlineValues.has(en)) {
        translationErrors.push(`${location}: Hebrew value falls back to English: ${en}`);
      }

      return translationErrors;
    });

    expect(errors).toEqual([]);
  });
});
