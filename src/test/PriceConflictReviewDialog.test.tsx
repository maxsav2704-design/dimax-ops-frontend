import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PriceConflictReviewDialog } from "@/components/operations/PriceConflictReviewDialog";

const mocks = vi.hoisted(() => ({ api: vi.fn(), locale: "en", allowed: true, scope: "OWNER" }));
vi.mock("@/lib/api", () => ({ apiFetch: mocks.api }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: mocks.locale }) }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: () => ({
  role: "ADMIN", admin_scope: mocks.scope, can_view_rates: mocks.allowed,
}) }));

const review = {
  id: "price-command", project_name: "QA project", installer_name: "Test Installer",
  work_label: "QA-101", performed_at: "2026-10-02T08:00:00Z", received_at: "2026-10-03T09:00:00Z",
  quantity: "1.50", seen_price_list_id: "original-price-list", seen_version: 1,
  seen_version_status: "AVAILABLE", analysis_code: "VERSION_MISMATCH", preview_amount: "18.00",
  applicable_quote: { version: 2, rate: "12.00", unit: "pcs", currency: "ILS",
    effective_from: "2026-10-01T07:00:00Z", selection: "AT_EXECUTION" },
  resolution_available: false, review_token: null,
};

function subject() {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...render(<PriceConflictReviewDialog source="sync_queue" itemId="price-command" onClose={onClose} />, { wrapper }), onClose };
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  mocks.api.mockReset(); mocks.api.mockResolvedValue(review); mocks.locale = "en"; mocks.allowed = true; mocks.scope = "OWNER";
});
afterEach(() => vi.unstubAllGlobals());

describe("read-only price conflict review", () => {
  it("shows the original version and execution quote, without an editing or retry command", async () => {
    const { onClose } = subject();
    expect(await screen.findByText("QA-101")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("18.00 ILS")).toBeInTheDocument();
    expect(screen.getByText("Calculation for review, not accrued")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(mocks.api).toHaveBeenCalledExactlyOnceWith("/api/v1/admin/sync/price-conflicts/sync_queue/price-command", { signal: expect.any(AbortSignal) });
    fireEvent.click(screen.getByText("Original identifiers"));
    expect(screen.getByText("original-price-list")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close review" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not request prices without rate permission", () => {
    mocks.allowed = false;
    subject();
    expect(screen.getByRole("alert")).toHaveTextContent("Rate access is required.");
    expect(mocks.api).not.toHaveBeenCalled();
  });

  it("removes already loaded prices after permission loss", async () => {
    const view = subject();
    await screen.findByText("18.00 ILS");
    mocks.allowed = false;
    view.rerender(<PriceConflictReviewDialog source="sync_queue" itemId="price-command" onClose={view.onClose} />);
    expect(screen.queryByText("18.00 ILS")).not.toBeInTheDocument();
  });

  it("hides evidence and closes on a session change", async () => {
    const view = subject();
    await screen.findByText("18.00 ILS");
    fireEvent(window, new CustomEvent("dimax-auth-changed"));
    expect(view.onClose).toHaveBeenCalledOnce();
    expect(screen.queryByText("18.00 ILS")).not.toBeInTheDocument();
  });

  it("aborts an unfinished request when the review unmounts", () => {
    let signal: AbortSignal | undefined;
    mocks.api.mockImplementationOnce((_path, init) => { signal = init.signal; return new Promise(() => {}); });
    const view = subject();
    expect(signal?.aborted).toBe(false);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("shows loading, then a retryable GET error without stale prices", async () => {
    let reject!: (error: Error) => void;
    mocks.api.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    subject();
    expect(screen.getByRole("status")).toHaveTextContent("Checking price history");
    reject(new Error("Review unavailable"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("18.00 ILS")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    await screen.findByText("18.00 ILS");
    expect(mocks.api.mock.calls.every((call) => !call[1]?.method || call[1].method === "GET")).toBe(true);
  });

  it("does not substitute receipt time or zero money for missing execution evidence", async () => {
    mocks.api.mockResolvedValue({ ...review, performed_at: null, applicable_quote: null,
      preview_amount: null, analysis_code: "MISSING_EXECUTION_TIME" });
    subject();
    expect(await screen.findByText("Execution time is missing. Receipt time cannot replace it.")).toBeInTheDocument();
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
    expect(screen.queryByText("Calculation for review, not accrued")).not.toBeInTheDocument();
  });

  it("labels the first-confirmed legacy exception", async () => {
    mocks.api.mockResolvedValue({ ...review, seen_version: null, seen_price_list_id: null, seen_version_status: "MISSING",
      analysis_code: "NO_VERSION", applicable_quote: { ...review.applicable_quote, selection: "FIRST_CONFIRMED_LEGACY" } });
    subject();
    expect(await screen.findByText("Legacy work: first factory-confirmed price list.")).toBeInTheDocument();
  });

  it.each([
    ["ru", "Разбор конфликта цены", "Расчёт для проверки, не начисление", "ltr"],
    ["he", "בדיקת התנגשות מחיר", "חישוב לבדיקה, לא זיכוי בשכר", "rtl"],
  ])("localizes the review in %s", async (locale, title, calculation, dir) => {
    mocks.locale = locale;
    subject();
    expect(await screen.findByText(calculation)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: title })).toHaveAttribute("dir", dir);
    expect(screen.queryByText("Calculation for review, not accrued")).not.toBeInTheDocument();
  });

  it("fetches new evidence when selecting another record", async () => {
    const view = subject();
    await screen.findByText("18.00 ILS");
    mocks.api.mockImplementationOnce(() => new Promise(() => {}));
    view.rerender(<PriceConflictReviewDialog source="sync_event" itemId="other" onClose={view.onClose} />);
    expect(screen.queryByText("18.00 ILS")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.api).toHaveBeenLastCalledWith("/api/v1/admin/sync/price-conflicts/sync_event/other", { signal: expect.any(AbortSignal) }));
  });
});

describe("authorized execution-price decision", () => {
  const resolvable = { ...review, resolution_available: true, review_token: "a".repeat(64) };
  const result = { id: "decision-1", completed_work_id: "work-1", amount: "18.00", resolved_at: "2026-10-04T09:00:00Z" };
  const fillDecision = () => {
    fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "Checked the executed work and factory terms" } });
    fireEvent.click(screen.getByRole("checkbox"));
  };

  it("requires an explicit reason and confirmation, submits no rate, and displays actual accrual", async () => {
    mocks.api.mockImplementation((path) => Promise.resolve(path.endsWith("/resolve") ? result : resolvable));
    subject();
    const button = await screen.findByRole("button", { name: "Record work: 18.00 ILS" });
    expect(button).toBeDisabled();
    fillDecision();
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await screen.findByText("Work recorded");
    expect(screen.getByText("Accrued: 18.00 ILS")).toBeInTheDocument();
    expect(screen.queryByText("Calculation for review, not accrued")).not.toBeInTheDocument();
    const sent = mocks.api.mock.calls.find((call) => call[1]?.method === "POST");
    expect(sent?.[0]).toBe("/api/v1/admin/sync/price-conflicts/sync_queue/price-command/resolve");
    expect(JSON.parse(sent?.[1].body)).toEqual({ request_id: expect.any(String), review_token: "a".repeat(64),
      reason: "Checked the executed work and factory terms" });
  });

  it("retries an uncertain outcome with the same idempotency key and prevents duplicate pending clicks", async () => {
    let reject!: (error: Error) => void;
    mocks.api.mockResolvedValueOnce(resolvable).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValueOnce(result);
    subject();
    await screen.findByLabelText("Decision reason");
    fillDecision();
    fireEvent.click(screen.getByRole("button", { name: "Record work: 18.00 ILS" }));
    expect(await screen.findByRole("button", { name: "Recording..." })).toBeDisabled();
    await waitFor(() => expect(reject).toBeTypeOf("function"));
    reject(new Error("Connection lost"));
    await screen.findByRole("alert");
    expect(screen.getByText("The result is not confirmed. Do not create duplicate work.")).toBeInTheDocument();
    expect(screen.queryByText("Original work retained. No earnings have been changed.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Decision reason")).toHaveValue("Checked the executed work and factory terms");
    fireEvent.click(screen.getByRole("button", { name: "Record work: 18.00 ILS" }));
    await screen.findByText("Work recorded");
    const requests = mocks.api.mock.calls.filter((call) => call[1]?.method === "POST");
    expect(requests).toHaveLength(2);
    expect(requests[0][1].body).toBe(requests[1][1].body);
  });

  it("does not allow a finance reader to apply the decision", async () => {
    mocks.scope = "FINANCE";
    mocks.api.mockResolvedValue(resolvable);
    subject();
    await screen.findByText("18.00 ILS");
    expect(screen.queryByLabelText("Decision reason")).not.toBeInTheDocument();
  });

  it("clears confirmation when another command is selected", async () => {
    mocks.api.mockResolvedValue(resolvable);
    const view = subject();
    await screen.findByLabelText("Decision reason");
    fillDecision();
    expect(screen.getByRole("checkbox")).toBeChecked();
    mocks.api.mockResolvedValue({ ...resolvable, id: "other", review_token: "b".repeat(64),
      analysis_code: "HISTORICAL_PRICE_REVIEW", requires_execution_evidence: true });
    view.rerender(<PriceConflictReviewDialog source="sync_event" itemId="other" onClose={view.onClose} />);
    await screen.findByText("Work arrived after a price change. Verify execution evidence before using the old price.");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Record work: 18.00 ILS" })).toBeDisabled();
  });

  it.each([
    ["en", "Decision reason", "Record work: 18.00 ILS", "independent of the device clock"],
    ["ru", "Причина решения", "Учесть работу: 18.00 ILS", "независимому от часов телефона"],
    ["he", "נימוק להחלטה", "רישום עבודה: 18.00 ILS", "שאינן שעון המכשיר"],
  ])("requires independent execution evidence for a historical price in %s", async (locale, label, action, evidence) => {
    mocks.locale = locale;
    mocks.api.mockImplementation((path) => Promise.resolve(path.endsWith("/resolve") ? result : {
      ...resolvable, analysis_code: "HISTORICAL_PRICE_REVIEW", requires_execution_evidence: true,
    }));
    subject();
    const button = await screen.findByRole("button", { name: action });
    expect(button).toBeDisabled();
    expect(screen.getByRole("checkbox")).toHaveAccessibleName(new RegExp(evidence));
    fireEvent.change(screen.getByLabelText(label), { target: { value: "Verified against the site work record" } });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    await waitFor(() => expect(mocks.api.mock.calls.some((call) => call[1]?.method === "POST")).toBe(true));
    const sent = mocks.api.mock.calls.find((call) => call[1]?.method === "POST");
    expect(JSON.parse(sent?.[1].body)).toMatchObject({ confirm_execution_evidence: true,
      reason: "Verified against the site work record", review_token: resolvable.review_token });
  });

  it.each([
    ["ru", "Причина решения", "Учесть работу: 18.00 ILS"],
    ["he", "נימוק להחלטה", "רישום עבודה: 18.00 ILS"],
  ])("localizes the decision in %s", async (locale, reasonLabel, action) => {
    mocks.locale = locale;
    mocks.api.mockResolvedValue(resolvable);
    subject();
    expect(await screen.findByLabelText(reasonLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: action })).toBeDisabled();
    expect(screen.queryByText("Accept execution-time price")).not.toBeInTheDocument();
  });
});
