import { apiFetch } from "./api";

export const PROJECTS_PAGE_SIZE = 200;

/** Every project of the company: the API pages at most 200 rows, so a plain request would stop at its default of 50. */
export async function fetchAllProjects<T>(): Promise<{ items: T[] }> {
  const items: T[] = [];
  for (let offset = 0; offset < PROJECTS_PAGE_SIZE * 50; offset += PROJECTS_PAGE_SIZE) {
    const response = await apiFetch<{ items: T[] }>(`/api/v1/admin/projects?limit=${PROJECTS_PAGE_SIZE}&offset=${offset}`);
    const page = response?.items || [];
    items.push(...page);
    if (page.length < PROJECTS_PAGE_SIZE) break;
  }
  return { items };
}
