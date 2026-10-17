"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { WidgetCard } from "@/components/dimax";
import { Button } from "@/components/ui/button";
import { apiDownload, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";
import { downloadBlob, filenameFromDisposition } from "@/lib/download";

import { useImportCopy } from "./import-copy";
import { downloadImportErrorsCsv, safeDownloadFilename } from "./import-download";
import type { DoorType, ImportColumnsDiagnostics, ImportMappingProfilesResponse, ImportResult } from "./import-types";

type DoorImportWizardProps = {
  /** Selected project; the upload posts to its import endpoint. */
  projectId: string | null;
  canManage: boolean;
  canViewRates: boolean;
  /** Door-types catalog (default door type select). */
  doorTypes: DoorType[];
  loadingDoorTypes: boolean;
  doorTypesReady: boolean;
  mappingProfilesQuery: UseQueryResult<ImportMappingProfilesResponse>;
  /** Last analyze/import result: shared with the retry flow and reset on project change, so the page owns it. */
  importResult: ImportResult | null;
  analysisReady: boolean;
  onImportResultChange: (result: ImportResult | null) => void;
  onAnalysisReadyChange: (ready: boolean) => void;
  /** Page-level error notice. */
  onError: (message: string | null) => void;
  /** After a successful analyze: the page reloads the import history. */
  onAnalyzed: (projectId: string) => Promise<void>;
  /** After a successful import: the page reloads details, layout, plan/fact, risk and history. */
  onImported: (projectId: string) => Promise<void>;
  /** Structure preview table, shared with the import-run details (still rendered by the page). */
  renderPreviewGroups: (diagnostics?: ImportColumnsDiagnostics | null, title?: string) => ReactNode;
  /** Import history and run details, rendered inside the same card (split step 3 moves them). */
  children?: ReactNode;
};

// Projects → "Import factory file" card: file + mapping profile + options,
// analyze / import actions and the result panel. Moved verbatim from
// ProjectsPage (monolith split, Projects step 2).
export function DoorImportWizard({
  projectId,
  canManage,
  canViewRates,
  doorTypes,
  loadingDoorTypes,
  doorTypesReady,
  mappingProfilesQuery,
  importResult,
  analysisReady,
  onImportResultChange,
  onAnalysisReadyChange,
  onError,
  onAnalyzed,
  onImported,
  renderPreviewGroups,
  children,
}: DoorImportWizardProps) {
  const { locale, t } = useI18n();
  const copy = useCopy();
  const { importRowErrorLabel, importProfileLabel } = useImportCopy();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [defaultDoorTypeId, setDefaultDoorTypeId] = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [mappingProfile, setMappingProfile] = useState("auto_v1");
  const [createMissingDoorTypes, setCreateMissingDoorTypes] = useState(true);
  const [downloadingImportTemplate, setDownloadingImportTemplate] =
    useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importAction, setImportAction] = useState<"analyze" | "import" | null>(
    null,
  );
  const [allowPartialImport, setAllowPartialImport] = useState(false);
  const mappingProfiles = useMemo(
    () => (Array.isArray(mappingProfilesQuery.data?.items) ? mappingProfilesQuery.data.items : []),
    [mappingProfilesQuery.data],
  );
  const loadingMappingProfiles = mappingProfilesQuery.isFetching;
  // Keep the chosen mapping profile valid for the loaded catalog (was inside the loader).
  useEffect(() => {
    if (mappingProfilesQuery.isError) {
      setMappingProfile("auto_v1");
      return;
    }
    const response = mappingProfilesQuery.data;
    if (!response) return;
    const items = Array.isArray(response.items) ? response.items : [];
    setMappingProfile((currentProfile) => {
      if (response.default_code && items.some((item) => item.code === response.default_code)) {
        return response.default_code;
      }
      if (items.length > 0 && !items.some((item) => item.code === currentProfile)) {
        return items[0].code;
      }
      return currentProfile;
    });
  }, [mappingProfilesQuery.data, mappingProfilesQuery.isError]);
  const importAnalyzeErrorsCount =
    importResult?.mode === "analyze" ? importResult.errors.length : 0;
  const importBlockedByRowErrors =
    importAnalyzeErrorsCount > 0 && !allowPartialImport;

  const handleDownloadImportTemplate = async () => {
    if (!canManage) return;
    setDownloadingImportTemplate(true);
    onError(null);
    try {
      const params = new URLSearchParams({
        mapping_profile: mappingProfile || "auto_v1",
      });
      const response = await apiDownload(
        `/api/v1/admin/projects/doors/import-template.xlsx?${params.toString()}`,
      );
      const blob = await response.blob();
      downloadBlob(
        blob,
        filenameFromDisposition(
          response.headers.get("content-disposition"),
          `dimax-door-import-template-${mappingProfile || "auto_v1"}.xlsx`,
        ),
      );
    } catch (e) {
      onError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to download import template.",
            "Не удалось скачать шаблон импорта.",
            "הורדת תבנית הייבוא נכשלה.",
          ),
        ),
      );
    } finally {
      setDownloadingImportTemplate(false);
    }
  };
  const handleImportAction = async (mode: "analyze" | "import") => {
    if (!canManage || !projectId || !importFile) {
      return;
    }
    setImportLoading(true);
    setImportAction(mode);
    onError(null);
    if (mode === "analyze") {
      setAllowPartialImport(false);
      onImportResultChange(null);
    }
    try {
      const body = new FormData();
      body.append("file", importFile);
      body.append("default_our_price", "0");
      body.append("create_missing_door_types", String(createMissingDoorTypes));
      body.append("analyze_only", mode === "analyze" ? "true" : "false");
      body.append(
        "allow_partial_import",
        mode === "import" && allowPartialImport ? "true" : "false",
      );
      body.append("mapping_profile", mappingProfile);
      if (defaultDoorTypeId.trim()) {
        body.append("default_door_type_id", defaultDoorTypeId.trim());
      }
      if (delimiter) {
        body.append("delimiter", delimiter);
      }

      const response = await apiFetch<ImportResult>(
        `/api/v1/admin/projects/${projectId}/doors/import-upload`,
        {
          method: "POST",
          body,
        },
      );
      onImportResultChange(response);
      if (mode === "analyze") {
        onAnalysisReadyChange(response.mode === "analyze");
        await onAnalyzed(projectId);
      } else {
        onAnalysisReadyChange(false);
        setAllowPartialImport(false);
        await onImported(projectId);
      }
    } catch (e) {
      onError(readableApiError(e, locale, t("projects.failedImportFile")));
    } finally {
      setImportLoading(false);
      setImportAction(null);
    }
  };

  return (
    <WidgetCard
      id="project-door-import"
      title={t("projects.importFactoryFile")}
      titleAccessory={
        <Upload className="h-4 w-4 text-text-secondary" aria-hidden="true" />
      }
      headerMeta={t("projects.acceptedFormats")}
      actionSlot={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleDownloadImportTemplate()}
          disabled={!canManage || downloadingImportTemplate}
          className="h-8 w-full justify-center px-2 text-[12px] sm:w-auto"
        >
          <Download
            className="me-1.5 h-3.5 w-3.5"
            aria-hidden="true"
          />
          {downloadingImportTemplate
            ? copy("Downloading...", "Скачивание...", "מוריד...")
            : copy(
                "Download Excel template",
                "Скачать Excel-шаблон",
                "הורד תבנית Excel",
              )}
        </Button>
      }
    >
      <p className="text-[12px] text-text-secondary">
        {copy(
          "Priority columns: order, building, floor, apartment, door model",
          "Основные столбцы: заказ, дом, этаж, квартира, модель двери",
          "עמודות עיקריות: הזמנה, בניין, קומה, דירה, דגם דלת",
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="relative flex h-10 min-w-0 basis-52 grow cursor-pointer items-center rounded-lg border border-dashed border-border bg-surface px-3 text-[13px] text-text-secondary transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-accent/35">
          <FileSpreadsheet
            className="w-4 h-4 me-2 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">
            {importFile
              ? importFile.name
              : t("projects.chooseFile")}
          </span>
          <input
            type="file"
            disabled={!canManage}
            aria-label={t("projects.chooseFile")}
            className="sr-only"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] || null);
              onAnalysisReadyChange(false);
              setAllowPartialImport(false);
              onImportResultChange(null);
            }}
            accept=".csv,.txt,.tsv,.json,.xml,.xlsx,.pdf"
          />
        </label>
        <select
          aria-label={t("projects.autoByFileCode")}
          disabled={!doorTypesReady}
          value={defaultDoorTypeId}
          onChange={(e) => {
            setDefaultDoorTypeId(e.target.value);
            onAnalysisReadyChange(false);
            setAllowPartialImport(false);
          }}
          className="control-input min-w-0 basis-64 grow"
        >
          <option value="">
            {loadingDoorTypes
              ? t("projects.loadingDoorTypes")
              : t("projects.autoByFileCode")}
          </option>
          {doorTypes.filter((doorType) => doorType.is_active).map((doorType) => (
            <option key={doorType.id} value={doorType.id}>
              {doorType.code} - {doorType.name}
            </option>
          ))}
        </select>
        <div className="grid min-w-0 basis-72 grow grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleImportAction("analyze")}
            disabled={!canManage || !importFile || importLoading}
            className="h-10 min-w-0 px-2"
          >
            {importLoading && importAction === "analyze"
              ? t("projects.analyzing")
              : t("projects.analyze")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleImportAction("import")}
            disabled={
              !canManage ||
              !importFile ||
              importLoading ||
              !analysisReady ||
              importBlockedByRowErrors
            }
            className="h-10 min-w-0 px-2"
          >
            {importLoading && importAction === "import"
              ? t("projects.importing")
              : t("projects.import")}
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <select
          aria-label={t("projects.mappingProfileAuto")}
          value={mappingProfile}
          onChange={(e) => {
            setMappingProfile(e.target.value);
            onAnalysisReadyChange(false);
            setAllowPartialImport(false);
          }}
          className="control-input h-9 min-w-0 basis-52 grow text-[12px]"
        >
          {loadingMappingProfiles ? (
            <option value="auto_v1">
              {t("projects.mappingProfileLoading")}
            </option>
          ) : null}
          {!loadingMappingProfiles &&
          mappingProfiles.length === 0 ? (
            <option value="auto_v1">
              {t("projects.mappingProfileAuto")}
            </option>
          ) : null}
          {mappingProfiles.map((profile) => (
            <option key={profile.code} value={profile.code}>
              {importProfileLabel(profile.code, profile.name)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("projects.delimiterAuto")}
          value={delimiter}
          onChange={(e) => {
            setDelimiter(e.target.value);
            onAnalysisReadyChange(false);
            setAllowPartialImport(false);
          }}
          className="control-input h-9 min-w-0 basis-52 grow text-[12px]"
        >
          <option value="">{t("projects.delimiterAuto")}</option>
          <option value=",">{t("projects.delimiterComma")}</option>
          <option value=";">
            {t("projects.delimiterSemicolon")}
          </option>
          <option value="|">{t("projects.delimiterPipe")}</option>
          <option value={"\t"}>{t("projects.delimiterTab")}</option>
        </select>
        <label className="checkbox-row min-h-9 min-w-0 basis-72 grow rounded-lg border border-border bg-surface px-3 py-2">
          <input
            type="checkbox"
            checked={createMissingDoorTypes}
            className="shrink-0"
            onChange={(e) => {
              setCreateMissingDoorTypes(e.target.checked);
              onAnalysisReadyChange(false);
              setAllowPartialImport(false);
            }}
          />
          {t("projects.createMissingDoorTypes")}
        </label>
      </div>

      {importResult && (
        <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px]">
          <div className="flex items-center gap-1.5 text-status-ok-fg">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            {t("projects.parsedPreparedImportedSkipped")
              .replace("{parsed}", String(importResult.parsed_rows))
              .replace(
                "{prepared}",
                String(importResult.prepared_rows),
              )
              .replace("{imported}", String(importResult.imported))
              .replace("{skipped}", String(importResult.skipped))}
          </div>
          {typeof importResult.would_import === "number" &&
          typeof importResult.would_skip === "number" ? (
            <div className="mt-1 text-text-secondary">
              {t("projects.preflightResult")
                .replace(
                  "{mode}",
                  importResult.mode === "analyze"
                    ? t("projects.preflight")
                    : t("projects.result"),
                )
                .replace(
                  "{wouldImport}",
                  String(importResult.would_import),
                )
                .replace(
                  "{wouldSkip}",
                  String(importResult.would_skip),
                )}
            </div>
          ) : null}
          {importResult.mode === "analyze" &&
          importAnalyzeErrorsCount === 0 ? (
            <div className="mt-1 text-text-secondary">
              {t("projects.analyzeCompleted")}
            </div>
          ) : null}
          {importResult.mode === "analyze" &&
          importAnalyzeErrorsCount > 0 ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-status-problem-border bg-status-problem-bg px-2 py-1.5 text-status-problem-fg">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div>
                <div className="font-semibold">
                  {copy(
                    "Analyze found row errors",
                    "Анализ нашёл ошибки в строках",
                    "הניתוח מצא שגיאות בשורות",
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-text-secondary">
                  {copy(
                    "Fix the file and analyze again, or explicitly allow partial import of valid rows.",
                    "Исправьте файл и повторите анализ либо явно разрешите частичный импорт корректных строк.",
                    "תקן את הקובץ ונתח שוב, או אשר במפורש יבוא חלקי של שורות תקינות.",
                  )}
                </div>
              </div>
            </div>
          ) : null}
          {importResult.idempotency_hit ? (
            <div className="mt-1 text-text-secondary">
              {t("projects.idempotencyHit")}
            </div>
          ) : null}
          {importResult.diagnostics?.mapping_profile ? (
            <div className="mt-1 text-text-secondary">
              {t("projects.mappingProfileValue").replace(
                "{value}",
                importProfileLabel(
                  importResult.diagnostics.mapping_profile,
                ),
              )}
            </div>
          ) : null}
          {importResult.diagnostics?.strict_required_fields !==
            undefined &&
          importResult.diagnostics?.strict_required_fields !==
            null ? (
            <div className="mt-1 text-text-secondary">
              {t("projects.strictRequiredFields").replace(
                "{value}",
                importResult.diagnostics.strict_required_fields
                  ? t("projects.on")
                  : t("projects.off"),
              )}
            </div>
          ) : null}
          {importResult.diagnostics?.missing_required_fields
            ?.length ? (
            <div className="mt-1 text-status-problem-fg">
              {t("projects.missingRequiredFields").replace(
                "{fields}",
                importResult.diagnostics.missing_required_fields.join(
                  ", ",
                ),
              )}
            </div>
          ) : null}
          {importResult.diagnostics?.data_summary ? (
            <div className="mt-2">
              <div className="text-text-secondary">
                {t("projects.importDataSummary")}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[
                  {
                    label: t("projects.orders"),
                    value:
                      importResult.diagnostics.data_summary
                        .unique_order_numbers,
                  },
                  {
                    label: t("projects.houses"),
                    value:
                      importResult.diagnostics.data_summary
                        .unique_houses,
                  },
                  {
                    label: t("projects.floors"),
                    value:
                      importResult.diagnostics.data_summary
                        .unique_floors,
                  },
                  {
                    label: t("projects.apartments"),
                    value:
                      importResult.diagnostics.data_summary
                        .unique_apartments,
                  },
                  {
                    label: t("projects.locations"),
                    value:
                      importResult.diagnostics.data_summary
                        .unique_locations,
                  },
                  {
                    label: t("projects.markings"),
                    value:
                      importResult.diagnostics.data_summary
                        .unique_markings,
                  },
                  {
                    label: t("projects.rowErrors"),
                    value:
                      importResult.diagnostics.data_summary
                        .rows_with_errors,
                  },
                  {
                    label: t("projects.duplicateRows"),
                    value:
                      importResult.diagnostics.data_summary
                        .duplicate_rows_skipped,
                  },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-text"
                  >
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {canViewRates &&
          (importResult.diagnostics?.data_summary
            ?.zero_price_doors || 0) > 0 ? (
            <div className="mt-2 rounded-lg border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-status-warning-fg">
              {copy(
                "Zero client price doors: {count}. Check the source price column or default client price before importing.",
                "Двери с нулевой ценой клиента: {count}. Проверьте колонку цены в файле или цену клиента по умолчанию перед импортом.",
                "דלתות עם מחיר לקוח אפס: {count}. בדוק את עמודת המחיר בקובץ או מחיר ברירת מחדל לפני הייבוא.",
              ).replace(
                "{count}",
                String(
                  importResult.diagnostics?.data_summary
                    ?.zero_price_doors || 0,
                ),
              )}
            </div>
          ) : null}
          {renderPreviewGroups(importResult.diagnostics)}
          {importResult.diagnostics?.required_fields?.length ? (
            <div className="mt-2">
              <div className="text-text-secondary">
                {t("projects.requiredColumnsStatus")}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {importResult.diagnostics.required_fields.map(
                  (field) => (
                    <span
                      key={field.field_key}
                      className={cn(
                        "rounded-full border px-2.5 py-1",
                        field.found
                          ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
                          : "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
                      )}
                      title={
                        field.matched_columns.length > 0
                          ? `Matched: ${field.matched_columns.join(", ")}`
                          : t("projects.notDetected")
                      }
                    >
                      {field.display_name}:{" "}
                      {field.found
                        ? t("projects.found")
                        : t("projects.missing")}
                    </span>
                  ),
                )}
              </div>
            </div>
          ) : null}
          {importResult.errors.length > 0 && (
            <div className="mt-2 rounded-lg border border-status-problem-border bg-status-problem-bg p-2 text-status-problem-fg">
              {importResult.mode === "analyze" ? (
                <div className="mb-2 rounded-md border border-status-problem-border bg-surface px-2 py-1.5 text-text">
                  <label className="checkbox-row text-[12px]">
                    <input
                      type="checkbox"
                      checked={allowPartialImport}
                      onChange={(event) =>
                        setAllowPartialImport(event.target.checked)
                      }
                    />
                    {copy(
                      "Allow partial import of valid rows",
                      "Разрешить частичный импорт корректных строк",
                      "אפשר יבוא חלקי של שורות תקינות",
                    )}
                  </label>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {copy(
                      "Rows with errors will not create doors.",
                      "Строки с ошибками не создадут двери.",
                      "שורות עם שגיאות לא ייצרו דלתות.",
                    )}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {t("projects.errorsPreviewInline").replace(
                    "{value}",
                      importResult.errors
                        .slice(0, 5)
                        .map(
                          (e) =>
                            `#${e.row} ${importRowErrorLabel(e.message)}`,
                        )
                        .join(" | "),
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadImportErrorsCsv(
                      importResult.errors,
                      `dimax-import-errors-${safeDownloadFilename(importFile?.name || "current-file")}.csv`,
                    )
                  }
                  className="h-7 w-full justify-center border-status-problem-border bg-surface px-2 text-[11px] text-status-problem-fg sm:w-auto"
                >
                  <Download
                    className="me-1.5 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  {copy(
                    "Download error report",
                    "Скачать отчёт ошибок",
                    "הורד דוח שגיאות",
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {children}
    </WidgetCard>
  );
}
