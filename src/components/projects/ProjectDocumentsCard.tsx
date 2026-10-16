"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MetricRow, WidgetCard } from "@/components/dimax";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { apiDownload, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { Download, FileText, Play, RefreshCw } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";
import { downloadBlob, filenameFromDisposition } from "@/lib/download";
import { formatBytes } from "./document-shared";
import type { DocumentGenerationDTO, DocumentTemplateDTO } from "./document-shared";
import { formatDateTime } from "./shared";

type ProjectDocumentsCardProps = {
  projectId: string | null;
  canManage: boolean;
  templates: DocumentTemplateDTO[];
  loadingTemplates: boolean;
  templatesReady: boolean;
  documents: DocumentGenerationDTO[];
  loadingDocuments: boolean;
  onReloadDocuments: (projectId: string) => Promise<void>;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
};

// Projects → "Documents" card: template picker, manual note, generate and download of project documents. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function ProjectDocumentsCard({
  projectId,
  canManage,
  templates,
  loadingTemplates,
  templatesReady,
  documents,
  loadingDocuments,
  onReloadDocuments,
  onError,
  onNotice,
}: ProjectDocumentsCardProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = useCopy();
  const [selectedDocumentTemplateId, setSelectedDocumentTemplateId] =
    useState("");
  const [documentManualNote, setDocumentManualNote] = useState("");
  const [documentGenerating, setDocumentGenerating] = useState(false);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<
    string | null
  >(null);
  const activeDocumentTemplates = useMemo(
    () => templates.filter((template) => template.is_active),
    [templates],
  );
  const selectedDocumentTemplate = useMemo(
    () =>
      activeDocumentTemplates.find(
        (template) => template.id === selectedDocumentTemplateId,
      ) || null,
    [activeDocumentTemplates, selectedDocumentTemplateId],
  );
  useEffect(() => {
    if (
      selectedDocumentTemplateId &&
      activeDocumentTemplates.some(
        (template) => template.id === selectedDocumentTemplateId,
      )
    ) {
      return;
    }
    setSelectedDocumentTemplateId(activeDocumentTemplates[0]?.id || "");
  }, [activeDocumentTemplates, selectedDocumentTemplateId]);
  const handleGenerateProjectDocument = async () => {
    if (!canManage || !templatesReady) return;
    if (!projectId || !selectedDocumentTemplateId) {
      onError(
        copy(
          "Choose a document template before generating.",
          "Выберите шаблон документа перед генерацией.",
          "בחר תבנית מסמך לפני יצירה.",
        ),
      );
      return;
    }
    setDocumentGenerating(true);
    onError(null);
    try {
      const overrides = documentManualNote.trim()
        ? { "manual.note": documentManualNote.trim() }
        : {};
      const generated = await apiFetch<DocumentGenerationDTO>(
        `/api/v1/admin/documents/projects/${projectId}/render`,
        {
          method: "POST",
          body: JSON.stringify({
            template_id: selectedDocumentTemplateId,
            overrides,
          }),
        },
      );
      setDocumentManualNote("");
      await onReloadDocuments(projectId);
      onNotice(
        copy(
          `Document generated: ${generated.file_name}`,
          `Документ создан: ${generated.file_name}`,
          `המסמך נוצר: ${generated.file_name}`,
        ),
      );
    } catch (e) {
      onError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to generate project document.",
            "Не удалось создать документ объекта.",
            "יצירת מסמך הפרויקט נכשלה.",
          ),
        ),
      );
    } finally {
      setDocumentGenerating(false);
    }
  };
  const handleDownloadProjectDocument = async (
    generation: DocumentGenerationDTO,
  ) => {
    setDownloadingDocumentId(generation.id);
    onError(null);
    try {
      const response = await apiDownload(generation.download_url, {
        method: "GET",
        credentials: "include",
      });
      const blob = await response.blob();
      downloadBlob(
        blob,
        filenameFromDisposition(
          response.headers.get("content-disposition"),
          generation.file_name,
        ),
      );
    } catch (e) {
      onError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to download project document.",
            "Не удалось скачать документ объекта.",
            "הורדת מסמך הפרויקט נכשלה.",
          ),
        ),
      );
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  return (
    <WidgetCard
      id="project-documents"
      title={copy(
        "Project documents",
        "Документы объекта",
        "מסמכי פרויקט",
      )}
      headerMeta={copy(
        "Generate paperwork from current object data",
        "Документы из текущих данных объекта",
        "מסמכים מנתוני הפרויקט הנוכחיים",
      )}
      actionSlot={
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2"
          onClick={() => router.push("/documents")}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {copy(
            "Document center",
            "Центр документов",
            "מרכז מסמכים",
          )}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="max-w-2xl">
          <h3 className="text-[15px] font-semibold leading-tight text-text">
            {copy(
              "Generate paperwork from the current object data.",
              "Создавайте документы из текущих данных объекта.",
              "צור מסמכים מנתוני הפרויקט הנוכחיים.",
            )}
          </h3>
          <p className="mt-2 text-[12px] leading-6 text-text-secondary">
            {copy(
              "Templates are managed in the document center. Generated files stay linked to this project.",
              "Шаблоны управляются в центре документов. Созданные файлы остаются привязанными к этому объекту.",
              "התבניות מנוהלות במרכז המסמכים. קבצים שנוצרו נשארים משויכים לפרויקט הזה.",
            )}
          </p>
        </div>

      <div className="-mx-4 border-y border-border-subtle bg-surface">
        <MetricRow
          label={copy(
            "Active templates",
            "Активные шаблоны",
            "תבניות פעילות",
          )}
          value={
            loadingTemplates
              ? "-"
              : activeDocumentTemplates.length
          }
          barColor="blue"
          withSeparator={false}
        />
        <MetricRow
          label={copy(
            "Generated files",
            "Созданные файлы",
            "קבצים שנוצרו",
          )}
          value={
            loadingDocuments ? "-" : documents.length
          }
          barColor="green"
        />
        <MetricRow
          label={copy(
            "Selected template",
            "Выбранный шаблон",
            "תבנית נבחרת",
          )}
          value={selectedDocumentTemplate?.name || "-"}
          barColor="yellow"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-lg border border-border bg-surface-subtle p-3">
          <div className="grid gap-3">
            <div className="field-stack">
              <Label htmlFor="project-document-template">
                {copy("Template", "Шаблон", "תבנית")}
              </Label>
              <select
                id="project-document-template"
                value={selectedDocumentTemplateId}
                onChange={(event) =>
                  setSelectedDocumentTemplateId(event.target.value)
                }
                className="control-input"
              >
                <option value="">
                  {copy(
                    "Select template",
                    "Выберите шаблон",
                    "בחר תבנית",
                  )}
                </option>
                {activeDocumentTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedDocumentTemplate ? (
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-text-secondary">
                <div className="font-medium text-text">
                  {selectedDocumentTemplate.source_filename}
                </div>
                <div className="mt-1">
                  {formatBytes(selectedDocumentTemplate.size_bytes)}{" "}
                  - {selectedDocumentTemplate.placeholders.length}{" "}
                  {copy("placeholders", "заполнители", "מצייני מקום")}
                </div>
              </div>
            ) : null}

            <div className="field-stack">
              <Label htmlFor="project-document-note">
                {copy(
                  "Manual note",
                  "Ручная заметка",
                  "הערה ידנית",
                )}
              </Label>
              <textarea
                id="project-document-note"
                value={documentManualNote}
                onChange={(event) =>
                  setDocumentManualNote(event.target.value)
                }
                rows={3}
                className="control-textarea min-h-[88px]"
                placeholder="manual.note"
              />
            </div>

            <Button
              type="button"
              className="h-10 gap-2"
              disabled={
                !canManage ||
                !projectId ||
                !selectedDocumentTemplateId ||
                !templatesReady ||
                documentGenerating
              }
              onClick={() => void handleGenerateProjectDocument()}
            >
              {documentGenerating ? (
                <RefreshCw
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {copy(
                "Generate document",
                "Создать документ",
                "צור מסמך",
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-subtle p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-text">
              {copy(
                "Generated for this project",
                "Создано для этого объекта",
                "נוצר לפרויקט הזה",
              )}
            </h4>
            <button
              type="button"
              className="dmx-secondary-action h-8 px-2.5"
              onClick={() =>
                projectId &&
                void onReloadDocuments(projectId)
              }
            >
              <RefreshCw
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface">
            {loadingDocuments ? (
              <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                {copy(
                  "Loading documents...",
                  "Загружаем документы...",
                  "טוען מסמכים...",
                )}
              </div>
            ) : documents.length === 0 ? (
              <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                {copy(
                  "No generated documents for this project yet.",
                  "Для этого объекта пока нет созданных документов.",
                  "עדיין אין מסמכים שנוצרו לפרויקט הזה.",
                )}
              </div>
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-start justify-between gap-3 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-text">
                      {document.file_name}
                    </div>
                    <div className="mt-1 truncate text-[12px] text-text-secondary">
                      {document.template_name ||
                        selectedDocumentTemplate?.name ||
                        "-"}
                    </div>
                    <div className="mt-1 text-[11px] text-text-secondary">
                      {formatBytes(document.size_bytes)} -{" "}
                      {formatDateTime(document.created_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dmx-secondary-action h-8 shrink-0 px-2.5"
                    onClick={() =>
                      void handleDownloadProjectDocument(document)
                    }
                    disabled={downloadingDocumentId === document.id}
                    aria-label={`${copy("Download", "Скачать", "הורד")} ${document.file_name}`}
                  >
                    {downloadingDocumentId === document.id ? (
                      <RefreshCw
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Download
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </WidgetCard>
  );
}
