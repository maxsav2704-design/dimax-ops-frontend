import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkPriceAccrual } from "@/components/operations/WorkPriceAccrual";

const mocks = vi.hoisted(() => ({ api: vi.fn(), locale: "en" }));
vi.mock("@/lib/api", () => ({ apiFetch: mocks.api }));
vi.mock("@/lib/i18n", () => ({ useCopy: () => (en: string, ru: string, he: string) => (mocks.locale === "ru" ? ru : mocks.locale === "he" ? he : en), useI18n: () => ({ locale: mocks.locale }) }));
const receipt = { id: "decision", completed_work_id: "work", amount: "13.52", accrued_at: "2026-10-14T08:00:00Z", reason: "Independent decision checked" };
const review = { approval_hash: "a".repeat(64), reference: "QA-102", rate: "9.01", amount: "13.52", currency: "ILS",
  confirmed_name: "Factory QA", confirmed_at: "2026-10-13T09:00:00Z", accrual: null,
  scope: { project_name: "QA site", installer_name: "QA Installer", work_label: "Adjustment", quantity: "1.50", unit: "pcs",
    missing_price: { performed_at: "2026-10-01T08:00:00Z" } } };
function subject() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><WorkPriceAccrual approvalId="approval" /></QueryClientProvider>);
}
async function open() {
  fireEvent.click(screen.getByRole("button", { name: "Review accrual" }));
  await screen.findByText("QA site");
}
async function complete() {
  await open();
  fireEvent.change(screen.getByLabelText("Accrual reason"), { target: { value: "Independent decision checked" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Confirm accrual" }));
}
beforeEach(() => {
  mocks.locale = "en"; mocks.api.mockReset();
  mocks.api.mockImplementation((_, options) => Promise.resolve(options?.method === "POST" ? receipt : review));
});
describe("separate factory work accrual", () => {
  it("requires a review, reason and unchecked consent; never submits a rate", async () => {
    subject(); expect(mocks.api).not.toHaveBeenCalled(); await open();
    expect(screen.getByText("1.50 × 9.01 = 13.52 ILS")).toBeInTheDocument();
    expect(screen.getByText("1.50 pcs")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Confirm accrual" });
    expect(save).toBeDisabled(); expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Accrual reason"), { target: { value: receipt.reason } });
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(save);
    await screen.findByText("Accrual recorded");
    const [, options] = mocks.api.mock.calls.find(([, options]) => options?.method === "POST")!;
    expect(JSON.parse(options.body)).toEqual({ request_id: expect.any(String), approval_hash: review.approval_hash,
      reason: receipt.reason, confirm_accrual: true });
    expect(screen.queryByRole("button", { name: "Confirm accrual" })).not.toBeInTheDocument();
  });
  it("reuses the exact request after a lost response", async () => {
    mocks.api.mockImplementation((_, options) => options?.method === "POST" ? Promise.reject(new Error("Lost response")) : Promise.resolve(review));
    subject(); await complete(); await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Confirm accrual" }));
    await waitFor(() => expect(mocks.api.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(2));
    const bodies = mocks.api.mock.calls.filter(([, options]) => options?.method === "POST").map(([, options]) => options.body);
    expect(bodies[0]).toBe(bodies[1]);
  });
  it("reads an existing receipt without offering a second accrual", async () => {
    mocks.api.mockResolvedValue({ ...review, accrual: receipt });
    subject(); await open(); expect(screen.getByText("Accrual recorded")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("does not offer accrual when the preview fails", async () => {
    mocks.api.mockRejectedValue(new Error("Work assignment changed")); subject();
    fireEvent.click(screen.getByRole("button", { name: "Review accrual" }));
    await screen.findByRole("alert"); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it("clears consent on changed reason and recheck", async () => {
    subject(); await open(); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Accrual reason"), { target: { value: receipt.reason } });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Check accrual" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it.each([["ru", "Проверить начисление"], ["he", "בדיקת זקיפת שכר"]])("labels review in %s", (locale, label) => {
    mocks.locale = locale; subject(); expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });
});
