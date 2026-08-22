import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  FilterX,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const issuesOverrides: Partial<Record<Locale, Record<string, string>>> = {
  he: {
    "issues.workflow": "זרימת עבודה",
    "issues.overdue": "באיחור",
    "issues.total": 'סה"כ',
    "issues.priorityP1": "עדיפות P1",
    "issues.allStatuses": "כל הסטטוסים",
    "issues.allWorkflowStates": "כל מצבי הזרימה",
    "issues.ownerUserUuid": "סנן לפי UUID של בעלים",
    "issues.overdueOnly": "רק באיחור",
    "issues.workflowEditor": "עורך זרימת עבודה",
    "issues.ownerUser": "בעלים",
    "issues.dueAt": "יעד לביצוע",
    "issues.workflowNotes": "הערות זרימת עבודה",
    "issues.currentDue": "יעד נוכחי",
    "issues.saving": "שומר...",
    "issues.saveWorkflow": "שמור זרימת עבודה",
    "issues.applyingBulk": "מיישם על כולם...",
    "issues.applyToFiltered": "החל על המסוננים",
  },
};

type IssueStatus = "OPEN" | "CLOSED";
type IssueWorkflowState =
  | "NEW"
  | "TRIAGED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "RESOLVED"
  | "CLOSED";
type IssuePriority = "P1" | "P2" | "P3" | "P4";

type AdminIssue = {
  id: string;
  company_id: string;
  door_id: string;
  project_id: string;
  door_unit_label: string;
  status: IssueStatus;
  workflow_state: IssueWorkflowState;
  priority: IssuePriority;
  owner_user_id: string | null;
  due_at: string | null;
  is_overdue: boolean;
  title: string | null;
  details: string | null;
  created_at: string;
  updated_at: string;
};

type AdminIssueComment = {
  id: string;
  body: string | null;
  author_name?: string | null;
  author_user_id?: string | null;
  created_at?: string | null;
};

type AdminIssueMediaAsset = {
  id: string;
  file_name?: string | null;
  content_type?: string | null;
  created_at?: string | null;
};

type AdminIssuesResponse = {
  items: AdminIssue[];
};

type AdminIssuesBulkWorkflowUpdateResponse = {
  updated: number;
  missing_issue_ids: string[];
  items: AdminIssue[];
};

type AdminIssueCommentsResponse = {
  items: AdminIssueComment[];
};

type AdminIssueMediaResponse = {
  items: AdminIssueMediaAsset[];
};

type Installer = {
  id: string;
  full_name: string;
  user_id: string | null;
};

type WorkflowFormState = {
  status: IssueStatus;
  workflow_state: IssueWorkflowState;
  priority: IssuePriority;
  owner_user_id: string;
  due_at: string;
  details: string;
};

const STATUS_OPTIONS: Array<IssueStatus> = ["OPEN", "CLOSED"];
const WORKFLOW_OPTIONS: Array<IssueWorkflowState> = [
  "NEW",
  "TRIAGED",
  "IN_PROGRESS",
  "BLOCKED",
  "RESOLVED",
  "CLOSED",
];
const PRIORITY_OPTIONS: Array<IssuePriority> = ["P1", "P2", "P3", "P4"];

const PRIORITY_CLASS: Record<IssuePriority, string> = {
  P1: "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  P2: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  P3: "border-status-progress-border bg-status-progress-bg text-status-progress-fg",
  P4: "border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg",
};

const ISSUE_STATUS_CLASS: Record<IssueStatus, string> = {
  OPEN: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  CLOSED: "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
};

const ISSUE_PRIORITY_RANK: Record<IssuePriority, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

function emptyForm(): WorkflowFormState {
  return {
    status: "OPEN",
    workflow_state: "NEW",
    priority: "P3",
    owner_user_id: "",
    due_at: "",
    details: "",
  };
}

function toLocalDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function toForm(issue: AdminIssue): WorkflowFormState {
  return {
    status: issue.status,
    workflow_state: issue.workflow_state,
    priority: issue.priority,
    owner_user_id: issue.owner_user_id || "",
    due_at: toLocalDateTimeInput(issue.due_at),
    details: issue.details || "",
  };
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function initialsFromName(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return "--";
  }
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
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

function buildWorkflowPatch(
  issue: AdminIssue,
  form: WorkflowFormState,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (form.status !== issue.status) {
    payload.status = form.status;
  }
  if (form.workflow_state !== issue.workflow_state) {
    payload.workflow_state = form.workflow_state;
  }
  if (form.priority !== issue.priority) {
    payload.priority = form.priority;
  }

  const nextOwner = form.owner_user_id.trim();
  const currentOwner = issue.owner_user_id || "";
  if (nextOwner !== currentOwner) {
    payload.owner_user_id = nextOwner || null;
  }

  const nextDueAtIso = toIsoDateTime(form.due_at);
  const currentDueAtIso = issue.due_at
    ? new Date(issue.due_at).toISOString()
    : null;
  if (nextDueAtIso !== currentDueAtIso) {
    payload.due_at = nextDueAtIso;
  }

  const nextDetails = form.details.trim();
  const currentDetails = (issue.details || "").trim();
  if (nextDetails !== currentDetails) {
    payload.details = nextDetails || null;
  }

  return payload;
}

async function safeFetchIssueComments(
  issueId: string,
): Promise<AdminIssueComment[]> {
  try {
    const response = await apiFetch<AdminIssueCommentsResponse>(
      `/api/v1/admin/issues/${issueId}/comments`,
    );
    return response.items || [];
  } catch {
    return [];
  }
}

async function safeFetchIssueMedia(
  issueId: string,
): Promise<AdminIssueMediaAsset[]> {
  try {
    const response = await apiFetch<AdminIssueMediaResponse>(
      `/api/v1/admin/issues/${issueId}/media`,
    );
    return response.items || [];
  } catch {
    return [];
  }
}

async function fetchIssueMediaUrl(mediaId: string): Promise<string> {
  const response = await apiFetch<{ url?: string | null }>(
    `/api/v1/media/${mediaId}/url`,
  );
  if (response.url) {
    return response.url;
  }
  throw new Error("Media file is not ready");
}

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
  const tt = (key: string) => issuesOverrides[locale]?.[key] ?? t(key);
  const searchParams = useSearchParams();
  const issueIdParam = searchParams?.get("issue_id")?.trim() || null;
  const [statusFilter, setStatusFilter] = useState<"all" | IssueStatus>("all");
  const [workflowFilter, setWorkflowFilter] = useState<
    "all" | IssueWorkflowState
  >("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [issueSearch, setIssueSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    issueIdParam,
  );
  const [issueDeepLinkMissing, setIssueDeepLinkMissing] = useState(false);
  const [dismissedIssueDeepLinkId, setDismissedIssueDeepLinkId] = useState<
    string | null
  >(null);
  const [form, setForm] = useState<WorkflowFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const session = useAuthSession();
  const canManageIssues = canRunPrivilegedAdminActions(session);
  const privilegedActionHint = canManageIssues
    ? undefined
    : "Your access level is read-only in issues";
  const issueDeepLinkDismissed =
    !!issueIdParam && dismissedIssueDeepLinkId === issueIdParam;

  const installersQuery = useQuery({
    queryKey: ["issues-owner-installers"],
    queryFn: () =>
      apiFetch<Installer[]>(
        "/api/v1/admin/installers?is_active=true&limit=200",
      ),
    refetchInterval: 120_000,
  });

  const linkedOwners = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ user_id: string; full_name: string }> = [];
    for (const installer of installersQuery.data || []) {
      if (!installer.user_id || seen.has(installer.user_id)) {
        continue;
      }
      seen.add(installer.user_id);
      options.push({
        user_id: installer.user_id,
        full_name: installer.full_name,
      });
    }
    options.sort((a, b) => a.full_name.localeCompare(b.full_name, "en"));
    return options;
  }, [installersQuery.data]);

  const ownerNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const owner of linkedOwners) {
      map.set(owner.user_id, owner.full_name);
    }
    return map;
  }, [linkedOwners]);

  const issuesQuery = useQuery({
    queryKey: [
      "issues",
      statusFilter,
      workflowFilter,
      overdueOnly,
      ownerFilter.trim(),
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (workflowFilter !== "all") {
        params.set("workflow_state", workflowFilter);
      }
      if (overdueOnly) {
        params.set("overdue_only", "true");
      }
      if (ownerFilter.trim()) {
        params.set("owner_user_id", ownerFilter.trim());
      }
      params.set("limit", "200");
      return apiFetch<AdminIssuesResponse>(
        `/api/v1/admin/issues?${params.toString()}`,
      );
    },
    refetchInterval: 30_000,
  });

  const workflowMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (!canManageIssues) {
        throw new Error("Issue write access is required.");
      }
      if (!selectedIssueId) {
        throw new Error("Issue is not selected");
      }
      return apiFetch<AdminIssue>(
        `/api/v1/admin/issues/${selectedIssueId}/workflow`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: async () => {
      setFormError(null);
      setSaveNote(
        copy(
          "Workflow updated",
          "Этап обработки обновлён",
          "\u05ea\u05d4\u05dc\u05d9\u05da \u05d4\u05e2\u05d1\u05d5\u05d3\u05d4 \u05e2\u05d5\u05d3\u05db\u05df",
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (error) => {
      setSaveNote(null);
      setFormError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось сохранить workflow."
            : locale === "he"
              ? "לא ניתן לשמור את ה-workflow."
              : "Failed to save workflow",
        ),
      );
    },
  });

  const issues = useMemo(
    () => issuesQuery.data?.items || [],
    [issuesQuery.data?.items],
  );
  const visibleIssues = useMemo(() => {
    const query = issueSearch.trim().toLowerCase();
    const searched = query
      ? issues.filter((issue) =>
          [
            issue.title,
            issue.details,
            issue.door_unit_label,
            issue.door_id,
            issue.project_id,
            issue.workflow_state,
            issue.priority,
            issue.owner_user_id
              ? ownerNameByUserId.get(issue.owner_user_id) ||
                issue.owner_user_id
              : "unassigned",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : issues;

    return [...searched].sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) {
        return a.is_overdue ? -1 : 1;
      }
      const priorityDiff =
        ISSUE_PRIORITY_RANK[a.priority] - ISSUE_PRIORITY_RANK[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
  }, [issueSearch, issues, ownerNameByUserId]);
  const selectedIssue = useMemo(
    () => issues.find((item) => item.id === selectedIssueId) || null,
    [issues, selectedIssueId],
  );
  const [issueMediaOpen, setIssueMediaOpen] = useState(false);

  const issueCommentsQuery = useQuery({
    queryKey: ["admin-issue-comments", selectedIssueId],
    queryFn: () => safeFetchIssueComments(selectedIssueId as string),
    enabled: !!selectedIssueId,
    staleTime: 30_000,
  });

  const issueMediaQuery = useQuery({
    queryKey: ["admin-issue-media", selectedIssueId],
    queryFn: () => safeFetchIssueMedia(selectedIssueId as string),
    enabled: !!selectedIssueId && issueMediaOpen,
    staleTime: 30_000,
  });

  const openMediaMutation = useMutation({
    mutationFn: async (media: AdminIssueMediaAsset) => {
      const url = await fetchIssueMediaUrl(media.id);
      return { url };
    },
    onSuccess: ({ url }) => {
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (error) => {
      setSaveNote(null);
      setFormError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось открыть медиа проблемы."
            : locale === "he"
              ? "לא ניתן לפתוח את המדיה של התקלה."
              : "Failed to open issue media",
        ),
      );
    },
  });

  useEffect(() => {
    if (!saveNote) {
      return;
    }
    const timeout = window.setTimeout(() => setSaveNote(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [saveNote]);

  useEffect(() => {
    if (!issueIdParam) {
      return;
    }
    setStatusFilter("all");
    setWorkflowFilter("all");
    setOwnerFilter("");
    setOverdueOnly(false);
    setIssueDeepLinkMissing(false);
    setDismissedIssueDeepLinkId(null);
    setSelectedIssueId(issueIdParam);
  }, [issueIdParam]);

  useEffect(() => {
    if (issues.length === 0) {
      if (
        issueIdParam &&
        !issueDeepLinkDismissed &&
        !issuesQuery.isLoading &&
        issuesQuery.isFetched
      ) {
        setIssueDeepLinkMissing(true);
      }
      return;
    }
    if (issueIdParam) {
      if (issueDeepLinkDismissed) {
        setIssueDeepLinkMissing(false);
        return;
      }
      const exists = issues.some((issue) => issue.id === issueIdParam);
      setIssueDeepLinkMissing(!exists);
      if (exists && selectedIssueId !== issueIdParam) {
        setSelectedIssueId(issueIdParam);
      }
      return;
    }
    if (!selectedIssueId && issues.length > 0) {
      setSelectedIssueId(issues[0].id);
      return;
    }
    if (selectedIssueId && !selectedIssue) {
      setSelectedIssueId(issues[0]?.id || null);
    }
  }, [
    issueDeepLinkDismissed,
    issueIdParam,
    issues,
    issuesQuery.isFetched,
    issuesQuery.isLoading,
    selectedIssue,
    selectedIssueId,
  ]);

  useEffect(() => {
    if (!selectedIssue) {
      setForm(emptyForm());
      return;
    }
    setIssueMediaOpen(false);
    setForm(toForm(selectedIssue));
    setFormError(null);
    setSaveNote(null);
  }, [selectedIssue]);

  const metrics = useMemo(() => {
    const total = issues.length;
    const open = issues.filter((x) => x.status === "OPEN").length;
    const overdue = issues.filter((x) => x.is_overdue).length;
    const p1 = issues.filter((x) => x.priority === "P1").length;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const dueToday = issues.filter((x) => {
      if (x.status !== "OPEN" || !x.due_at) {
        return false;
      }
      const due = new Date(x.due_at).getTime();
      return Number.isFinite(due) && due >= now && due <= now + dayMs;
    }).length;
    const unassigned = issues.filter(
      (x) => x.status === "OPEN" && !x.owner_user_id,
    ).length;
    const resolvedWeek = issues.filter((x) => {
      if (x.workflow_state !== "RESOLVED" && x.status !== "CLOSED") {
        return false;
      }
      const updated = new Date(x.updated_at).getTime();
      return Number.isFinite(updated) && now - updated <= weekMs;
    }).length;
    const workflowCounts = WORKFLOW_OPTIONS.reduce(
      (acc, state) => {
        acc[state] = issues.filter((x) => x.workflow_state === state).length;
        return acc;
      },
      {} as Record<IssueWorkflowState, number>,
    );
    return {
      closed: issues.filter((x) => x.status === "CLOSED").length,
      dueToday,
      open,
      overdue,
      p1,
      resolvedWeek,
      total,
      unassigned,
      visible: visibleIssues.length,
      workflowCounts,
    };
  }, [issues, visibleIssues.length]);

  const issueWorkflowTabs = useMemo(
    () => [
      { label: "Open", status: "OPEN" as const, workflow: "all" as const, count: metrics.open },
      {
        label: "New",
        status: "OPEN" as const,
        workflow: "NEW" as const,
        count: metrics.workflowCounts.NEW,
      },
      {
        label: "Triaged",
        status: "OPEN" as const,
        workflow: "TRIAGED" as const,
        count: metrics.workflowCounts.TRIAGED,
      },
      {
        label: "In progress",
        status: "OPEN" as const,
        workflow: "IN_PROGRESS" as const,
        count: metrics.workflowCounts.IN_PROGRESS,
      },
      {
        label: "Blocked",
        status: "OPEN" as const,
        workflow: "BLOCKED" as const,
        count: metrics.workflowCounts.BLOCKED,
        danger: true,
      },
      {
        label: "Resolved",
        status: "OPEN" as const,
        workflow: "RESOLVED" as const,
        count: metrics.workflowCounts.RESOLVED,
      },
      {
        label: "Closed",
        status: "CLOSED" as const,
        workflow: "all" as const,
        count: metrics.closed,
      },
    ],
    [metrics],
  );

  const exportVisibleIssuesCsv = () => {
    const header = [
      "id",
      "status",
      "workflow_state",
      "priority",
      "owner",
      "project_id",
      "door_id",
      "door_unit_label",
      "due_at",
      "is_overdue",
      "title",
      "details",
      "updated_at",
    ];
    const rows = visibleIssues.map((issue) =>
      [
        issue.id,
        issue.status,
        issue.workflow_state,
        issue.priority,
        issue.owner_user_id
          ? ownerNameByUserId.get(issue.owner_user_id) || issue.owner_user_id
          : "unassigned",
        issue.project_id,
        issue.door_id,
        issue.door_unit_label,
        issue.due_at,
        issue.is_overdue ? "true" : "false",
        issue.title,
        issue.details,
        issue.updated_at,
      ]
        .map(csvCell)
        .join(","),
    );
    downloadTextFile(
      `dimax-issues-${new Date().toISOString().slice(0, 10)}.csv`,
      [header.join(","), ...rows].join("\n"),
      "text/csv;charset=utf-8",
    );
  };

  const saveWorkflow = () => {
    if (!canManageIssues) return;
    if (!selectedIssue) {
      return;
    }
    const payload = buildWorkflowPatch(selectedIssue, form);
    if (Object.keys(payload).length === 0) {
      setSaveNote(null);
      setFormError(
        copy(
          "No changes to save",
          "\u041d\u0435\u0442 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439 \u0434\u043b\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f",
          "\u05d0\u05d9\u05df \u05e9\u05d9\u05e0\u05d5\u05d9\u05d9\u05dd \u05dc\u05e9\u05de\u05d9\u05e8\u05d4",
        ),
      );
      return;
    }
    setFormError(null);
    setSaveNote(null);
    workflowMutation.mutate(payload);
  };

  const bulkWorkflowMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (!canManageIssues) {
        throw new Error("Issue write access is required.");
      }
      const issueIds = visibleIssues.map((item) => item.id);
      if (issueIds.length === 0) {
        throw new Error(
          copy(
            "No filtered issues to update",
            "\u041d\u0435\u0442 \u043e\u0442\u0444\u0438\u043b\u044c\u0442\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u043f\u0440\u043e\u0431\u043b\u0435\u043c \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f",
            "\u05d0\u05d9\u05df \u05ea\u05e7\u05dc\u05d5\u05ea \u05de\u05e1\u05d5\u05e0\u05e0\u05d5\u05ea \u05dc\u05e2\u05d3\u05db\u05d5\u05df",
          ),
        );
      }
      return apiFetch<AdminIssuesBulkWorkflowUpdateResponse>(
        "/api/v1/admin/issues/workflow/bulk",
        {
          method: "PATCH",
          body: JSON.stringify({
            issue_ids: issueIds,
            ...payload,
          }),
        },
      );
    },
    onSuccess: async (result) => {
      setFormError(null);
      const skipped = result.missing_issue_ids?.length || 0;
      setSaveNote(
        skipped > 0
          ? copy(
              `Bulk updated ${result.updated} issues, skipped ${skipped}`,
              "\u041c\u0430\u0441\u0441\u043e\u0432\u043e \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e ${result.updated} \u043f\u0440\u043e\u0431\u043b\u0435\u043c, \u043f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043e ${skipped}",
              "\u05e2\u05d5\u05d3\u05db\u05e0\u05d5 ${result.updated} \u05ea\u05e7\u05dc\u05d5\u05ea, \u05d3\u05d5\u05dc\u05d2\u05d5 ${skipped}",
            )
          : copy(
              `Bulk updated ${result.updated} issues`,
              "\u041c\u0430\u0441\u0441\u043e\u0432\u043e \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e ${result.updated} \u043f\u0440\u043e\u0431\u043b\u0435\u043c",
              "\u05e2\u05d5\u05d3\u05db\u05e0\u05d5 ${result.updated} \u05ea\u05e7\u05dc\u05d5\u05ea",
            ),
      );
      await queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (error) => {
      setSaveNote(null);
      setFormError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось применить массовое обновление."
            : locale === "he"
              ? "לא ניתן להחיל עדכון מרוכז."
              : "Failed to apply bulk update",
        ),
      );
    },
  });

  const applyWorkflowToFiltered = () => {
    if (!canManageIssues) return;
    if (!selectedIssue) {
      return;
    }
    const payload = buildWorkflowPatch(selectedIssue, form);
    if (Object.keys(payload).length === 0) {
      setSaveNote(null);
      setFormError(
        copy(
          "No changes to apply in bulk",
          "\u041d\u0435\u0442 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439 \u0434\u043b\u044f \u043c\u0430\u0441\u0441\u043e\u0432\u043e\u0433\u043e \u043f\u0440\u0438\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
          "\u05d0\u05d9\u05df \u05e9\u05d9\u05e0\u05d5\u05d9\u05d9\u05dd \u05dc\u05d4\u05d7\u05dc\u05d4 \u05de\u05e8\u05d5\u05db\u05d6\u05ea",
        ),
      );
      return;
    }
    if (visibleIssues.length === 0) {
      setSaveNote(null);
      setFormError(
        copy(
          "No filtered issues to update",
          "\u041d\u0435\u0442 \u043e\u0442\u0444\u0438\u043b\u044c\u0442\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u043f\u0440\u043e\u0431\u043b\u0435\u043c \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f",
          "\u05d0\u05d9\u05df \u05ea\u05e7\u05dc\u05d5\u05ea \u05de\u05e1\u05d5\u05e0\u05e0\u05d5\u05ea \u05dc\u05e2\u05d3\u05db\u05d5\u05df",
        ),
      );
      return;
    }
    setFormError(null);
    setSaveNote(null);
    bulkWorkflowMutation.mutate(payload);
  };
  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <section
          className="rounded-lg border border-border bg-surface"
          data-testid="issues-control-v26"
        >
          <div className="px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-link">
                  {copy("Dashboard", "Главная", "ראשי")} <span className="text-text-tertiary">#</span>{" "}
                  <span className="text-text">{copy("Issues", "Проблемы", "תקלות")}</span>
                </div>
                <h1 className="mt-3 text-[30px] font-semibold leading-tight text-text md:text-[38px]">
                  {copy("Issues", "Проблемы", "תקלות")}
                </h1>
                <p className="mt-2 text-[13px] leading-6 text-text-secondary">
                  <span className="font-semibold text-status-problem-fg">
                    {metrics.overdue} {copy("SLA breached", "Нарушено соглашение об уровне обслуживания", "SLA הופר")}
                  </span>{" "}
                  - <b className="font-semibold text-text">{metrics.open}</b>{" "}
                  {copy("open -", "открыто -", "פתוח -")}{" "}
                  <b className="font-semibold text-text">
                    {metrics.unassigned}
                  </b>{" "}
                  {copy("unassigned -", "не назначен -", "לא הוקצה -")}{" "}
                  <b className="font-semibold text-text">{metrics.visible}</b>{" "}
                  {copy("visible in current scope", "виден в текущей области", "גלוי בהיקף הנוכחי")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportVisibleIssuesCsv}
                  disabled={visibleIssues.length === 0}
                  className="dmx-secondary-action disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" strokeWidth={1.8} />
                  {copy("Export CSV", "Экспорт в CSV", "ייצא CSV")}
                </button>
                <a
                  href="/reports#reports-issues-analytics"
                  className="dmx-secondary-action"
                >
                  <FileText className="h-4 w-4" strokeWidth={1.8} />
                  {copy("Report view", "Просмотр отчета", "תצוגת דוח")}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    void Promise.all([
                      issuesQuery.refetch(),
                      installersQuery.refetch(),
                    ]);
                  }}
                  className="dmx-secondary-action"
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                  {tt("common.refresh")}
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  tone: "problem",
                  label: "SLA breached",
                  value: metrics.overdue,
                  note: `${metrics.p1} P1 in current scope`,
                },
                {
                  tone: "warning",
                  label: "Due today",
                  value: metrics.dueToday,
                  note: "within 24h window",
                },
                {
                  tone: "accent",
                  label: "Unassigned",
                  value: metrics.unassigned,
                  note: "needs dispatcher triage",
                },
                {
                  tone: "ok",
                  label: "Resolved / week",
                  value: metrics.resolvedWeek,
                  note: "closed or resolved recently",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-border bg-surface-subtle px-4 py-3",
                    item.tone === "problem" && "border-status-problem-border",
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-3 start-0 w-[3px] rounded-e-sm",
                      item.tone === "problem" && "bg-status-problem-fg",
                      item.tone === "warning" && "bg-status-warning-fg",
                      item.tone === "accent" && "bg-accent",
                      item.tone === "ok" && "bg-status-ok-fg",
                    )}
                  />
                  <div className="ps-2">
                    <div className="truncate text-[10.5px] font-semibold uppercase tracking-[0.04em] text-text-secondary">
                      {item.label}
                    </div>
                    <div
                      className={cn(
                        "mt-3 text-[30px] font-semibold leading-none text-text",
                        item.tone === "problem" && "text-status-problem-fg",
                        item.tone === "warning" && "text-status-warning-fg",
                        item.tone === "ok" && "text-status-ok-fg",
                      )}
                    >
                      {item.value}
                    </div>
                    <div className="mt-2 truncate text-[12px] text-text-secondary">
                      {item.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-t border-border-subtle px-3 pt-1">
            {issueWorkflowTabs.map((tab) => {
              const active =
                statusFilter === tab.status && workflowFilter === tab.workflow;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.status);
                    setWorkflowFilter(tab.workflow);
                    setOverdueOnly(false);
                  }}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-[12.5px] font-semibold text-text-secondary transition-colors hover:text-text",
                    active && "border-text text-text",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "inline-flex min-w-5 items-center justify-center rounded-full bg-surface-subtle px-1.5 py-0.5 text-[10.5px] text-text-secondary",
                      active && "bg-text text-text-inverse",
                      tab.danger &&
                        !active &&
                        "bg-status-problem-bg text-status-problem-fg",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle bg-surface-subtle px-4 py-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                aria-label={copy("Issue search", "Поиск проблем", "חיפוש תקלות")}
                value={issueSearch}
                onChange={(event) => setIssueSearch(event.target.value)}
                placeholder={copy("Search issue, project, door...", "Поиск по проблеме, объекту или двери...", "חיפוש לפי תקלה, פרויקט או דלת...")}
                className="h-10 w-full rounded-full border border-border bg-surface ps-9 pe-3 text-[12.5px] text-text placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
              />
            </div>
            <select
              aria-label={copy("Status filter", "Фильтр по статусу", "סינון לפי סטטוס")}
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | IssueStatus)
              }
              className="h-10 min-w-[150px] rounded-full border border-border bg-surface px-3 text-[12px] text-text focus:border-border-strong focus:outline-none"
            >
              <option value="all">{tt("issues.allStatuses")}</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              aria-label={copy("Workflow filter", "Фильтр по этапу", "סינון לפי שלב")}
              value={workflowFilter}
              onChange={(e) =>
                setWorkflowFilter(e.target.value as "all" | IssueWorkflowState)
              }
              className="h-10 min-w-[170px] rounded-full border border-border bg-surface px-3 text-[12px] text-text focus:border-border-strong focus:outline-none"
            >
              <option value="all">{tt("issues.allWorkflowStates")}</option>
              {WORKFLOW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="min-w-[200px]">
              <input
                aria-label={copy("Owner filter", "Фильтр по ответственному", "סינון לפי אחראי")}
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                placeholder={tt("issues.ownerUserUuid")}
                list="issues-owner-filter-options"
                className="h-10 w-full rounded-full border border-border bg-surface px-3 text-[12px] text-text placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
              />
              <datalist id="issues-owner-filter-options">
                {linkedOwners.map((owner) => (
                  <option key={owner.user_id} value={owner.user_id}>
                    {owner.full_name}
                  </option>
                ))}
              </datalist>
            </div>
            <label className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[12px] text-text-secondary">
              <input
                aria-label={copy("Overdue only", "Только просроченные", "באיחור בלבד")}
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
              />
              {tt("issues.overdueOnly")}
            </label>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setWorkflowFilter("all");
                setOwnerFilter("");
                setIssueSearch("");
                setOverdueOnly(false);
              }}
              className="dmx-secondary-action h-10"
            >
              <FilterX className="w-3.5 h-3.5" />
              {t("issues.resetFilters")}
            </button>
          </div>
        </section>

        {issuesQuery.isError && (
          <div className="flex items-start gap-2 rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-[13px] text-status-problem-fg">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {readableApiError(
                issuesQuery.error,
                locale,
                t("issues.failedToLoad"),
              )}
            </span>
          </div>
        )}
        {!canManageIssues && (
          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-[13px] text-status-warning-fg">
            {t("issues.readOnlyNotice")}
          </div>
        )}
        {issueDeepLinkMissing && issueIdParam ? (
          <div className="flex flex-col gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-[13px] text-status-warning-fg sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {copy(
                  `Requested issue ${issueIdParam} is not available in the current issue list. Another issue was not selected automatically.`,
                  `Проблема ${issueIdParam} недоступна в текущем списке. Другая проблема не была выбрана автоматически.`,
                  `התקלה ${issueIdParam} אינה זמינה ברשימה הנוכחית. תקלה אחרת לא נבחרה אוטומטית.`,
                )}
              </span>
            </div>
            <button
              type="button"
              className="dmx-secondary-action shrink-0"
              onClick={() => {
                setSelectedIssueId(null);
                setIssueDeepLinkMissing(false);
                setDismissedIssueDeepLinkId(issueIdParam);
              }}
            >
              {copy("Show issue list", "Показать список проблем", "הצג רשימת תקלות")}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-[24px_52px_minmax(0,2fr)_108px_minmax(96px,0.8fr)_112px_64px] gap-2 border-b border-border-subtle bg-surface-subtle px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-text-secondary">
                <span />
                <span>{copy("Prio", "Приоритет", "עדיפות")}</span>
                <span>{copy("Issue", "Проблема", "תקלה")}</span>
                <span>{copy("Workflow", "Этап", "שלב")}</span>
                <span>{copy("Owner", "Владелец", "בעלים")}</span>
                <span className="text-end">{copy("SLA / Due", "SLA / Срок выполнения", "SLA / מועד")}</span>
                <span />
              </div>
            </div>
            {issuesQuery.isLoading ? (
              <div className="px-4 py-6 text-[13px] text-text-secondary">
                {t("issues.loading")}
              </div>
            ) : visibleIssues.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-text-secondary">
                {issueSearch.trim()
                  ? "No issues match current search and filters."
                  : t("issues.empty")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                {visibleIssues.map((issue) => {
                  const active = issue.id === selectedIssueId;
                  const ownerName = issue.owner_user_id
                    ? ownerNameByUserId.get(issue.owner_user_id) ||
                      issue.owner_user_id
                    : "";
                  const dueText = issue.is_overdue
                    ? tt("issues.overdue")
                    : issue.due_at
                      ? formatDateTime(issue.due_at)
                      : "No due date";
                  return (
                    <div
                      key={issue.id}
                      className={cn(
                        "grid min-w-[760px] grid-cols-[24px_52px_minmax(0,2fr)_108px_minmax(96px,0.8fr)_112px_64px] gap-2 border-b border-border-subtle px-4 py-3 text-[12px] transition-colors last:border-b-0 hover:bg-surface-subtle",
                        active && "bg-[var(--dmx-accent-tint)]",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={`Select issue ${shortId(issue.id)}`}
                        onClick={() => setSelectedIssueId(issue.id)}
                        className={cn(
                          "mt-1 h-4 w-4 rounded border border-border-strong bg-surface",
                          active && "border-text bg-text",
                        )}
                      >
                        <span className="sr-only">{copy("Select", "Выбрать", "בחר")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedIssueId(issue.id)}
                        className={cn(
                          "mt-0.5 inline-flex h-8 w-10 items-center justify-center rounded-md border text-[11px] font-semibold",
                          PRIORITY_CLASS[issue.priority],
                        )}
                      >
                        {issue.priority}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedIssueId(issue.id)}
                        className="min-w-0 text-start"
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span
                            className="truncate text-[13px] font-semibold text-text"
                            title={issue.title || issue.details || "-"}
                          >
                            {issue.title || issue.details || "-"}
                          </span>
                          <span className="text-[10.5px] text-text-secondary">
                            #{shortId(issue.id)}
                          </span>
                        </span>
                        <span
                          className="mt-1 block truncate text-[11px] text-text-secondary"
                          title={issue.door_id}
                        >
                          {issue.door_unit_label} {copy("- project", "- проект", "- פרויקט")}{" "}
                          {shortId(issue.project_id)} {copy("- door", "- дверь", "- דלת")}{" "}
                          {shortId(issue.door_id)}
                        </span>
                        {issue.details ? (
                          <span className="mt-2 block truncate text-[11px] text-text-secondary">
                            <span className="font-medium text-text">{copy("Note:", "Примечание:", "הערה:")}</span>{" "}
                            {issue.details}
                          </span>
                        ) : null}
                      </button>
                      <div>
                        <span
                          className={cn(
                            "mt-0.5 inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-semibold",
                            issue.workflow_state === "BLOCKED" &&
                              "bg-status-blocked-bg text-status-blocked-fg",
                            issue.workflow_state === "NEW" &&
                              "bg-status-progress-bg text-status-progress-fg",
                            issue.workflow_state === "TRIAGED" &&
                              "bg-[hsl(var(--accent)/0.12)] text-accent",
                            issue.workflow_state === "IN_PROGRESS" &&
                              "bg-status-progress-bg text-status-progress-fg",
                            issue.workflow_state === "RESOLVED" &&
                              "bg-status-ok-bg text-status-ok-fg",
                            issue.workflow_state === "CLOSED" &&
                              "bg-surface-subtle text-text-secondary",
                          )}
                        >
                          {issue.workflow_state.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2">
                        {ownerName ? (
                          <>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dmx-accent-tint)] text-[10px] font-semibold text-accent">
                              {initialsFromName(ownerName)}
                            </span>
                            <span className="truncate text-[11.5px] font-medium text-text">
                              {ownerName}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11.5px] italic text-text-tertiary">
                            {copy("unassigned", "не назначено", "לא משויך")}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 min-w-0 text-end">
                        <div
                          className={cn(
                            "truncate text-[12px] font-semibold",
                            issue.is_overdue
                              ? "text-status-problem-fg"
                              : "text-status-ok-fg",
                          )}
                        >
                          {dueText}
                        </div>
                        <div className="mt-0.5 truncate text-[10.5px] text-text-tertiary">
                          {t("issues.updated")}:{" "}
                          {formatDateTime(issue.updated_at)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedIssueId(issue.id)}
                        className="mt-0.5 inline-flex h-8 items-center justify-center rounded-full border border-border bg-surface px-2 text-[11.5px] font-semibold text-text-secondary hover:bg-surface-subtle hover:text-text"
                      >
                        {copy("Edit", "Редактировать", "ערוך")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-[13.5px] font-medium text-text">
                {tt("issues.workflowEditor")}
              </h3>
              {selectedIssue ? (
                <div className="text-[11px] text-text-secondary">
                  {copy("Issue #", "Проблема №", "תקלה מס׳")}{shortId(selectedIssue.id)}
                </div>
              ) : null}
            </div>

            {!selectedIssue ? (
              <div className="text-[13px] text-text-secondary">
                {t("issues.selectIssue")}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px]">
                  <div className="text-text-secondary">
                    {locale === "ru"
                      ? "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u0430\u044f \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0430"
                      : locale === "he"
                        ? "\u05d4\u05ea\u05e7\u05dc\u05d4 \u05e9\u05e0\u05d1\u05d7\u05e8\u05d4"
                        : "Selected issue"}
                  </div>
                  <div className="font-medium mt-0.5">
                    {selectedIssue.door_unit_label} / {selectedIssue.project_id}
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] font-medium text-text">
                        {locale === "ru"
                          ? "Комментарии"
                          : locale === "he"
                            ? "הערות"
                            : "Comments"}
                      </div>
                      <div className="text-[11px] text-text-secondary tabular-nums">
                        {(issueCommentsQuery.data || []).length}
                      </div>
                    </div>
                    {issueCommentsQuery.isLoading ? (
                      <div className="text-[12px] text-text-secondary">
                        {locale === "ru"
                          ? "Загружаем комментарии..."
                          : locale === "he"
                            ? "טוען הערות..."
                            : "Loading comments..."}
                      </div>
                    ) : issueCommentsQuery.data &&
                      issueCommentsQuery.data.length > 0 ? (
                      <div className="space-y-2">
                        {issueCommentsQuery.data.slice(0, 4).map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-lg border border-border-subtle bg-surface px-3 py-2"
                          >
                            <div className="text-[11px] text-text-secondary">
                              {comment.author_name ||
                                comment.author_user_id ||
                                "System"}
                              {comment.created_at
                                ? ` • ${formatDateTime(comment.created_at)}`
                                : ""}
                            </div>
                            <div className="mt-1 text-[12px] text-text">
                              {comment.body || "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-text-secondary">
                        {locale === "ru"
                          ? "Комментариев пока нет."
                          : locale === "he"
                            ? "עדיין אין הערות."
                            : "No comments yet."}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] font-medium text-text">
                        {locale === "ru"
                          ? "Медиа"
                          : locale === "he"
                            ? "מדיה"
                            : "Media"}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIssueMediaOpen((current) => !current)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[11px] font-medium transition-colors hover:bg-surface-sunken"
                      >
                        {issueMediaOpen
                          ? locale === "ru"
                            ? "Скрыть"
                            : locale === "he"
                              ? "הסתר"
                              : "Hide"
                          : locale === "ru"
                            ? "Показать"
                            : locale === "he"
                              ? "הצג"
                              : "Show"}
                      </button>
                    </div>
                    {!issueMediaOpen ? (
                      <div className="text-[12px] text-text-secondary">
                        {locale === "ru"
                          ? "Открой медиа, чтобы увидеть вложения по проблеме."
                          : locale === "he"
                            ? "פתח מדיה כדי לראות קבצים מצורפים לבעיה."
                            : "Open media to inspect issue attachments."}
                      </div>
                    ) : issueMediaQuery.isLoading ? (
                      <div className="text-[12px] text-text-secondary">
                        {locale === "ru"
                          ? "Загружаем медиа..."
                          : locale === "he"
                            ? "טוען מדיה..."
                            : "Loading media..."}
                      </div>
                    ) : issueMediaQuery.data &&
                      issueMediaQuery.data.length > 0 ? (
                      <div className="space-y-2">
                        {issueMediaQuery.data
                          .slice(0, 4)
                          .map((media, index) => (
                            <div
                              key={media.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[12px] font-medium text-text">
                                  {media.file_name ||
                                    (locale === "ru"
                                      ? `Файл ${index + 1}`
                                      : locale === "he"
                                        ? `קובץ ${index + 1}`
                                        : `File ${index + 1}`)}
                                </div>
                                <div className="text-[11px] text-text-secondary">
                                  {[
                                    media.content_type,
                                    media.created_at
                                      ? formatDateTime(media.created_at)
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" • ") || "-"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => openMediaMutation.mutate(media)}
                                disabled={openMediaMutation.isPending}
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[11px] font-medium transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {openMediaMutation.isPending
                                  ? locale === "ru"
                                    ? "Открываем..."
                                    : locale === "he"
                                      ? "פותח..."
                                      : "Opening..."
                                  : locale === "ru"
                                    ? "Открыть"
                                    : locale === "he"
                                      ? "פתח"
                                      : "Open"}
                              </button>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-text-secondary">
                        {locale === "ru"
                          ? "Вложений пока нет."
                          : locale === "he"
                            ? "עדיין אין קבצים מצורפים."
                            : "No media yet."}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label={copy("Issue status", "Статус проблемы", "סטטוס תקלה")}
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as IssueStatus,
                      }))
                    }
                    disabled={!canManageIssues}
                    className="control-input h-9 text-[12px]"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={copy("Issue priority", "Приоритет проблемы", "עדיפות תקלה")}
                    value={form.priority}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        priority: e.target.value as IssuePriority,
                      }))
                    }
                    disabled={!canManageIssues}
                    className="control-input h-9 text-[12px]"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  aria-label={copy("Issue workflow state", "Этап обработки проблемы", "שלב טיפול בתקלה")}
                  value={form.workflow_state}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      workflow_state: e.target.value as IssueWorkflowState,
                    }))
                  }
                  disabled={!canManageIssues}
                  className="control-input h-9 text-[12px]"
                >
                  {WORKFLOW_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-2.5">
                  <div className="text-[12px] text-text-secondary">
                    {tt("issues.ownerUser")}
                  </div>
                  <select
                    aria-label={copy("Issue owner select", "Выбрать ответственного", "בחירת אחראי לתקלה")}
                    value={
                      linkedOwners.some((x) => x.user_id === form.owner_user_id)
                        ? form.owner_user_id
                        : ""
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        owner_user_id: e.target.value,
                      }))
                    }
                    disabled={!canManageIssues}
                    className="control-input h-9 text-[12px]"
                  >
                    <option value="">{t("issues.unassigned")}</option>
                    {linkedOwners.map((owner) => (
                      <option key={owner.user_id} value={owner.user_id}>
                        {owner.full_name} ({shortId(owner.user_id)})
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={copy("Issue owner input", "ID ответственного", "מזהה אחראי")}
                    value={form.owner_user_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        owner_user_id: e.target.value,
                      }))
                    }
                    placeholder={t("issues.manualOwnerUuid")}
                    disabled={!canManageIssues}
                    className="control-input h-9 text-[12px]"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-text-secondary inline-flex items-center gap-1.5 mb-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {tt("issues.dueAt")}
                  </label>
                  <input
                    aria-label={copy("Issue due at", "Срок решения проблемы", "מועד טיפול בתקלה")}
                    type="datetime-local"
                    value={form.due_at}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, due_at: e.target.value }))
                    }
                    disabled={!canManageIssues}
                    className="control-input h-9 text-[12px]"
                  />
                </div>

                <textarea
                  aria-label={copy("Issue details", "Описание проблемы", "פרטי התקלה")}
                  value={form.details}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, details: e.target.value }))
                  }
                  rows={4}
                  placeholder={tt("issues.workflowNotes")}
                  disabled={!canManageIssues}
                  className="control-textarea text-[12px]"
                />

                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[11px] text-text-secondary">
                  {t("issues.created")}:{" "}
                  {formatDateTime(selectedIssue.created_at)} |{" "}
                  {t("issues.updated")}:{" "}
                  {formatDateTime(selectedIssue.updated_at)} |{" "}
                  {tt("issues.currentDue")}:{" "}
                  {formatDateTime(selectedIssue.due_at)}
                </div>

                {formError && (
                  <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2 text-[12px] text-[hsl(var(--destructive))]">
                    {formError}
                  </div>
                )}
                {saveNote && (
                  <div className="rounded-lg border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] px-3 py-2 text-[12px] text-[hsl(var(--success))] inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {saveNote}
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={saveWorkflow}
                    disabled={!canManageIssues || workflowMutation.isPending}
                    title={privilegedActionHint}
                    className="h-10 w-full rounded-lg bg-accent text-accent-foreground text-[13px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {workflowMutation.isPending
                      ? tt("issues.saving")
                      : tt("issues.saveWorkflow")}
                  </button>
                  <button
                    type="button"
                    onClick={applyWorkflowToFiltered}
                    disabled={
                      !canManageIssues ||
                      bulkWorkflowMutation.isPending ||
                      visibleIssues.length === 0
                    }
                    title={privilegedActionHint}
                    className="h-10 w-full rounded-lg border border-border bg-surface text-[13px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {bulkWorkflowMutation.isPending
                      ? tt("issues.applyingBulk")
                      : `${tt("issues.applyToFiltered")} (${visibleIssues.length})`}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
