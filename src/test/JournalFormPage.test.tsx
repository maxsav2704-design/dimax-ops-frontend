import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import JournalFormPage from "@/views/JournalFormPage";

const { api, download, push, auth, params } = vi.hoisted(() => ({
  api: vi.fn(), download: vi.fn(), push: vi.fn(), auth: vi.fn(), params: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiFetch: api, apiDownload: download }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: auth }));
vi.mock("next/navigation", () => ({ useParams: params, useRouter: () => ({ push }) }));
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <><a href="/projects">Projects</a>{children}</>,
}));

function fixture(status = "DRAFT") {
  return {
    journal: {
      id: "journal-1", project_id: "project-1", status, title: "Site handoff", notes: "Saved notes",
      pdf_locale: "en",
      lock_header: false, lock_table: false, lock_footer: false, snapshot_version: 2,
      signed_at: status === "ARCHIVED" ? "2026-09-14T09:00:00Z" : null,
      signer_name: status === "ARCHIVED" ? "Client A" : null,
    },
    project: { name: "Site A", address: "Address A", developer_company: "Developer A", contact_name: "Client A" },
    items: [{ unit_label: "A-2-201", door_type_id: "type-1", door_type_name: "Entrance", installed_at: "2026-09-14T07:00:00Z" }],
    addon_items: [{ name: "Adjustment", quantity: "2.50", unit: "unit", done_at: "2026-09-14T08:00:00Z", comment: "Completed" }],
    signing_url: status === "ACTIVE" ? "https://dimax.example/acceptance/test" : null,
  };
}

describe("JournalFormPage", () => {
  let model: ReturnType<typeof fixture>;
  beforeEach(() => {
    vi.restoreAllMocks();
    api.mockReset(); download.mockReset(); push.mockReset(); auth.mockReset(); params.mockReset();
    params.mockReturnValue({ id: "journal-1" });
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER" });
    model = fixture();
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.endsWith("/snapshot")) return structuredClone(model);
      if (init?.method === "PATCH") Object.assign(model.journal, JSON.parse(String(init.body)));
      if (path.endsWith("/mark-ready")) {
        model.journal.status = "ACTIVE";
        model.signing_url = "https://dimax.example/acceptance/test";
      }
      if (path.endsWith("/refresh-snapshot")) model.journal.snapshot_version++;
      return { ok: true };
    });
  });

  it("loads the selected stored snapshot, without fake form numbers or empty editable inspection rows", async () => {
    render(<JournalFormPage />);
    expect(screen.getByText("Loading journal...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Title")).toHaveValue("Site handoff");
    expect(screen.getByText("A-2-201")).toBeInTheDocument();
    expect(screen.getByText("Adjustment · 2.50 unit")).toBeInTheDocument();
    expect(screen.queryByText("JR-002110")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(api).toHaveBeenCalledWith("/api/v1/admin/journals/journal-1/snapshot", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("saves once through the API and only reports success after the server read", async () => {
    render(<JournalFormPage />);
    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "Updated handoff" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Updated notes" } });
    expect(screen.getByRole("button", { name: "Mark ready" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Draft saved");
    expect(model.journal).toMatchObject({ title: "Updated handoff", notes: "Updated notes" });
    expect(api.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("keeps edits and shows the real save failure without a success message", async () => {
    render(<JournalFormPage />);
    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "Keep this draft" } });
    api.mockRejectedValueOnce(new Error("Save rejected"));
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Save rejected");
    expect(screen.getByLabelText("Title")).toHaveValue("Keep this draft");
    expect(screen.queryByText("Draft saved")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
  });

  it("persists the document language and requires save before exporting", async () => {
    render(<JournalFormPage />);
    const language = await screen.findByLabelText("PDF language");
    expect(language).toHaveValue("en");
    fireEvent.change(language, { target: { value: "he" } });
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Draft saved");
    expect(model.journal.pdf_locale).toBe("he");
    expect(language).toHaveValue("he");
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled();
  });

  it("keeps the PDF language locked with the document header", async () => {
    model.journal.lock_header = true;
    render(<JournalFormPage />);
    expect(await screen.findByLabelText("PDF language")).toBeDisabled();
  });

  it.each(["ACTIVE", "ARCHIVED", "VIEWER"])("makes %s read-only", async (status) => {
    model = fixture(status === "VIEWER" ? "DRAFT" : status);
    if (status === "VIEWER") auth.mockReturnValue({ role: "ADMIN", admin_scope: "VIEWER" });
    render(<JournalFormPage />);
    expect(await screen.findByLabelText("Title")).toBeDisabled();
    expect(screen.getByLabelText("PDF language")).toBeDisabled();
    for (const name of ["Save draft", "Mark ready", "Refresh works"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(api.mock.calls.some(([, init]) => init?.method)).toBe(false);
  });

  it("prepares the journal once and retains read-only status if the follow-up read fails", async () => {
    render(<JournalFormPage />);
    await screen.findByLabelText("Title");
    let resolve!: (value: unknown) => void;
    api.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    api.mockRejectedValueOnce(new Error("Refresh unavailable"));
    const ready = screen.getByRole("button", { name: "Mark ready" });
    fireEvent.click(ready);
    fireEvent.click(ready);
    expect(ready).toBeDisabled();
    await act(async () => { resolve({ public_token: "test" }); });
    expect(await screen.findByRole("alert")).toHaveTextContent("Refresh unavailable");
    expect(screen.getByLabelText("Title")).toBeDisabled();
    expect(api.mock.calls.filter(([path]) => path.endsWith("/mark-ready"))).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("offers retry instead of a fake blank form when loading fails", async () => {
    api.mockRejectedValueOnce(new Error("Journal not found"));
    render(<JournalFormPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Journal not found");
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByLabelText("Title")).toHaveValue("Site handoff");
  });

  it.each(["Back to journal", "Projects"])("confirms discarding edits through %s", async (name) => {
    render(<JournalFormPage />);
    fireEvent.change(await screen.findByLabelText("Title"), { target: { value: "Unsaved" } });
    const target = name === "Projects" ? screen.getByRole("link", { name }) : screen.getByRole("button", { name });
    fireEvent.click(target);
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Title")).toHaveValue("Unsaved");
    fireEvent.click(target);
    fireEvent.click(screen.getByRole("button", { name: "Discard and leave" }));
    expect(push).toHaveBeenCalledWith(name === "Projects" ? "/projects" : "/journal");
  });

  it("downloads the server PDF through the authenticated API", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:journal") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    download.mockResolvedValue({ blob: async () => new Blob(["%PDF-1.4"], { type: "application/pdf" }) });
    render(<JournalFormPage />);
    await screen.findByLabelText("Title");
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(api.mock.calls.some(([, init]) => init?.method)).toBe(false);
    expect(download).toHaveBeenCalledWith("/api/v1/admin/journals/journal-1/pdf", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
});
