export type StatusRamp = "ok" | "problem" | "warning" | "progress" | "blocked" | "draft" | "archived";

export type StatusDomain = "project" | "door" | "issue" | "sync" | "installer" | "generic";

const OK_STATUSES = new Set([
  "OK",
  "READY",
  "DONE",
  "SUCCESS",
  "INSTALLED",
  "RESOLVED",
  "CLOSED",
  "AVAILABLE",
  "ACTIVE",
  "APPLIED",
  "DELIVERED",
]);

const PROBLEM_STATUSES = new Set([
  "PROBLEM",
  "DANGER",
  "ERROR",
  "FAILED",
  "FAILURE",
  "ISSUE_OPEN",
  "OPEN",
  "AUTH_REQUIRED",
]);

const WARNING_STATUSES = new Set([
  "WARN",
  "WARNING",
  "AT_RISK",
  "UNASSIGNED",
  "PARTIAL",
  "BUSY",
  "MISSING_RATE",
  "OVERDUE",
]);

const PROGRESS_STATUSES = new Set([
  "IN_PROGRESS",
  "PENDING",
  "SENT",
  "NEW",
  "ANALYZED",
  "TRIAGED",
  "RETRYING",
]);

const BLOCKED_STATUSES = new Set(["BLOCKED", "LOCKED", "INACTIVE", "CONFLICT"]);
const ARCHIVED_STATUSES = new Set(["ARCHIVED", "CANCELLED", "CANCELED", "SKIPPED_NO_RUN"]);
const DRAFT_STATUSES = new Set(["DRAFT", "NOT_INSTALLED", "NOT_STARTED"]);

export function normalizeStatus(status: string | null | undefined): string {
  return (status || "").trim().toUpperCase();
}

export function getStatusRamp(status: string | null | undefined, domain: StatusDomain = "generic"): StatusRamp {
  const normalized = normalizeStatus(status);

  if (!normalized) {
    return "draft";
  }

  if (domain === "door" && normalized === "NOT_INSTALLED") {
    return "draft";
  }

  if (OK_STATUSES.has(normalized)) {
    return "ok";
  }
  if (PROBLEM_STATUSES.has(normalized)) {
    return "problem";
  }
  if (WARNING_STATUSES.has(normalized)) {
    return "warning";
  }
  if (PROGRESS_STATUSES.has(normalized)) {
    return "progress";
  }
  if (BLOCKED_STATUSES.has(normalized)) {
    return "blocked";
  }
  if (ARCHIVED_STATUSES.has(normalized)) {
    return "archived";
  }
  if (DRAFT_STATUSES.has(normalized)) {
    return "draft";
  }

  return "draft";
}

export function formatStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeStatus(status);
  if (!normalized) {
    return "-";
  }

  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
