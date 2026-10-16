// Door import responses (analyze / import runs, mapping profiles).
// Moved verbatim from ProjectsPage.tsx (monolith split, Projects step 2).

export type DoorType = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

export type ImportRequiredFieldDiagnostics = {
  field_key: string;
  display_name: string;
  found: boolean;
  matched_columns: string[];
};

export type ImportColumnsDiagnostics = {
  required_fields: ImportRequiredFieldDiagnostics[];
  recognized_columns: string[];
  unmapped_columns: string[];
  mapping_profile?: string | null;
  strict_required_fields?: boolean | null;
  missing_required_fields?: string[];
  data_summary?: {
    source_rows: number;
    prepared_rows: number;
    rows_with_errors: number;
    duplicate_rows_skipped: number;
    zero_price_doors?: number;
    unique_order_numbers: number;
    unique_houses: number;
    unique_floors: number;
    unique_apartments: number;
    unique_locations: number;
    unique_markings: number;
  } | null;
  preview_groups?: Array<{
    order_number: string | null;
    house_number: string | null;
    floor_label: string | null;
    apartment_number: string | null;
    door_marking: string | null;
    door_count: number;
    location_codes: string[];
    door_type_ids?: string[];
    door_type_labels?: string[];
  }>;
};

export type ImportResult = {
  parsed_rows: number;
  prepared_rows: number;
  imported: number;
  skipped: number;
  errors: ImportRowError[];
  diagnostics?: ImportColumnsDiagnostics | null;
  mode?: "analyze" | "import" | string;
  would_import?: number;
  would_skip?: number;
  idempotency_hit?: boolean;
};

export type ImportRowError = {
  row: number;
  message: string;
};

export type ImportMappingProfile = {
  code: string;
  name: string;
  description: string;
  preferred_delimiter: string | null;
};

export type ImportMappingProfilesResponse = {
  default_code: string;
  items: ImportMappingProfile[];
};

export type BulkReconcileResponse = {
  items: BulkReconcileItem[];
  total_projects: number;
  successful_projects: number;
  failed_projects: number;
  skipped_projects: number;
};

export type BulkReconcileItem = {
  project_id: string;
  source_run_id: string | null;
  status: string;
  imported: number;
  skipped: number;
  errors_count: number;
  last_error?: string | null;
};

export type LatestImportReviewResponse = {
  items: LatestImportReviewItem[];
  total_projects: number;
  reviewable_projects: number;
  failed_or_partial_projects: number;
  skipped_projects: number;
};

export type LatestImportReviewItem = {
  project_id: string;
  project_name: string;
  source_run_id: string | null;
  mode: string | null;
  status: string;
  source_filename: string | null;
  mapping_profile: string | null;
  parsed_rows: number;
  prepared_rows: number;
  imported: number;
  skipped: number;
  errors_count: number;
  last_error?: string | null;
  retry_available: boolean;
};
