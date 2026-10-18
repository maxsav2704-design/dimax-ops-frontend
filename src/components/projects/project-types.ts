// Moved verbatim from ProjectsPage.tsx (monolith split).

import { type ProjectLifecycleStatus } from "@/components/projects/project-form";

export type ProjectListItem = {
  id: string;
  name: string;
  code?: string | null;
  address: string;
  status: string;
  lifecycle_status?: ProjectLifecycleStatus;
  health_status?: ProjectHealthStatus;
};

export type ProjectRiskItem = {
  kind: "SYNC" | "DELIVERY_OUTBOX" | string;
  status: string;
  details?: string | null;
  opened_at?: string | null;
};

export type ProjectDetailsResponse = {
  id?: string;
  /** Open system risks on the project (installer sync, outbox delivery), see backend 0078. */
  open_risks?: ProjectRiskItem[];
  name?: string;
  code?: string | null;
  address?: string;
  address_details?: {
    street?: string | null;
    building?: string | null;
    city?: string | null;
    entrance?: string | null;
    lat?: string | number | null;
    lng?: string | number | null;
    waze_url?: string | null;
    waze_deep_link?: string | null;
  } | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  status?: string;
  lifecycle_status?: ProjectLifecycleStatus;
  health_status?: ProjectHealthStatus;
  developer?: {
    name?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    phone_alt?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    notes?: string | null;
    whatsapp_deep_link?: string | null;
    call_deep_link?: string | null;
  } | null;
  developer_company?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  developer_phone_alt?: string | null;
  developer_whatsapp?: string | null;
  developer_notes?: string | null;
  address_street?: string | null;
  address_building?: string | null;
  address_city?: string | null;
  address_entrance?: string | null;
  address_lat?: string | number | null;
  address_lng?: string | number | null;
  address_waze_url?: string | null;
  waze_deep_link?: string | null;
  whatsapp_deep_link?: string | null;
  call_deep_link?: string | null;
  issues_open?: ProjectOpenIssue[];
};

export type ProjectHealthStatus = "NORMAL" | "AT_RISK" | "BLOCKED";

export type ProjectOpenIssue = {
  id: string;
  door_id: string;
  status: string;
  title: string | null;
  details: string | null;
};

export type ProjectImportRunItem = {
  id: string;
  created_at: string;
  mode: string;
  status: string;
  source_filename: string | null;
  mapping_profile: string | null;
  parsed_rows: number;
  prepared_rows: number;
  imported: number;
  skipped: number;
  errors_count: number;
  idempotency_hit: boolean;
  retry_available: boolean;
  last_error?: string | null;
};
