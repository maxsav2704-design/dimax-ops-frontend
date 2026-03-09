import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FilterX,
  RefreshCw,
  Save,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useUserRole } from "@/hooks/use-user-role";
import { apiFetch } from "@/lib/api";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { cn } from "@/lib/utils";

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

type AdminIssuesResponse = {
  items: AdminIssue[];
};

type AdminIssuesBulkWorkflowUpdateResponse = {
  updated: number;
  missing_issue_ids: string[];
  items: AdminIssue[];
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
  P1: "bg-[hsl(var(--destructive)/0.14)] text-[hsl(var(--destructive))]",
  P2: "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning-foreground))]",
  P3: "bg-[hsl(var(--accent)/0.16)] text-accent",
  P4: "bg-muted text-muted-foreground",
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

function buildWorkflowPatch(
  issue: AdminIssue,
  form: WorkflowFormState
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
  const currentDueAtIso = issue.due_at ? new Date(issue.due_at).toISOString() : null;
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

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const issueIdParam = searchParams?.get("issue_id")?.trim() || null;
  const [statusFilter, setStatusFilter] = useState<"all" | IssueStatus>("all");
  const [workflowFilter, setWorkflowFilter] = useState<"all" | IssueWorkflowState>("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(issueIdParam);
  const [form, setForm] = useState<WorkflowFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const userRole = useUserRole();
  const canManageIssues = canRunPrivilegedAdminActions(userRole);
  const privilegedActionHint = canManageIssues
    ? undefined
    : "Installer role is read-only in issues";

  const installersQuery = useQuery({
    queryKey: ["issues-owner-installers"],
    queryFn: () => apiFetch<Installer[]>("/api/v1/admin/installers?is_active=true&limit=200"),
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
      options.push({ user_id: installer.user_id, full_name: installer.full_name });
    }
    options.sort((a, b) => a.full_name.localeCompare(b.full_name, "en"));
    return options;
  }, [installersQuery.data]);

  const issuesQuery = useQuery({
    queryKey: ["issues", statusFilter, workflowFilter, overdueOnly, ownerFilter.trim()],
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
      return apiFetch<AdminIssuesResponse>(`/api/v1/admin/issues?${params.toString()}`);
    },
    refetchInterval: 30_000,
  });

  const workflowMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (!selectedIssueId) {
        throw new Error("Issue is not selected");
      }
      return apiFetch<AdminIssue>(`/api/v1/admin/issues/${selectedIssueId}/workflow`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setSaveNote("Workflow updated");
      await queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (error) => {
      setSaveNote(null);
      setFormError(error instanceof Error ? error.message : "Failed to save workflow");
    },
  });

  const issues = issuesQuery.data?.items || [];
  const selectedIssue = useMemo(
    () => issues.find((item) => item.id === selectedIssueId) || null,
    [issues, selectedIssueId]
  );

  useEffect(() => {
    if (!issueIdParam) {
      return;
    }
    setStatusFilter("all");
    setWorkflowFilter("all");
    setOwnerFilter("");
    setOverdueOnly(false);
    setSelectedIssueId(issueIdParam);
  }, [issueIdParam]);

  useEffect(() => {
    if (issues.length === 0) {
      return;
    }
    if (!selectedIssueId && issues.length > 0) {
      setSelectedIssueId(issues[0].id);
      return;
    }
    if (selectedIssueId && !selectedIssue) {
      setSelectedIssueId(issues[0]?.id || null);
    }
  }, [issues, selectedIssue, selectedIssueId]);

  useEffect(() => {
    if (!selectedIssue) {
      setForm(emptyForm());
      return;
    }
    setForm(toForm(selectedIssue));
    setFormError(null);
    setSaveNote(null);
  }, [selectedIssue?.id, selectedIssue?.updated_at]);

  const metrics = useMemo(() => {
    const total = issues.length;
    const open = issues.filter((x) => x.status === "OPEN").length;
    const overdue = issues.filter((x) => x.is_overdue).length;
    const p1 = issues.filter((x) => x.priority === "P1").length;
    return { total, open, overdue, p1 };
  }, [issues]);

  const saveWorkflow = () => {
    if (!selectedIssue) {
      return;
    }
    const payload = buildWorkflowPatch(selectedIssue, form);
    if (Object.keys(payload).length === 0) {
      setSaveNote(null);
      setFormError("No changes to save");
      return;
    }
    setFormError(null);
    setSaveNote(null);
    workflowMutation.mutate(payload);
  };

  const bulkWorkflowMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      const issueIds = issues.map((item) => item.id);
      if (issueIds.length === 0) {
        throw new Error("No filtered issues to update");
      }
      return apiFetch<AdminIssuesBulkWorkflowUpdateResponse>(
        "/api/v1/admin/issues/workflow/bulk",
        {
          method: "PATCH",
          body: JSON.stringify({
            issue_ids: issueIds,
            ...payload,
          }),
        }
      );
    },
    onSuccess: async (result) => {
      setFormError(null);
      const skipped = result.missing_issue_ids?.length || 0;
      setSaveNote(
        skipped > 0
          ? `Bulk updated ${result.updated} issues, skipped ${skipped}`
          : `Bulk updated ${result.updated} issues`
      );
      await queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (error) => {
      setSaveNote(null);
      setFormError(error instanceof Error ? error.message : "Failed to apply bulk update");
    },
  });

  const applyWorkflowToFiltered = () => {
    if (!selectedIssue) {
      return;
    }
    const payload = buildWorkflowPatch(selectedIssue, form);
    if (Object.keys(payload).length === 0) {
      setSaveNote(null);
      setFormError("No changes to apply in bulk");
      return;
    }
    if (issues.length === 0) {
      setSaveNote(null);
      setFormError("No filtered issues to update");
      return;
    }
    setFormError(null);
    setSaveNote(null);
    bulkWorkflowMutation.mutate(payload);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Issues</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Incident workflow, ownership and SLA due-date control
            </p>
          </div>
          <button
            onClick={() => {
              void Promise.all([issuesQuery.refetch(), installersQuery.refetch()]);
            }}
            className="h-9 px-4 rounded-lg border border-border bg-card text-[13px] font-medium inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</div>
            <div className="text-[24px] font-semibold">{metrics.total}</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Open</div>
            <div className="text-[24px] font-semibold">{metrics.open}</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overdue</div>
            <div className="text-[24px] font-semibold text-[hsl(var(--destructive))]">
              {metrics.overdue}
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Priority P1
            </div>
            <div className="text-[24px] font-semibold text-[hsl(var(--warning-foreground))]">
              {metrics.p1}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
          <select
            aria-label="Status filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | IssueStatus)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            aria-label="Workflow filter"
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value as "all" | IssueWorkflowState)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
          >
            <option value="all">All workflow states</option>
            {WORKFLOW_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div>
            <input
              aria-label="Owner filter"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              placeholder="Owner user UUID"
              list="issues-owner-filter-options"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px]"
            />
            <datalist id="issues-owner-filter-options">
              {linkedOwners.map((owner) => (
                <option key={owner.user_id} value={owner.user_id}>
                  {owner.full_name}
                </option>
              ))}
            </datalist>
          </div>
          <label className="h-9 rounded-lg border border-border bg-background px-3 text-[12px] inline-flex items-center gap-2">
            <input
              aria-label="Overdue only"
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            Overdue only
          </label>
          <button
            onClick={() => {
              setStatusFilter("all");
              setWorkflowFilter("all");
              setOwnerFilter("");
              setOverdueOnly(false);
            }}
            className="h-9 rounded-lg border border-border bg-card text-[12px] inline-flex items-center justify-center gap-1"
          >
            <FilterX className="w-3.5 h-3.5" />
            Reset filters
          </button>
        </div>

        {issuesQuery.isError && (
          <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {issuesQuery.error instanceof Error
                ? issuesQuery.error.message
                : "Failed to load issues"}
            </span>
          </div>
        )}
        {!canManageIssues && (
          <div className="rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))]">
            Installer role has read-only access to issue workflow controls.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
          <section className="glass-card rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[90px_92px_115px_100px_140px_1fr_150px] gap-2 px-3 py-2 border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>Status</span>
              <span>Priority</span>
              <span>Workflow</span>
              <span>Overdue</span>
              <span>Unit</span>
              <span>Title</span>
              <span>Updated</span>
            </div>
            {issuesQuery.isLoading ? (
              <div className="px-4 py-6 text-[13px] text-muted-foreground">Loading issues...</div>
            ) : issues.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-muted-foreground">No issues found.</div>
            ) : (
              issues.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  className={cn(
                    "w-full text-left grid grid-cols-[90px_92px_115px_100px_140px_1fr_150px] gap-2 px-3 py-2.5 border-t border-border/70 text-[12px] row-hover",
                    issue.id === selectedIssueId && "bg-[hsl(var(--accent)/0.10)]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex w-fit px-1.5 py-0.5 rounded",
                      issue.status === "OPEN"
                        ? "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning-foreground))]"
                        : "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                    )}
                  >
                    {issue.status}
                  </span>
                  <span
                    className={cn(
                      "inline-flex w-fit px-1.5 py-0.5 rounded font-medium",
                      PRIORITY_CLASS[issue.priority]
                    )}
                  >
                    {issue.priority}
                  </span>
                  <span>{issue.workflow_state}</span>
                  <span className={issue.is_overdue ? "text-[hsl(var(--destructive))]" : "text-muted-foreground"}>
                    {issue.is_overdue ? "YES" : "NO"}
                  </span>
                  <span title={issue.door_id}>
                    {issue.door_unit_label} ({shortId(issue.project_id)})
                  </span>
                  <span className="truncate" title={issue.title || issue.details || "-"}>
                    {issue.title || issue.details || "-"}
                  </span>
                  <span className="text-muted-foreground">{formatDateTime(issue.updated_at)}</span>
                </button>
              ))
            )}
          </section>

          <section className="glass-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-[14px] font-semibold">Workflow Editor</h3>
              {selectedIssue ? (
                <div className="text-[11px] text-muted-foreground">Issue #{shortId(selectedIssue.id)}</div>
              ) : null}
            </div>

            {!selectedIssue ? (
              <div className="text-[13px] text-muted-foreground">Select an issue to edit workflow.</div>
            ) : (
              <div className="space-y-3">
                <div className="text-[12px] rounded-lg border border-border bg-background px-3 py-2">
                  <div className="text-muted-foreground">Door / Project</div>
                  <div className="font-medium mt-0.5">
                    {selectedIssue.door_unit_label} / {selectedIssue.project_id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Issue status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value as IssueStatus }))
                    }
                    disabled={!canManageIssues}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Issue priority"
                    value={form.priority}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, priority: e.target.value as IssuePriority }))
                    }
                    disabled={!canManageIssues}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  aria-label="Issue workflow state"
                  value={form.workflow_state}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      workflow_state: e.target.value as IssueWorkflowState,
                    }))
                  }
                  disabled={!canManageIssues}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {WORKFLOW_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
                  <div className="text-[12px] text-muted-foreground">Owner user</div>
                  <select
                    aria-label="Issue owner select"
                    value={linkedOwners.some((x) => x.user_id === form.owner_user_id) ? form.owner_user_id : ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        owner_user_id: e.target.value,
                      }))
                    }
                    disabled={!canManageIssues}
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Unassigned</option>
                    {linkedOwners.map((owner) => (
                      <option key={owner.user_id} value={owner.user_id}>
                        {owner.full_name} ({shortId(owner.user_id)})
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Issue owner input"
                    value={form.owner_user_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        owner_user_id: e.target.value,
                      }))
                    }
                    placeholder="Manual owner UUID"
                    disabled={!canManageIssues}
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-muted-foreground inline-flex items-center gap-1.5 mb-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Due at
                  </label>
                  <input
                    aria-label="Issue due at"
                    type="datetime-local"
                    value={form.due_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, due_at: e.target.value }))}
                    disabled={!canManageIssues}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <textarea
                  aria-label="Issue details"
                  value={form.details}
                  onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
                  rows={4}
                  placeholder="Workflow notes..."
                  disabled={!canManageIssues}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                />

                <div className="text-[11px] text-muted-foreground rounded-lg border border-border bg-background px-3 py-2">
                  Created: {formatDateTime(selectedIssue.created_at)} | Updated:{" "}
                  {formatDateTime(selectedIssue.updated_at)} | Current due:{" "}
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

                <button
                  onClick={saveWorkflow}
                  disabled={!canManageIssues || workflowMutation.isPending}
                  title={privilegedActionHint}
                  className="h-9 w-full rounded-lg bg-accent text-accent-foreground text-[13px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {workflowMutation.isPending ? "Saving..." : "Save Workflow"}
                </button>
                <button
                  onClick={applyWorkflowToFiltered}
                  disabled={!canManageIssues || bulkWorkflowMutation.isPending || issues.length === 0}
                  title={privilegedActionHint}
                  className="h-9 w-full rounded-lg border border-border bg-card text-[13px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {bulkWorkflowMutation.isPending
                    ? "Applying Bulk..."
                    : `Apply To Filtered (${issues.length})`}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}


