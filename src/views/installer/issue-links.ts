export function buildInstallerIssuesHref(
  projectId: string,
  options?: {
    issueStatus?: string | null;
    issueSearch?: string | null;
  }
) {
  const params = new URLSearchParams();
  params.set("door_filter", "WITH_ISSUES");

  const normalizedIssueStatus = options?.issueStatus?.trim();
  if (normalizedIssueStatus) {
    params.set("issue_status", normalizedIssueStatus);
  }

  const normalizedIssueSearch = options?.issueSearch?.trim();
  if (normalizedIssueSearch) {
    params.set("issue_search", normalizedIssueSearch);
  }

  return `/installer/projects/${projectId}?${params.toString()}#project-open-issues`;
}
