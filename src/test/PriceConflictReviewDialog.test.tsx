import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PriceConflictReviewDialog } from "@/components/operations/PriceConflictReviewDialog";

const mocks = vi.hoisted(() => ({ api: vi.fn(), locale: "en", allowed: true, scope: "OWNER" }));
vi.mock("@/lib/api", () => ({ apiFetch: mocks.api }));
vi.mock("@/lib/i18n", () => ({ useCopy: () => (en: string, ru: string, he: string) => (mocks.locale === "ru" ? ru : mocks.locale === "he" ? he : en), useI18n: () => ({ locale: mocks.locale }) }));
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

describe("work missing a factory rate", () => {
  const missing = { ...review, analysis_code: "MISSING_FACTORY_PRICE", applicable_quote: null, preview_amount: null,
    missing_price: { price_list_id: "first-confirmed-list", version: 3, kind: "ADDON", target_id: "unpriced-work-type",
      performed_at: "2026-10-02T08:00:00Z", effective_from: "2026-10-01T07:00:00Z", selection: "AT_EXECUTION" } };

  it.each([
    ["en", "Separate factory approval required", "Price list effective at execution"],
    ["ru", "Нужно отдельное подтверждение завода", "Прайс, действовавший при выполнении"],
    ["he", "נדרש אישור נפרד מהמפעל", "המחירון שהיה בתוקף בעת הביצוע"],
  ])("shows the verified missing-rate version without offering accrual in %s", async (locale, heading, selection) => {
    mocks.locale = locale; mocks.api.mockResolvedValue(missing); subject();
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByText(selection)).toBeInTheDocument();
    expect(screen.getByText("first-confirmed-list")).toBeInTheDocument();
    expect(screen.getByText("unpriced-work-type")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/18.00/)).not.toBeInTheDocument();
    expect(mocks.api).toHaveBeenCalledOnce();
    expect(mocks.api.mock.calls[0][1]?.method).toBeUndefined();
  });

  it("distinguishes the first-confirmed legacy basis from a later active list", async () => {
    mocks.api.mockResolvedValue({ ...missing, missing_price: { ...missing.missing_price, selection: "FIRST_CONFIRMED_LEGACY" } });
    subject();
    await screen.findByText("First factory-confirmed list (legacy work)");
    expect(screen.getByText(/A saved proposal is not factory confirmation/)).toBeInTheDocument();
    expect(screen.getByText(/A later price list does not price this work retroactively/)).toBeInTheDocument();
  });

  it("remains compatible with older servers returning no missing-rate context", async () => {
    mocks.api.mockResolvedValue({ ...missing, missing_price: undefined }); subject();
    await screen.findByRole("heading", { name: "Separate factory approval required" });
    expect(screen.queryByText("v3")).not.toBeInTheDocument();
    expect(screen.queryByText("Price list missing the rate")).not.toBeInTheDocument();
  });

  it("hides loaded missing-rate evidence when permissions are lost", async () => {
    mocks.api.mockResolvedValue(missing); const view = subject();
    await screen.findByText("v3"); mocks.allowed = false;
    view.rerender(<PriceConflictReviewDialog source="sync_queue" itemId="price-command" onClose={view.onClose} />);
    expect(screen.queryByText("v3")).not.toBeInTheDocument();
    expect(screen.queryByText("first-confirmed-list")).not.toBeInTheDocument();
  });

  it("does not mislabel invalid factory authority as a missing rate", async () => {
    mocks.api.mockResolvedValue({ ...missing, analysis_code: "INVALID_FACTORY_EVIDENCE", missing_price: null }); subject();
    await screen.findByText("Factory approval or the price timeline could not be verified.");
    expect(screen.queryByRole("heading", { name: "Separate factory approval required" })).not.toBeInTheDocument();
  });
});

describe("execution time correction", () => {
  const retained = { ...review, performed_at: null, analysis_code: "MISSING_EXECUTION_TIME",
    applicable_quote: null, preview_amount: null, time_correction_available: true };
  const correction = { performed_at: "2026-10-02T08:00:00.000Z", evidence_reference: "Site record QA-2026 confirmed by supervisor" };
  const checked = { ...review, performed_at: null, analysis_code: "EXECUTION_TIME_CORRECTION",
    resolution_available: true, time_correction_available: true, requires_execution_evidence: true,
    execution_correction: correction, review_token: "c".repeat(64) };
  function fillCorrection() {
    fireEvent.change(screen.getByLabelText("Date and time"), { target: { value: "2026-10-02T11:00" } });
    fireEvent.change(screen.getByLabelText("UTC offset at execution"), { target: { value: "+03:00" } });
    fireEvent.change(screen.getByLabelText("Evidence reference"), { target: { value: correction.evidence_reference } });
  }
  function setupApi() {
    mocks.api.mockImplementation((path) => Promise.resolve(path.endsWith("/execution-review") ? checked
      : path.endsWith("/resolve") ? { id: "correction-decision", amount: "18.00" } : retained));
  }

  it("requires an explicit date, offset and evidence, then a separate accrual confirmation", async () => {
    setupApi(); subject();
    const check = await screen.findByRole("button", { name: "Check corrected date" });
    expect(check).toBeDisabled();
    expect(screen.getByLabelText("Date and time")).toHaveValue("");
    expect(screen.getByLabelText("UTC offset at execution")).toHaveValue("");
    expect(screen.getByRole("combobox")).toHaveAccessibleName("UTC offset at execution");
    expect(screen.queryByLabelText("Decision reason")).not.toBeInTheDocument();
    fillCorrection();
    fireEvent.click(check);
    const accrue = await screen.findByRole("button", { name: "Record work: 18.00 ILS" });
    expect(accrue).toBeDisabled();
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
    expect(screen.getByText("Execution time for this decision")).toBeInTheDocument();
    const previewRequest = mocks.api.mock.calls.find(([path]) => path.endsWith("/execution-review"));
    expect(JSON.parse(previewRequest?.[1].body)).toEqual(correction);
    expect(mocks.api.mock.calls.some(([path]) => path.endsWith("/resolve"))).toBe(false);
    fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "Verified independent execution and assignment records" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(accrue);
    await screen.findByText("Work recorded");
    const decision = mocks.api.mock.calls.find(([path]) => path.endsWith("/resolve"));
    expect(JSON.parse(decision?.[1].body)).toEqual({ request_id: expect.any(String), review_token: checked.review_token,
      reason: "Verified independent execution and assignment records", confirm_execution_evidence: true,
      execution_correction: correction });
  });

  it.each(["Date and time", "UTC offset at execution", "Evidence reference"])("invalidates the calculation when %s changes", async (label) => {
    setupApi(); subject();
    await screen.findByLabelText("Date and time"); fillCorrection();
    fireEvent.click(screen.getByRole("button", { name: "Check corrected date" }));
    await screen.findByLabelText("Decision reason");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText(label), { target: { value: label === "Date and time" ? "2026-10-02T10:00"
      : label === "UTC offset at execution" ? "+02:00" : "Another independent site record" } });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("18.00 ILS")).not.toBeInTheDocument();
    expect(mocks.api.mock.calls.some(([path]) => path.endsWith("/resolve"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Check corrected date" }));
    expect(await screen.findByRole("checkbox")).not.toBeChecked();
  });

  it("does not retain stale prices after a failed correction check", async () => {
    setupApi(); subject();
    await screen.findByLabelText("Date and time"); fillCorrection();
    fireEvent.click(screen.getByRole("button", { name: "Check corrected date" }));
    await screen.findByText("18.00 ILS");
    mocks.api.mockRejectedValueOnce(new Error("Evidence changed"));
    fireEvent.click(screen.getByRole("button", { name: "Check corrected date" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("18.00 ILS")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Decision reason")).not.toBeInTheDocument();
  });

  it("never offers a payout when the corrected date still has no factory price", async () => {
    mocks.api.mockImplementation((path) => Promise.resolve(path.endsWith("/execution-review")
      ? { ...retained, execution_correction: correction, analysis_code: "MISSING_FACTORY_PRICE" } : retained));
    subject(); await screen.findByLabelText("Date and time"); fillCorrection();
    fireEvent.click(screen.getByRole("button", { name: "Check corrected date" }));
    await screen.findByText("The applicable version has no price for this work.");
    expect(screen.queryByLabelText("Decision reason")).not.toBeInTheDocument();
    expect(screen.queryByText("18.00 ILS")).not.toBeInTheDocument();
  });

  it("does not expose correction controls to finance readers", async () => {
    mocks.scope = "FINANCE"; mocks.api.mockResolvedValue(retained); subject();
    await screen.findByText("Execution time is missing. Receipt time cannot replace it.");
    expect(screen.queryByLabelText("Date and time")).not.toBeInTheDocument();
    expect(mocks.api).toHaveBeenCalledOnce();
  });

  it("clears the corrected date and evidence on another record", async () => {
    setupApi(); const view = subject();
    await screen.findByLabelText("Date and time"); fillCorrection();
    fireEvent.click(screen.getByRole("button", { name: "Check corrected date" }));
    await screen.findByText("18.00 ILS");
    view.rerender(<PriceConflictReviewDialog source="sync_event" itemId="another-command" onClose={view.onClose} />);
    expect(await screen.findByLabelText("Date and time")).toHaveValue("");
    expect(screen.getByLabelText("Evidence reference")).toHaveValue("");
    expect(screen.queryByText("18.00 ILS")).not.toBeInTheDocument();
  });

  it.each([
    ["ru", "Дата и время", "Смещение UTC на дату работы", "Проверить исправленную дату"],
    ["he", "תאריך ושעה", "הפרש UTC במועד הביצוע", "בדיקת המועד המתוקן"],
  ])("localizes correction controls in %s", async (locale, dateLabel, offsetLabel, action) => {
    mocks.locale = locale; mocks.api.mockResolvedValue(retained); subject();
    expect(await screen.findByLabelText(dateLabel)).toHaveValue("");
    expect(screen.getByLabelText(offsetLabel)).toHaveValue("");
    expect(screen.getByRole("button", { name: action })).toBeDisabled();
    expect(screen.queryByText("Verified execution time")).not.toBeInTheDocument();
  });
});

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
