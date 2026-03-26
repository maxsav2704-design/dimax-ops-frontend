export function buildInstallerIssuesHref(
  projectId: string,
  options?: {
    issueStatus?: string | null;
    issueSearch?: string | null;
  }
) {
  const params = new URLSearchParams();
  params.set("project_id", projectId);

  const normalizedIssueStatus = options?.issueStatus?.trim();
  if (normalizedIssueStatus) {
    params.set("issue_status", normalizedIssueStatus);
  }

  const normalizedIssueSearch = options?.issueSearch?.trim();
  if (normalizedIssueSearch) {
    params.set("issue_search", normalizedIssueSearch);
  }

  return `/installer/issues?${params.toString()}`;
}
