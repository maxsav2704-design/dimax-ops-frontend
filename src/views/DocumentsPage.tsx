"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  CheckCheck,
  Download,
  FileText,
  Loader2,
  Play,
  RotateCcw,
  Search,
  UploadCloud,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import {
  KpiCard as DimaxKpiCard,
  WidgetCard,
} from "@/components/dimax";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiDownload, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DocumentTemplateDTO = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entity_scope: string;
  source_filename: string;
  mime_type: string;
  size_bytes: number;
  placeholders: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DocumentGenerationDTO = {
  id: string;
  template_id: string;
  project_id: string;
  template_name: string | null;
  project_name: string | null;
  project_code: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  download_url: string;
  created_at: string;
};

type ProjectOption = {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  status?: string | null;
  lifecycle_status?: string | null;
  health_status?: string | null;
};

type ListResponse<T> = {
  items?: T[];
};

type ProjectContextResponse = {
  project_id: string;
  fields: Record<string, unknown>;
};

type TemplateFilter = "active" | "all" | "archived";

function normalizeItems<T>(response: T[] | ListResponse<T> | undefined): T[] {
  if (!response) {
    return [];
  }
  return Array.isArray(response) ? response : response.items || [];
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function statusPillClass(status: string): string {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase",
    status === "READY"
      ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
      : "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  );
}

function templateStatusClass(isActive: boolean): string {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase",
    isActive
      ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
      : "border-status-archived-border bg-status-archived-bg text-status-archived-fg",
  );
}

function filterButtonClass(active: boolean): string {
  return cn(active ? "dmx-primary-action h-9" : "dmx-secondary-action h-9");
}

function noticeClass(tone: "success" | "error"): string {
  return cn(
    "flex rounded-lg border px-4 py-3 text-[13px]",
    tone === "success" &&
      "items-center gap-2 border-status-ok-border bg-status-ok-bg text-status-ok-fg",
    tone === "error" &&
      "items-start gap-2 border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  );
}

function parseOverrides(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Overrides must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function safeOverrideKeys(value: string): string[] {
  try {
    return Object.keys(parseOverrides(value));
  } catch {
    return [];
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function filenameFromDisposition(
  disposition: string | null,
  fallback: string,
): string {
  const match = (disposition || "").match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [overridesText, setOverridesText] = useState(
    '{\n  "manual.note": ""\n}',
  );
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] =
    useState<TemplateFilter>("active");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["documents", "templates"],
    queryFn: () =>
      apiFetch<ListResponse<DocumentTemplateDTO>>(
        "/api/v1/admin/documents/templates",
      ),
    refetchInterval: 30_000,
  });

  const projectsQuery = useQuery({
    queryKey: ["documents", "projects"],
    queryFn: () =>
      apiFetch<ListResponse<ProjectOption>>("/api/v1/admin/projects?limit=200"),
    refetchInterval: 30_000,
  });

  const contextQuery = useQuery({
    queryKey: ["documents", "project-context", selectedProjectId],
    queryFn: () =>
      apiFetch<ProjectContextResponse>(
        `/api/v1/admin/documents/projects/${selectedProjectId}/context`,
      ),
    enabled: Boolean(selectedProjectId),
    refetchInterval: 30_000,
  });

  const generatedQuery = useQuery({
    queryKey: ["documents", "generated", selectedProjectId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (selectedProjectId) {
        params.set("project_id", selectedProjectId);
      }
      return apiFetch<ListResponse<DocumentGenerationDTO>>(
        `/api/v1/admin/documents/generated?${params.toString()}`,
      );
    },
    refetchInterval: 30_000,
  });

  const templates = useMemo(
    () => normalizeItems<DocumentTemplateDTO>(templatesQuery.data),
    [templatesQuery.data],
  );
  const activeTemplates = useMemo(
    () => templates.filter((template) => template.is_active),
    [templates],
  );
  const archivedTemplates = useMemo(
    () => templates.filter((template) => !template.is_active),
    [templates],
  );
  const projects = useMemo(
    () => normalizeItems<ProjectOption>(projectsQuery.data),
    [projectsQuery.data],
  );
  const generatedDocuments = useMemo(
    () => normalizeItems<DocumentGenerationDTO>(generatedQuery.data),
    [generatedQuery.data],
  );
  const fields = contextQuery.data?.fields || {};
  const fieldEntries = useMemo(
    () =>
      Object.entries(fields).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    [fields],
  );

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedTemplateId && activeTemplates.length > 0) {
      setSelectedTemplateId(activeTemplates[0].id);
    }
  }, [activeTemplates, selectedTemplateId]);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) || null;
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) || null;

  const overrideKeys = useMemo(
    () => safeOverrideKeys(overridesText),
    [overridesText],
  );
  const unresolvedPlaceholders = useMemo(() => {
    if (!selectedTemplate) {
      return [];
    }
    const available = new Set([...Object.keys(fields), ...overrideKeys]);
    return selectedTemplate.placeholders.filter(
      (placeholder) => !available.has(placeholder),
    );
  }, [fields, overrideKeys, selectedTemplate]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (templateFilter === "active" && !template.is_active) {
        return false;
      }
      if (templateFilter === "archived" && template.is_active) {
        return false;
      }
      if (!q) {
        return true;
      }
      return [
        template.name,
        template.code,
        template.description || "",
        template.source_filename,
        template.placeholders.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [search, templateFilter, templates]);

  const uploadMutation = useMutation({
    mutationFn: () => {
      const name = uploadName.trim();
      if (name.length < 2) {
        throw new Error("Template name is required.");
      }
      if (!uploadFile) {
        throw new Error("Template file is required.");
      }
      const formData = new FormData();
      formData.append("name", name);
      if (uploadDescription.trim()) {
        formData.append("description", uploadDescription.trim());
      }
      formData.append("file", uploadFile);
      return apiFetch<DocumentTemplateDTO>(
        "/api/v1/admin/documents/templates",
        {
          method: "POST",
          body: formData,
        },
      );
    },
    onSuccess: async (template) => {
      setMessage(`Template uploaded: ${template.name}`);
      setErrorMessage(null);
      setSelectedTemplateId(template.id);
      setUploadName("");
      setUploadDescription("");
      setUploadFile(null);
      await queryClient.invalidateQueries({
        queryKey: ["documents", "templates"],
      });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(
        readableApiError(
          error,
          locale,
          error instanceof Error
            ? error.message
            : "Failed to upload document template.",
        ),
      );
    },
  });

  const templateLifecycleMutation = useMutation({
    mutationFn: (template: DocumentTemplateDTO) =>
      apiFetch<DocumentTemplateDTO>(
        `/api/v1/admin/documents/templates/${template.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: !template.is_active }),
        },
      ),
    onSuccess: async (template) => {
      setMessage(
        template.is_active
          ? `Template restored: ${template.name}`
          : `Template archived: ${template.name}`,
      );
      setErrorMessage(null);
      if (!template.is_active && selectedTemplateId === template.id) {
        setSelectedTemplateId("");
      }
      await queryClient.invalidateQueries({
        queryKey: ["documents", "templates"],
      });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(
        readableApiError(
          error,
          locale,
          error instanceof Error
            ? error.message
            : "Failed to update document template.",
        ),
      );
    },
  });

  const renderMutation = useMutation({
    mutationFn: () => {
      if (!selectedProjectId) {
        throw new Error("Project is required.");
      }
      if (!selectedTemplateId) {
        throw new Error("Template is required.");
      }
      if (!selectedTemplate?.is_active) {
        throw new Error("Archived templates cannot be generated.");
      }
      const overrides = parseOverrides(overridesText);
      const missingPlaceholders = selectedTemplate.placeholders.filter(
        (placeholder) => !(placeholder in fields) && !(placeholder in overrides),
      );
      if (missingPlaceholders.length > 0) {
        throw new Error(
          `Document fields are required: ${missingPlaceholders.join(", ")}`,
        );
      }
      return apiFetch<DocumentGenerationDTO>(
        `/api/v1/admin/documents/projects/${selectedProjectId}/render`,
        {
          method: "POST",
          body: JSON.stringify({
            template_id: selectedTemplateId,
            overrides,
          }),
        },
      );
    },
    onSuccess: async (generation) => {
      setMessage(`Document generated: ${generation.file_name}`);
      setErrorMessage(null);
      await queryClient.invalidateQueries({
        queryKey: ["documents", "generated"],
      });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(
        readableApiError(
          error,
          locale,
          error instanceof Error
            ? error.message
            : "Failed to generate document.",
        ),
      );
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (generation: DocumentGenerationDTO) => {
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
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(
        readableApiError(
          error,
          locale,
          error instanceof Error
            ? error.message
            : "Failed to download generated document.",
        ),
      );
    },
  });

  const templateDownloadMutation = useMutation({
    mutationFn: async (template: DocumentTemplateDTO) => {
      const response = await apiDownload(
        `/api/v1/admin/documents/templates/${template.id}/download`,
        {
          method: "GET",
          credentials: "include",
        },
      );
      const blob = await response.blob();
      downloadBlob(
        blob,
        filenameFromDisposition(
          response.headers.get("content-disposition"),
          template.source_filename,
        ),
      );
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(
        readableApiError(
          error,
          locale,
          error instanceof Error
            ? error.message
            : "Failed to download document template.",
        ),
      );
    },
  });

  const loadError =
    templatesQuery.isError ||
    projectsQuery.isError ||
    generatedQuery.isError ||
    contextQuery.isError
      ? readableApiError(
          templatesQuery.error ||
            projectsQuery.error ||
            generatedQuery.error ||
            contextQuery.error,
          locale,
          "Failed to load documents workspace.",
        )
      : null;

  const canRender =
    Boolean(selectedProjectId) &&
    Boolean(selectedTemplateId) &&
    Boolean(selectedTemplate?.is_active) &&
    unresolvedPlaceholders.length === 0 &&
    !renderMutation.isPending;

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setUploadFile(file);
    if (file && !uploadName.trim()) {
      setUploadName(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <DimaxPageHeader
          eyebrow="Document operations"
          title="Documents"
          badge="Admin"
          subtitle="Project templates, field preview and generated files for DIMAX object paperwork."
          actions={
            <button
              type="button"
              className="dmx-secondary-action h-9"
              onClick={() => {
                void Promise.all([
                  queryClient.invalidateQueries({
                    queryKey: ["documents", "templates"],
                  }),
                  queryClient.invalidateQueries({
                    queryKey: ["documents", "projects"],
                  }),
                  queryClient.invalidateQueries({
                    queryKey: ["documents", "generated"],
                  }),
                ]);
              }}
            >
              Refresh
            </button>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <DimaxKpiCard
            label="Active templates"
            value={activeTemplates.length}
            hint="Available for generation"
            barColor="green"
          />
          <DimaxKpiCard
            label="Archived templates"
            value={archivedTemplates.length}
            hint="Kept for document history"
            barColor="yellow"
          />
          <DimaxKpiCard
            label="Projects"
            value={projects.length}
            hint="Render targets"
            barColor="blue"
          />
          <DimaxKpiCard
            label="Generated"
            value={generatedDocuments.length}
            hint="Ready files"
            barColor="orange"
          />
        </div>

        {message ? (
          <div className={noticeClass("success")}>
            <CheckCheck className="h-4 w-4 shrink-0" />
            {message}
          </div>
        ) : null}

        {errorMessage || loadError ? (
          <div className={noticeClass("error")}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage || loadError}</span>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <WidgetCard
            title="Add document template"
            headerMeta="Template upload"
            actionSlot={
              <UploadCloud
                className="h-5 w-5 shrink-0 text-accent"
                strokeWidth={1.8}
              />
            }
          >

            <div className="grid gap-4">
              <div className="field-stack">
                <Label htmlFor="document-template-name">Template name</Label>
                <Input
                  id="document-template-name"
                  value={uploadName}
                  onChange={(event) => setUploadName(event.target.value)}
                  className="control-input"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="document-template-description">
                  Description
                </Label>
                <Textarea
                  id="document-template-description"
                  rows={3}
                  value={uploadDescription}
                  onChange={(event) => setUploadDescription(event.target.value)}
                  className="control-textarea min-h-[88px]"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="document-template-file">
                  Template file (.docx, .html, .txt)
                </Label>
                <Input
                  id="document-template-file"
                  type="file"
                  accept=".docx,.html,.htm,.txt"
                  onChange={onFileChange}
                  className="control-input file:mr-3 file:rounded-md file:border-0 file:bg-surface-subtle file:px-3 file:py-1 file:text-[12px] file:font-medium file:text-text"
                />
                {uploadFile ? (
                  <div className="text-[12px] text-text-secondary">
                    {uploadFile.name} - {formatBytes(uploadFile.size)}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="dmx-primary-action h-10 justify-center disabled:cursor-not-allowed disabled:opacity-60"
                disabled={uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                Upload template
              </button>
            </div>
          </WidgetCard>

          <WidgetCard
            title="Generate filled document"
            headerMeta="Project render"
            actionSlot={
              <FileText
                className="h-5 w-5 shrink-0 text-accent"
                strokeWidth={1.8}
              />
            }
          >

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="field-stack">
                <Label htmlFor="document-project">Project</Label>
                <select
                  id="document-project"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="control-input"
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code
                        ? `${project.code} - ${project.name}`
                        : project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <Label htmlFor="document-template">Template</Label>
                <select
                  id="document-template"
                  value={selectedTemplate?.is_active ? selectedTemplateId : ""}
                  onChange={(event) =>
                    setSelectedTemplateId(event.target.value)
                  }
                  className="control-input"
                >
                  <option value="">Select template</option>
                  {activeTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProject ? (
              <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] text-text-secondary">
                <span className="font-medium text-text">
                  {selectedProject.name}
                </span>
                {selectedProject.address ? ` - ${selectedProject.address}` : ""}
              </div>
            ) : null}

            {selectedTemplate ? (
              <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold text-text">
                    {selectedTemplate.source_filename}
                  </span>
                  <span
                    className={templateStatusClass(selectedTemplate.is_active)}
                  >
                    {selectedTemplate.is_active ? "ACTIVE" : "ARCHIVED"}
                  </span>
                  <span className="dmx-week-pill">
                    {formatBytes(selectedTemplate.size_bytes)}
                  </span>
                  <span className="dmx-week-pill">
                    {selectedTemplate.placeholders.length} placeholders
                  </span>
                </div>
                {selectedTemplate.placeholders.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.placeholders.map((placeholder) => (
                      <span
                        key={placeholder}
                        className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-secondary"
                      >
                        {placeholder}
                      </span>
                    ))}
                  </div>
                ) : null}
                {unresolvedPlaceholders.length > 0 ? (
                  <div className="rounded-md border border-status-warning-border bg-status-warning-bg px-3 py-2 text-[12px] text-status-warning-fg">
                    Fields required before generation:{" "}
                    {unresolvedPlaceholders.join(", ")}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="field-stack">
              <Label htmlFor="document-overrides">Manual fields JSON</Label>
              <Textarea
                id="document-overrides"
                rows={6}
                value={overridesText}
                onChange={(event) => setOverridesText(event.target.value)}
                className="control-textarea min-h-[144px] font-mono text-[12px]"
                spellCheck={false}
              />
            </div>

            <button
              type="button"
              className="dmx-primary-action h-10 justify-center disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canRender}
              onClick={() => renderMutation.mutate()}
            >
              {renderMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Generate document
            </button>
          </WidgetCard>
        </div>

        <WidgetCard
          title="Available fields"
          headerMeta="Project field preview"
          actionSlot={
            contextQuery.isFetching ? (
              <div className="inline-flex items-center gap-2 text-[12px] text-text-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading fields
              </div>
            ) : null
          }
        >

          {selectedProjectId ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {fieldEntries.length === 0 && !contextQuery.isLoading ? (
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3 text-[13px] text-text-secondary">
                  No fields available.
                </div>
              ) : (
                fieldEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="min-w-0 rounded-lg border border-border bg-surface-subtle px-3 py-2"
                  >
                    <div className="truncate text-[11px] font-semibold text-text-secondary">
                      {key}
                    </div>
                    <div className="mt-1 truncate text-[13px] font-medium text-text">
                      {String(value ?? "-") || "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3 text-[13px] text-text-secondary">
              Select a project to preview fields.
            </div>
          )}
        </WidgetCard>

        <section className="toolbar-panel page-stack-tight">
          <div className="toolbar-row">
            <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates..."
                className="control-input ps-10"
              />
            </div>
            <button
              type="button"
              className={filterButtonClass(templateFilter === "active")}
              onClick={() => setTemplateFilter("active")}
            >
              Active
            </button>
            <button
              type="button"
              className={filterButtonClass(templateFilter === "all")}
              onClick={() => setTemplateFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={filterButtonClass(templateFilter === "archived")}
              onClick={() => setTemplateFilter("archived")}
            >
              Archived
            </button>
          </div>
        </section>

        <section className="data-table-shell">
          <div className="hidden md:block">
            <Table>
              <TableHeader className="data-table-head">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placeholders</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[144px] text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesQuery.isLoading ? (
                  <TableRow className="data-table-row">
                    <TableCell
                      colSpan={7}
                      className="py-8 text-sm text-text-secondary"
                    >
                      Loading templates...
                    </TableCell>
                  </TableRow>
                ) : filteredTemplates.length === 0 ? (
                  <TableRow className="data-table-row">
                    <TableCell
                      colSpan={7}
                      className="py-8 text-sm text-text-secondary"
                    >
                      No templates found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="data-table-row">
                      <TableCell>
                        <button
                          type="button"
                          className="text-start font-medium text-text hover:text-accent"
                          onClick={() => setSelectedTemplateId(template.id)}
                        >
                          {template.name}
                        </button>
                        {template.description ? (
                          <div className="mt-1 max-w-[360px] truncate text-[12px] text-text-secondary">
                            {template.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {template.source_filename}
                      </TableCell>
                      <TableCell>
                        <span
                          className={templateStatusClass(template.is_active)}
                        >
                          {template.is_active ? "ACTIVE" : "ARCHIVED"}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {template.placeholders.length}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatBytes(template.size_bytes)}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatDateTime(template.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            className="dmx-secondary-action h-8 px-2.5"
                            onClick={() =>
                              templateDownloadMutation.mutate(template)
                            }
                            disabled={templateDownloadMutation.isPending}
                            aria-label={`Download template ${template.name}`}
                            title="Download template"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="dmx-secondary-action h-8 px-2.5"
                            onClick={() =>
                              templateLifecycleMutation.mutate(template)
                            }
                            disabled={templateLifecycleMutation.isPending}
                            aria-label={
                              template.is_active
                                ? `Archive ${template.name}`
                                : `Restore ${template.name}`
                            }
                            title={
                              template.is_active
                                ? "Archive template"
                                : "Restore template"
                            }
                          >
                            {template.is_active ? (
                              <Archive className="h-3.5 w-3.5" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-border-subtle md:hidden">
            {filteredTemplates.map((template) => (
              <article key={`${template.id}-mobile`} className="px-3.5 py-3.5">
                <button
                  type="button"
                  className="block w-full text-start"
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <div className="font-medium text-text">{template.name}</div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {template.source_filename} -{" "}
                    {formatBytes(template.size_bytes)} -{" "}
                    {template.placeholders.length} placeholders
                  </div>
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={templateStatusClass(template.is_active)}>
                    {template.is_active ? "ACTIVE" : "ARCHIVED"}
                  </span>
                  <button
                    type="button"
                    className="dmx-secondary-action h-8 px-2.5"
                    onClick={() => templateDownloadMutation.mutate(template)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="dmx-secondary-action h-8 px-2.5"
                    onClick={() => templateLifecycleMutation.mutate(template)}
                  >
                    {template.is_active ? (
                      <Archive className="h-3.5 w-3.5" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    {template.is_active ? "Archive" : "Restore"}
                  </button>
                </div>
              </article>
            ))}
            {!templatesQuery.isLoading && filteredTemplates.length === 0 ? (
              <div className="px-4 py-8 text-sm text-text-secondary">
                No templates found.
              </div>
            ) : null}
          </div>
        </section>

        <section className="data-table-shell">
          <div className="hidden md:block">
            <Table>
              <TableHeader className="data-table-head">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead>Generated file</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[112px] text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedQuery.isLoading ? (
                  <TableRow className="data-table-row">
                    <TableCell
                      colSpan={7}
                      className="py-8 text-sm text-text-secondary"
                    >
                      Loading generated documents...
                    </TableCell>
                  </TableRow>
                ) : generatedDocuments.length === 0 ? (
                  <TableRow className="data-table-row">
                    <TableCell
                      colSpan={7}
                      className="py-8 text-sm text-text-secondary"
                    >
                      No generated documents yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  generatedDocuments.map((generation) => (
                    <TableRow key={generation.id} className="data-table-row">
                      <TableCell className="font-medium text-text">
                        {generation.file_name}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {generation.project_code
                          ? `${generation.project_code} - `
                          : ""}
                        {generation.project_name || generation.project_id}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {generation.template_name || generation.template_id}
                      </TableCell>
                      <TableCell>
                        <span className={statusPillClass(generation.status)}>
                          {generation.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatBytes(generation.size_bytes)}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatDateTime(generation.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="dmx-secondary-action h-8 px-2.5"
                            onClick={() => downloadMutation.mutate(generation)}
                            disabled={downloadMutation.isPending}
                            aria-label={`Download ${generation.file_name}`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-border-subtle md:hidden">
            {generatedDocuments.map((generation) => (
              <article
                key={`${generation.id}-mobile`}
                className="px-3.5 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-text">
                      {generation.file_name}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {formatBytes(generation.size_bytes)} -{" "}
                      {formatDateTime(generation.created_at)}
                    </div>
                    <div className="mt-1 truncate text-[12px] text-text-secondary">
                      {generation.project_code
                        ? `${generation.project_code} - `
                        : ""}
                      {generation.project_name || generation.project_id}
                    </div>
                    <div className="mt-1 truncate text-[12px] text-text-secondary">
                      {generation.template_name || generation.template_id}
                    </div>
                  </div>
                  <span className={statusPillClass(generation.status)}>
                    {generation.status}
                  </span>
                </div>
                <button
                  type="button"
                  className="dmx-secondary-action mt-3 h-8 px-2.5"
                  onClick={() => downloadMutation.mutate(generation)}
                  disabled={downloadMutation.isPending}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </article>
            ))}
            {!generatedQuery.isLoading && generatedDocuments.length === 0 ? (
              <div className="px-4 py-8 text-sm text-text-secondary">
                No generated documents yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
