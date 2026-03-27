"use client";

import { ApiError, apiFetch } from "@/lib/api";

export type InstallerProjectListItem = {
  id: string;
  name: string;
  address: string | null;
  status: string;
  waze_url: string | null;
};

export type InstallerCalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  event_type: string;
  project_id?: string | null;
};

export type InstallerIssueSummary = {
  id: string;
  project_id: string | null;
  door_id: string | null;
  status: string;
  priority: string | null;
  title: string | null;
  description?: string | null;
  details?: string | null;
  comment?: string | null;
  media_count?: number | null;
};

export type InstallerIssueMediaAsset = {
  id: string;
  file_name?: string | null;
  content_type?: string | null;
  created_at?: string | null;
};

export type InstallerEarningsInstallType = {
  install_type: string;
  amount: number | string;
};

export type InstallerEarningsProject = {
  project_id: string | null;
  project_name: string | null;
  amount: number | string;
};

export type InstallerEarningsDay = {
  date: string;
  amount: number | string;
};

export type InstallerEarningsSummary = {
  currency?: string | null;
  today_total?: number | string | null;
  month_total?: number | string | null;
  by_install_type?: InstallerEarningsInstallType[];
  by_project?: InstallerEarningsProject[];
  by_day?: InstallerEarningsDay[];
};

export type InstallerSyncQueueItem = {
  id: string;
  entity_type: string;
  entity_id?: string | null;
  project_id?: string | null;
  operation_type: string;
  status: string;
  conflict_code?: string | null;
  created_at?: string | null;
  synced_at?: string | null;
};

export type InstallerSyncQueueResponse = {
  items: InstallerSyncQueueItem[];
};

type InstallerProjectListResponse = {
  items: InstallerProjectListItem[];
};

type InstallerCalendarEventsResponse = {
  items: InstallerCalendarEvent[];
};

type InstallerIssuesResponse = {
  items: InstallerIssueSummary[];
};

type InstallerIssueMediaResponse = {
  items: InstallerIssueMediaAsset[];
};

type InstallerWorkspaceResponse = {
  projects?: InstallerProjectListItem[];
  events?: InstallerCalendarEvent[];
  task_events?: InstallerCalendarEvent[];
  issues?: InstallerIssueSummary[];
  earnings_summary?: InstallerEarningsSummary | null;
  sync_queue?: InstallerSyncQueueResponse | null;
};

export type InstallerWorkspaceData = {
  projects: InstallerProjectListItem[];
  events: InstallerCalendarEvent[];
  taskEvents: InstallerCalendarEvent[];
  issues: InstallerIssueSummary[];
  earningsSummary: InstallerEarningsSummary | null;
  syncQueue: InstallerSyncQueueResponse | null;
  source: "workspace-endpoint" | "composed-fallback";
};

async function safeOptionalFetch<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return null;
  }
}

export async function fetchInstallerIssues(): Promise<InstallerIssueSummary[]> {
  const response = await apiFetch<InstallerIssuesResponse>("/api/v1/installer/issues");
  return response.items || [];
}

export async function updateInstallerIssue(
  issueId: string,
  payload: { comment: string | null }
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/v1/installer/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      comment: payload.comment,
    }),
  });
}

export async function fetchInstallerIssueMedia(issueId: string): Promise<InstallerIssueMediaAsset[]> {
  const response = await safeOptionalFetch<InstallerIssueMediaResponse>(
    `/api/v1/installer/issues/${issueId}/media`
  );
  return response?.items || [];
}

export async function fetchInstallerMediaUrl(mediaId: string): Promise<string> {
  const response = await safeOptionalFetch<{ url?: string | null }>(`/api/v1/media/${mediaId}/url`);
  if (response?.url) {
    return response.url;
  }
  throw new Error("Media file is not ready.");
}

export async function fetchInstallerEarningsSummary(): Promise<InstallerEarningsSummary | null> {
  return safeOptionalFetch<InstallerEarningsSummary>("/api/v1/installer/earnings/summary");
}

export async function fetchInstallerSyncQueue(): Promise<InstallerSyncQueueResponse | null> {
  return safeOptionalFetch<InstallerSyncQueueResponse>("/api/v1/installer/sync-queue");
}

export async function fetchInstallerWorkspace(params: {
  calendarFromIso: string;
  calendarToIso: string;
  tasksFromIso: string;
  tasksToIso: string;
}): Promise<InstallerWorkspaceData> {
  try {
    const response = await apiFetch<InstallerWorkspaceResponse>("/api/v1/installer/workspace");
    return {
      projects: response.projects || [],
      events: response.events || [],
      taskEvents: response.task_events || response.events || [],
      issues: response.issues || [],
      earningsSummary: response.earnings_summary || null,
      syncQueue: response.sync_queue || null,
      source: "workspace-endpoint",
    };
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }
    const isExpectedFallback =
      !(error instanceof ApiError) || error.status === 404 || error.status === 501;
    if (!isExpectedFallback) {
      throw error;
    }
  }

  const [projectsResponse, eventsResponse, taskEventsResponse, issuesResponse, earningsSummary, syncQueue] =
    await Promise.all([
      apiFetch<InstallerProjectListResponse>("/api/v1/installer/projects"),
      apiFetch<InstallerCalendarEventsResponse>(
        `/api/v1/installer/calendar/events?starts_at=${encodeURIComponent(
          params.calendarFromIso
        )}&ends_at=${encodeURIComponent(params.calendarToIso)}`
      ),
      apiFetch<InstallerCalendarEventsResponse>(
        `/api/v1/installer/calendar/events?starts_at=${encodeURIComponent(
          params.tasksFromIso
        )}&ends_at=${encodeURIComponent(params.tasksToIso)}`
      ),
      safeOptionalFetch<InstallerIssuesResponse>("/api/v1/installer/issues"),
      fetchInstallerEarningsSummary(),
      fetchInstallerSyncQueue(),
    ]);

  return {
    projects: projectsResponse.items || [],
    events: eventsResponse.items || [],
    taskEvents: taskEventsResponse.items || [],
    issues: issuesResponse?.items || [],
    earningsSummary,
    syncQueue,
    source: "composed-fallback",
  };
}
