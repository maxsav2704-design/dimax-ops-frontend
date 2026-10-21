import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportInboxCard, type ImportInboxItem } from "@/components/projects/ImportInboxCard";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock }));
// Stable hook results, like the real provider: a fresh function per render would re-trigger the card's load effect.
const { i18nStub, copyStub } = vi.hoisted(() => ({ i18nStub: { locale: "en", dir: "ltr" }, copyStub: (en: string) => en }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => i18nStub, useCopy: () => copyStub }));

const INBOX = "/api/v1/admin/projects/import-inbox";

function item(overrides: Partial<ImportInboxItem>): ImportInboxItem {
  return {
    id: "item-1",
    source: "EMAIL",
    source_ref: "<m1@factory>",
    filename: "manifest.xlsx",
    status: "NEEDS_PROJECT",
    detected_profile: "auto_v1",
    order_numbers: ["AZ-77"],
    matched_project_id: null,
    matched_project_name: null,
    match_reason: null,
    candidate_projects: [],
    analysis: null,
    import_result: null,
    error: null,
    created_at: "2026-10-20T08:00:00Z",
    decided_at: null,
    ...overrides,
  };
}

const IMPORTED = { mode: "import", parsed_rows: 2, prepared_rows: 2, imported: 2, skipped: 0, errors: 0 };

function mockApi(items: ImportInboxItem[], autoCommit = true) {
  apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path.startsWith(`${INBOX}?`)) return { items, auto_commit: autoCommit };
    if (path === "/api/v1/admin/projects?limit=200") return { items: [{ id: "p-1", name: "Alpha" }, { id: "p-2", name: "Beta" }] };
    if (path === `${INBOX}/policy`) return JSON.parse(String(init?.body));
    if (path.endsWith("/commit")) {
      return item({ id: "item-1", status: "IMPORTED", matched_project_id: "p-2", matched_project_name: "Beta", match_reason: "MANUAL", import_result: IMPORTED });
    }
    if (path.endsWith("/dismiss")) return item({ id: "item-1", status: "DISMISSED" });
    if (path === INBOX) {
      return item({ id: "item-9", source: "UPLOAD", filename: "dropped.xlsx", status: "IMPORTED", matched_project_id: "p-1", matched_project_name: "Alpha", match_reason: "ORDER_NUMBER", import_result: { ...IMPORTED, parsed_rows: 3, prepared_rows: 3, imported: 3 } });
    }
    throw new Error(`unexpected ${path}`);
  });
}

describe("ImportInboxCard", () => {
  beforeEach(() => {
    apiFetchMock.mockReset(); // a returned mock would be registered as a cleanup hook and called with no path
  });

  it("renders nothing without import permission", () => {
    render(<ImportInboxCard canManage={false} isOwner />);
    expect(screen.queryByTestId("import-inbox-card")).toBeNull();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("lets the office choose the project for an unrecognised document and imports it", async () => {
    mockApi([item({})]);
    render(<ImportInboxCard canManage isOwner />);
    expect(await screen.findByText("manifest.xlsx")).toBeInTheDocument();
    expect(screen.getByText(/Project not recognised/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Project for this document"), { target: { value: "p-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith(`${INBOX}/item-1/commit`, expect.objectContaining({ method: "POST" })));
    const call = apiFetchMock.mock.calls.find((c) => c[0] === `${INBOX}/item-1/commit`);
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ project_id: "p-2", allow_partial_import: false });
    // Imported items leave the open list; "Show decided" brings them back.
    await waitFor(() => expect(screen.queryByText("manifest.xlsx")).toBeNull());
    fireEvent.click(screen.getByLabelText("Show decided"));
    expect(screen.getByText("Imported")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("offers a partial import when the analysis has row errors and refuses the whole file", async () => {
    mockApi([
      item({
        id: "item-1",
        status: "ANALYZED",
        matched_project_id: "p-1",
        matched_project_name: "Alpha",
        match_reason: "ORDER_NUMBER",
        analysis: { mode: "analyze", parsed_rows: 3, prepared_rows: 3, would_import: 2, would_skip: 0, errors: 1, first_errors: [{ row: 2, message: "quantity must be an integer" }] },
      }),
    ]);
    render(<ImportInboxCard canManage isOwner={false} />);
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText(/by order number/)).toBeInTheDocument();
    expect(screen.getByText(/row 2: quantity must be an integer/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import valid rows only" }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith(`${INBOX}/item-1/commit`, expect.objectContaining({ method: "POST" })));
    const call = apiFetchMock.mock.calls.find((c) => c[0] === `${INBOX}/item-1/commit`);
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ project_id: null, allow_partial_import: true });
    // A non-owner sees the policy but cannot change it.
    expect(screen.getByLabelText(/Import clean files automatically/)).toBeDisabled();
  });

  it("uploads a dropped file to the inbox and shows the automatic result", async () => {
    mockApi([]);
    render(<ImportInboxCard canManage isOwner />);
    expect(await screen.findByText(/No documents waiting/)).toBeInTheDocument();
    const file = new File(["x"], "dropped.xlsx", { type: "application/octet-stream" });
    fireEvent.change(screen.getByLabelText("Add document to the inbox"), { target: { files: [file] } });
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith(INBOX, expect.objectContaining({ method: "POST" })));
    const call = apiFetchMock.mock.calls.find((c) => c[0] === INBOX);
    expect(call?.[1]?.body).toBeInstanceOf(FormData);
    expect(await screen.findByText("Imported automatically")).toBeInTheDocument();
  });

  it("lets the owner switch automatic import off and on", async () => {
    mockApi([], true);
    render(<ImportInboxCard canManage isOwner />);
    const toggle = await screen.findByLabelText(/Import clean files automatically/);
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith(`${INBOX}/policy`, expect.objectContaining({ method: "PUT", body: JSON.stringify({ auto_commit: false }) })));
    await waitFor(() => expect(toggle).not.toBeChecked());
  });
});
