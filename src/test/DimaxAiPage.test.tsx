import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, type ReactNode, type AnchorHTMLAttributes } from "react";
import DimaxAiPage from "@/views/DimaxAiPage";
import { AI_API, aiContextHref, parseAiContext, previewRows, safeAiSourcePath, type AiProposal } from "@/lib/dimax-ai";

const { api, auth, language, callbacks, search } = vi.hoisted(() => ({
  api: vi.fn(), auth: vi.fn(), language: { locale: "en" as "en" | "ru" | "he" }, callbacks: new Set<() => void>(),
  search: { params: new URLSearchParams() },
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => search.params, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: auth }));
vi.mock("@/lib/auth-session", () => ({ onAuthChanged: (callback: () => void) => {
  callbacks.add(callback); return () => callbacks.delete(callback);
} }));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ locale: language.locale, dir: language.locale === "he" ? "rtl" : "ltr" }),
  useCopy: () => (en: string, ru: string, he: string) => ({ en, ru, he })[language.locale],
}));
vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...rest}>{children}</a> }));

const ready = { ready: true, reason: "ready", tools: ["search_projects"], read_only: true };
const reply = { run_id: "run-1", answer: "Two recorded positions", sources: [
  { kind: "project", id: "p1", label: "Project A", path: "/projects?project_id=p1" },
], tools_used: ["project_summary"], provider_requests: 2, read_only: true };
const task = { id: "run-1", conversation_id: "conversation-1", request_id: "request-1", message: "How many positions?",
  locale: "en", project_id: null, status: "COMPLETED", attempt_count: 1, reply, error_code: null,
  created_at: "2026-10-09T09:00:00Z", updated_at: "2026-10-09T09:00:01Z" };
function response(path: string, value = task) {
  if (path.endsWith("/status")) return ready;
  if (path.includes("/conversations/")) return { items: [value], has_more: false };
  if (path.includes("/conversations?")) return { items: [], has_more: false };
  return value;
}
function mount() { return render(<StrictMode><DimaxAiPage /></StrictMode>); }
async function ask() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Ask DIMAX AI" })).toBeDisabled());
  fireEvent.change(screen.getByLabelText("Your task or question"), { target: { value: "How many positions?" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Ask DIMAX AI" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Ask DIMAX AI" }));
}

describe("DIMAX AI workspace", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    language.locale = "en"; callbacks.clear(); api.mockReset(); search.params = new URLSearchParams();
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER" });
    api.mockImplementation(async (path: string) => response(path));
  });
  it("makes no AI request for an installer or missing profile", () => {
    auth.mockReturnValue({ role: "INSTALLER", admin_scope: null }); mount();
    expect(screen.getByRole("alert")).toHaveTextContent("AI access is unavailable");
    expect(api).not.toHaveBeenCalled();
  });
  it("shows configuration state without fake answers", async () => {
    api.mockImplementation(async (path: string) => path.endsWith("/status") ?
      { ...ready, ready: false, reason: "missing_api_key" } : { items: [], has_more: false }); mount();
    await screen.findByText(/AI is not connected yet/);
    fireEvent.change(screen.getByLabelText("Your task or question"), { target: { value: "Read" } });
    expect(screen.getByRole("button", { name: "Ask DIMAX AI" })).toBeDisabled();
    expect(api.mock.calls.every(([, init]) => !init?.method)).toBe(true);
  });
  it("submits the selected language and renders actual record links", async () => {
    mount(); await ask(); await screen.findByText(reply.answer);
    const writes = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0][1].body)).toMatchObject({ message: "How many positions?", locale: "en", conversation_id: null });
    expect(JSON.parse(writes[0][1].body).request_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByRole("link", { name: "Project A" })).toHaveAttribute("href", "/projects?project_id=p1");
  });
  it("renders model content as text and rejects external source links", async () => {
    api.mockImplementation(async (path: string) => response(path, { ...task, reply: {
      ...reply, answer: "<script>alert(1)</script>", sources: [{ ...reply.sources[0], path: "https://foreign.test" }],
    } }));
    mount(); await ask(); await screen.findByText("<script>alert(1)</script>");
    expect(document.querySelector("script")).toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(safeAiSourcePath("//evil.test")).toBe(false);
  });
  it("clears answers and cancels requests when the account changes", async () => {
    mount(); await ask(); await screen.findByText(reply.answer);
    act(() => { callbacks.forEach((fn) => fn()); });
    expect(screen.queryByText(reply.answer)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your task or question")).toHaveValue("");
  });
  it("does not display a late reply after cancellation", async () => {
    let resolve: (value: typeof task) => void = () => {};
    api.mockImplementation((path: string, init?: RequestInit) => init?.method === "POST" ?
      new Promise((done) => { resolve = done; }) : Promise.resolve(response(path)));
    mount(); await ask();
    fireEvent.click(screen.getByRole("button", { name: "Stop waiting" }));
    await act(async () => { resolve(task); });
    expect(screen.queryByText(reply.answer)).not.toBeInTheDocument();
  });
  it("handles provider limits without exposing provider details", async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (init?.method !== "POST") return response(path);
      throw { status: 503, code: "AI_PROVIDER_LIMIT", message: "private provider body" };
    });
    mount(); await ask();
    expect(await screen.findByRole("alert")).toHaveTextContent("Request limit reached");
    expect(screen.queryByText(/private provider/)).not.toBeInTheDocument();
  });
  it.each(["ru", "he"] as const)("uses localized controls and direction in %s", async (locale) => {
    language.locale = locale; mount();
    await waitFor(() => expect(screen.queryByText(/Checking connection/)).not.toBeInTheDocument());
    expect(document.querySelector(`[dir="${locale === "he" ? "rtl" : "ltr"}"]`)).not.toBeNull();
    expect(screen.getByLabelText(locale === "he" ? "משימה או שאלה" : "Задача или вопрос")).toBeInTheDocument();
  });
  it("restores saved history even when model access is disabled", async () => {
    api.mockImplementation(async (path: string) => path.endsWith("/status") ? { ...ready, ready: false, reason: "disabled" } :
      path.includes("/conversations?") ? { items: [{ id: task.conversation_id, title: task.message }], has_more: false } : response(path));
    mount(); await screen.findByText(reply.answer);
    expect(screen.getByLabelText("Conversation")).toHaveValue(task.conversation_id);
    expect(api.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(true);
  });
  it("recovers a lost acknowledgement with the identical request ID and payload", async () => {
    let writes = 0;
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (init?.method === "POST" && ++writes === 1) throw new TypeError("Failed to fetch");
      return response(path);
    });
    mount(); await ask();
    fireEvent.click(await screen.findByRole("button", { name: "Check the same request" }));
    await screen.findByText(reply.answer);
    const sent = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(sent).toHaveLength(2);
    expect(sent[0][1].body).toBe(sent[1][1].body);
  });
  it("keeps follow-up questions in the saved conversation", async () => {
    mount(); await ask(); await screen.findByText(reply.answer);
    fireEvent.change(screen.getByLabelText("Your task or question"), { target: { value: "And open issues?" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Ask DIMAX AI" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Ask DIMAX AI" }));
    await waitFor(() => expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2));
    const sent = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(JSON.parse(sent[1][1].body)).toMatchObject({ conversation_id: task.conversation_id, message: "And open issues?" });
    expect(JSON.parse(sent[0][1].body).request_id).not.toBe(JSON.parse(sent[1][1].body).request_id);
  });
  it("offers an explicit retry for an interrupted task", async () => {
    const interrupted = { ...task, status: "INTERRUPTED", reply: null };
    api.mockImplementation(async (path: string, init?: RequestInit) => init?.method === "POST" ? task :
      path.includes("/conversations?") ? { items: [{ id: task.conversation_id, title: task.message }], has_more: false } :
      path.includes("/conversations/") ? { items: [interrupted], has_more: false } : response(path));
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Run this task again" }));
    await screen.findByText(reply.answer);
    expect(api.mock.calls.find(([path]) => path.endsWith("/retry"))?.[0]).toBe(`${AI_API}/tasks/${task.id}/retry`);
  });
  it("retains the retry token when an attempt acknowledgement is lost", async () => {
    const failed = { ...task, status: "FAILED", reply: null };
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (init?.method === "POST") throw new TypeError("Connection lost");
      return path.includes("/conversations?") ? { items: [{ id: task.conversation_id, title: task.message }], has_more: false } :
        path.includes("/conversations/") ? { items: [failed], has_more: false } : response(path);
    });
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Run this task again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Run this task again" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Run this task again" }));
    await waitFor(() => expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2));
    const sent = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(sent[0][1].body).toBe(sent[1][1].body);
  });
  it("uses a fresh retry token after an observed running attempt fails", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const failed = { ...task, status: "FAILED", reply: null, attempt_count: 2 };
    api.mockImplementation(async (path: string, init?: RequestInit) => init?.method === "POST" ?
      { ...task, status: "RUNNING", reply: null } :
      path.includes("/conversations?") ? { items: [{ id: task.conversation_id, title: task.message }], has_more: false } :
      path.includes("/conversations/") ? { items: [failed], has_more: false } :
      path.includes("/tasks/") ? failed : response(path));
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Run this task again" }));
    await screen.findByRole("button", { name: "Cancel task" });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    fireEvent.click(await screen.findByRole("button", { name: "Run this task again" }));
    await waitFor(() => expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2));
    const sent = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(JSON.parse(sent[0][1].body).request_id).not.toBe(JSON.parse(sent[1][1].body).request_id);
  });
  it("cancels a saved running task on the server", async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => init?.method === "POST" ?
      { ...task, status: "CANCELLED", reply: null } :
      path.includes("/conversations?") ? { items: [{ id: task.conversation_id, title: task.message }], has_more: false } :
      path.includes("/conversations/") ? { items: [{ ...task, status: "RUNNING", reply: null }], has_more: false } : response(path));
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Cancel task" }));
    await screen.findByText("This task was cancelled.");
    expect(api.mock.calls.find(([path]) => path.endsWith("/cancel"))?.[0]).toBe(`${AI_API}/tasks/${task.id}/cancel`);
  });

  const proposal: AiProposal = {
    id: "prop-1", task_id: "run-1", conversation_id: "conversation-1", tool_name: "propose_issue_report", status: "PROPOSED",
    arguments: { door_id: "d1", title: "No access", details: null, priority: "P2" },
    preview: { entity: { kind: "door", id: "d1", label: "B-3-800", path: "/projects?project_id=p1&focus_section=doors" },
      summary: { project: "Project A", door: "B-3-800", mode: "new" },
      before: { door_status: "NOT_INSTALLED", issue_status: null, issue_title: null },
      after: { door_status: "ISSUE_OPEN", issue_status: "OPEN", title: "No access", details: null, priority: "P2", workflow_state: "NEW" } },
    expected: { door_version: 3, issue_id: null }, result: null, error_code: null,
    expires_at: "2026-10-19T10:00:00Z", decided_at: null, executed_at: null, created_at: "2026-10-19T09:00:00Z", updated_at: "2026-10-19T09:00:00Z",
  };
  const executed: AiProposal = { ...proposal, status: "EXECUTED", executed_at: "2026-10-19T09:05:00Z",
    result: { result: { issue_id: "i1", issue_status: "OPEN", workflow_state: "NEW", priority: "P2", door_status: "ISSUE_OPEN", door_version: 4 },
      sources: [{ kind: "issue", id: "i1", label: "No access", path: "/issues?issue_id=i1" }] } };
  const proposedTask = { ...task, proposals: [proposal], reply: { ...reply, steps: [
    { tool: "project_summary", ok: true, ms: 12 }, { tool: "list_project_doors", ok: true, ms: 20 }, { tool: "propose_issue_report", ok: true, ms: 15 } ],
    proposal_ids: ["prop-1"], provider: "mock" as const } };
  const actionsReady = { ...ready, actions_enabled: true, provider: "mock" as const };

  it("sends the selected object from the deep link and shows it as context", async () => {
    search.params = new URLSearchParams("context=project:1f16d537-5617-4c4b-a944-dafba2bcead9&q=Which%20positions%20are%20not%20finished%3F");
    mount();
    expect(await screen.findByTestId("dimax-ai-context")).toHaveTextContent("Project");
    expect(screen.getByLabelText("Your task or question")).toHaveValue("Which positions are not finished?");
    await waitFor(() => expect(screen.getByRole("button", { name: "Ask DIMAX AI" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Ask DIMAX AI" }));
    await screen.findByText(reply.answer);
    const body = JSON.parse(api.mock.calls.filter(([, init]) => init?.method === "POST")[0][1].body);
    expect(body).toMatchObject({ conversation_id: null, context: { kind: "project", id: "1f16d537-5617-4c4b-a944-dafba2bcead9" } });
    expect(parseAiContext("door:not-a-uuid")).toBeNull();
    expect(aiContextHref({ kind: "issue", id: "1f16d537-5617-4c4b-a944-dafba2bcead9" }, "Why?")).toBe("/ai?context=issue%3A1f16d537-5617-4c4b-a944-dafba2bcead9&q=Why%3F");
  });

  it("renders a proposal as a before/after card and confirms it once with a stable decision token", async () => {
    const posts: { path: string; body: string | undefined }[] = [];
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.endsWith("/status")) return actionsReady;
      if (init?.method === "POST") {
        posts.push({ path, body: init.body as string | undefined });
        if (path.endsWith("/confirm")) {
          if (posts.filter((post) => post.path.endsWith("/confirm")).length === 1) throw new TypeError("Failed to fetch");
          return executed;
        }
        return proposedTask;
      }
      if (path.includes("/conversations/")) return { items: [proposedTask], has_more: false };
      if (path.includes("/conversations?")) return { items: [{ id: task.conversation_id, title: task.message }], has_more: false };
      return proposedTask;
    });
    mount();
    const card = await screen.findByTestId("dimax-ai-proposal");
    expect(card).toHaveAttribute("data-status", "PROPOSED");
    expect(card).toHaveTextContent("Report an issue on a position");
    expect(card).toHaveTextContent("Waiting for your decision");
    expect(card).toHaveTextContent("Issue open");
    // Shown twice by design: on the connection card and under the answer.
    expect(screen.getAllByText("Demo provider", { exact: false })).toHaveLength(2);
    expect(screen.getByText("Records read · 2 tool calls")).toBeInTheDocument();
    expect(screen.getByText("Proposal prepared")).toBeInTheDocument();
    expect(previewRows(proposal.preview).find((row) => row.key === "door_status")).toMatchObject({ changed: true });

    fireEvent.click(screen.getByTestId("dimax-ai-proposal-review"));
    const dialog = await screen.findByTestId("dimax-ai-confirm");
    expect(dialog).toHaveTextContent("Installation facts, prices, assignments and earnings are not changed.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The connection was lost. Confirm again");
    // The second confirmation reuses the same decision token, so the server cannot save twice.
    fireEvent.click(screen.getByTestId("dimax-ai-proposal-review"));
    fireEvent.click(within(await screen.findByTestId("dimax-ai-confirm")).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.getByTestId("dimax-ai-proposal")).toHaveAttribute("data-status", "EXECUTED"));
    const confirms = posts.filter((post) => post.path.endsWith("/confirm"));
    expect(confirms).toHaveLength(2);
    expect(confirms[0].path).toBe(`${AI_API}/proposals/prop-1/confirm`);
    expect(confirms[0].body).toBe(confirms[1].body);
    expect(JSON.parse(confirms[0].body as string).request_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByText("Saved and verified")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "No access" })).toHaveAttribute("href", "/issues?issue_id=i1");
    expect(screen.queryByTestId("dimax-ai-proposal-review")).not.toBeInTheDocument();
  });

  it("rejects a proposal and shows conflict and expiry states without decision buttons", async () => {
    const states: AiProposal[] = [{ ...proposal, id: "p-reject" }, { ...proposal, id: "p-conflict", status: "CONFLICT", error_code: "AI_VERSION_CONFLICT" },
      { ...proposal, id: "p-expired", status: "EXPIRED", error_code: "AI_PROPOSAL_EXPIRED" }];
    const multi = { ...proposedTask, proposals: states };
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.endsWith("/status")) return actionsReady;
      if (init?.method === "POST" && path.endsWith("/reject")) return { ...states[0], status: "REJECTED", decided_at: "2026-10-19T09:01:00Z" };
      if (path.includes("/conversations/")) return { items: [multi], has_more: false };
      if (path.includes("/conversations?")) return { items: [{ id: task.conversation_id, title: task.message }], has_more: false };
      return multi;
    });
    mount();
    const cards = await screen.findAllByTestId("dimax-ai-proposal");
    expect(cards).toHaveLength(3);
    expect(cards[1]).toHaveTextContent("The record changed after the preview");
    expect(cards[2]).toHaveTextContent("Expired");
    expect(screen.getAllByTestId("dimax-ai-proposal-review")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(cards[0]).toHaveAttribute("data-status", "REJECTED"));
    expect(api.mock.calls.find(([path]) => path.endsWith("/reject"))?.[0]).toBe(`${AI_API}/proposals/p-reject/reject`);
    expect(cards[0]).toHaveTextContent("Rejected, nothing saved");
  });

  it("keeps decision buttons disabled when actions are switched off on the server", async () => {
    api.mockImplementation(async (path: string) => path.endsWith("/status") ? { ...ready, actions_enabled: false } :
      path.includes("/conversations/") ? { items: [proposedTask], has_more: false } :
      path.includes("/conversations?") ? { items: [{ id: task.conversation_id, title: task.message }], has_more: false } : proposedTask);
    mount();
    expect(await screen.findByTestId("dimax-ai-proposal-review")).toBeDisabled();
    expect(screen.getByText("Actions: off, reads only")).toBeInTheDocument();
  });
});
