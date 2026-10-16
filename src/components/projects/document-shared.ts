// Moved verbatim from ProjectsPage.tsx (monolith split).

export type DocumentTemplateDTO = {
  id: string;
  name: string;
  source_filename: string;
  size_bytes: number;
  placeholders: string[];
  is_active: boolean;
};

export type DocumentGenerationDTO = {
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

export function formatBytes(value: number): string {
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
