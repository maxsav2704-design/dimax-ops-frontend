import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OutboxRecoveryPage from "@/views/OutboxRecoveryPage";
import { LanguageProvider } from "@/lib/i18n";
import { providerAcceptedAt, recoveryStatusSchema, recoveryPath as base } from "@/lib/outbox-recovery";

const { api, auth } = vi.hoisted(() => ({ api: vi.fn(), auth: { role: "ADMIN", admin_scope: "OWNER" } }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: () => auth }));
vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let state: { epoch: string | null; recovery_id: string | null; state: string; unresolved: number; held: number };
let row: { id: string; recovery_id: string; outbox_id: string; action: string | null; revision: number };
let requestFailure: unknown;

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.dir = "ltr";
  auth.role = "ADMIN"; auth.admin_scope = "OWNER";
  state = { epoch: id(1), recovery_id: id(2), state: "REVIEW", unresolved: 1, held: 0 };
  row = { id: id(3), recovery_id: id(2), outbox_id: id(4), action: null, revision: 0 };
  requestFailure = null;
  api.mockReset();
  api.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      if (requestFailure) throw requestFailure;
      if (path.endsWith("/release")) state = { ...state, state: "RELEASED" };
      if (path.endsWith("/begin")) state = { ...state, state: "REVIEW", recovery_id: id(2) };
      if (path.includes("/items/")) {
        const body = JSON.parse(String(init.body));
        row = { ...row, action: body.action, revision: row.revision + 1 };
        state = { ...state, unresolved: 0, held: body.action === "HOLD" ? 1 : 0 };
      }
      return {};
    }
    if (path === base) return { ...state };
    if (path.startsWith(base + "/items?")) return [{ ...row }];
    if (path.startsWith(base + "/decisions?")) return [];
    if (path === `/api/v1/admin/outbox/${id(4)}`) return {
      id: id(4), channel: "EMAIL", recipient: "factory@dimax.example", subject: "Synthetic journal B-101",
      attachment_name: "journal.pdf", status: "PENDING", scheduled_at: "2026-01-01T08:00:00Z", sent_at: null,
    };
    throw new Error(`Unexpected request: ${path}`);
  });
});

function mount(locale = "en") {
  window.localStorage.setItem("dimax_locale", locale);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><LanguageProvider><OutboxRecoveryPage /></LanguageProvider></QueryClientProvider>);
}

async function openMessage() {
  fireEvent.click(await screen.findByRole("button", { name: "Review", exact: true }));
  return within(await screen.findByRole("dialog"));
}

function fillDecision(dialog: ReturnType<typeof within>) {
  fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Checked provider log" } });
  fireEvent.change(dialog.getByLabelText("Evidence reference"), { target: { value: "Provider trace TEST-42" } });
  fireEvent.click(dialog.getByLabelText("I checked the message, recipient and evidence."));
}

describe("Outbox recovery", () => {
  it("blocks OWNER release until every message has a decision", async () => {
    mount();
    expect(await screen.findByText("Synthetic journal B-101")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume queue" })).toBeDisabled();
    const dialog = await openMessage();
    expect(dialog.getByRole("button", { name: "Record decision" })).toBeDisabled();
    fillDecision(dialog);
    fireEvent.click(dialog.getByRole("button", { name: "Record decision" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Resume queue" })).toBeEnabled();
    const sent = api.mock.calls.find(([path, init]) => path.includes("/items/") && init?.method === "POST");
    expect(JSON.parse(sent![1].body)).toMatchObject({ action: "HOLD", expected_revision: 0, accepted_at: null });
  });

  it("requires an explicit timezone and does not accept a future provider timestamp", async () => {
    mount();
    const dialog = await openMessage();
    fireEvent.change(dialog.getByLabelText("Decision"), { target: { value: "ACCEPTED" } });
    fillDecision(dialog);
    fireEvent.change(dialog.getByLabelText("Provider acceptance time"), { target: { value: "2020-01-01T10:30" } });
    expect(dialog.getByRole("button", { name: "Record decision" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("UTC offset"), { target: { value: "+02:00" } });
    expect(dialog.getByRole("button", { name: "Record decision" })).toBeEnabled();
    fireEvent.change(dialog.getByLabelText("Provider acceptance time"), { target: { value: "2999-01-01T10:30" } });
    expect(dialog.getByRole("button", { name: "Record decision" })).toBeDisabled();
  });

  it("reuses the entire decision request after an uncertain response", async () => {
    mount();
    const dialog = await openMessage();
    fillDecision(dialog);
    requestFailure = { status: 0 };
    fireEvent.click(dialog.getByRole("button", { name: "Record decision" }));
    const retry = await screen.findByRole("button", { name: "Retry the same decision" });
    await waitFor(() => expect(retry).toBeEnabled());
    expect(dialog.getByLabelText("Reason")).toBeDisabled();
    requestFailure = null;
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const posts = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(2);
    expect(posts[0][1].body).toBe(posts[1][1].body);
  });

  it("blocks stale/conflicting decisions instead of silently retrying", async () => {
    mount();
    const dialog = await openMessage();
    fillDecision(dialog);
    requestFailure = { status: 409 };
    fireEvent.click(dialog.getByRole("button", { name: "Record decision" }));
    await screen.findByText("The state or permissions changed. Close this window, refresh and review again.");
    expect(dialog.getByRole("button", { name: "Record decision" })).toBeDisabled();
    expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("requires confirmation and reason to release, without replaying business endpoints", async () => {
    state.unresolved = 0; state.held = 1; row.action = "HOLD"; row.revision = 1;
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Resume queue" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Confirm" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "All outcomes reviewed" } });
    fireEvent.click(dialog.getByLabelText("I confirm this recovery action."));
    fireEvent.click(dialog.getByRole("button", { name: "Confirm" }));
    await screen.findByText("Queue released");
    expect(api.mock.calls.filter(([, init]) => init?.method === "POST").map(([path]) => path)).toEqual([base + "/release"]);
  });

  it("allows OPERATIONS decisions but not opening or releasing the queue", async () => {
    auth.admin_scope = "OPERATIONS";
    mount();
    const dialog = await openMessage();
    expect(screen.queryByRole("button", { name: "Resume queue" })).not.toBeInTheDocument();
    fillDecision(dialog);
    expect(dialog.getByRole("button", { name: "Record decision" })).toBeEnabled();
  });

  it.each(["FINANCE", "VIEWER", "INSTALLER"])("does not fetch or mutate for %s", scope => {
    auth.admin_scope = scope;
    if (scope === "INSTALLER") auth.role = "INSTALLER";
    mount();
    expect(screen.getByText("Owner or operations access is required.")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("never exposes activation when deployment recovery configuration is absent", async () => {
    state = { ...state, state: "NOT_ACTIVATED", epoch: null, recovery_id: null };
    mount();
    await screen.findByText("Recovery mode is not active");
    expect(screen.queryByRole("button", { name: "Open review" })).not.toBeInTheDocument();
  });

  it("fails closed when status cannot be read", async () => {
    api.mockRejectedValue({ status: 404 });
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Resume queue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review", exact: true })).not.toBeInTheDocument();
  });

  it("clears sensitive state and closes the form on session change", async () => {
    mount();
    await openMessage();
    fireEvent(window, new Event("dimax-auth-changed"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("factory@dimax.example")).not.toBeInTheDocument();
    expect(screen.getByText("The session changed. Reopen this section before continuing.")).toBeInTheDocument();
  });

  it("renders final decisions read-only", async () => {
    row.action = "ACCEPTED";
    mount();
    const dialog = await openMessage();
    expect(dialog.queryByRole("button", { name: "Record decision" })).not.toBeInTheDocument();
  });

  it.each([["ru", "Сверка писем", "Проверить"], ["he", "בדיקת הודעות", "בדיקה"]])("uses %s copy", async (locale, title, button) => {
    mount(locale);
    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: button, exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review", exact: true })).not.toBeInTheDocument();
    if (locale === "he") expect(document.documentElement.dir).toBe("rtl");
  });
});

describe("Recovery response and time validation", () => {
  it("rejects unknown states and incomplete responses", () => {
    expect(recoveryStatusSchema.safeParse({}).success).toBe(false);
    expect(recoveryStatusSchema.safeParse({ ...state, state: "READY" }).success).toBe(false);
  });
  it("preserves explicit offset, rejects invalid dates and future instants", () => {
    expect(providerAcceptedAt("2020-01-01T10:30", "+02:00")).toBe("2020-01-01T08:30:00.000Z");
    expect(providerAcceptedAt("2020-02-31T10:30", "+02:00")).toBeNull();
    expect(providerAcceptedAt("2020-01-01T10:30", "")).toBeNull();
    expect(providerAcceptedAt("2999-01-01T10:30", "+02:00")).toBeNull();
  });
});
