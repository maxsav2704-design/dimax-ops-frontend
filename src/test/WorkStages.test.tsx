import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DoorStagesCard } from "@/components/projects/DoorStagesCard";
import { WorkStagesSection } from "@/components/doors/WorkStagesSection";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api, ApiError: class extends Error { status = 0; } }));
const { i18nStub, copyStub } = vi.hoisted(() => ({ i18nStub: { locale: "en", dir: "ltr" }, copyStub: (en: string) => en }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => i18nStub, useCopy: () => copyStub }));

const doorId = "a1b2c3d4-0000-4000-8000-000000000001";
const doorTypeId = "a1b2c3d4-0000-4000-8000-000000000002";
const installers = [{ id: "a1b2c3d4-0000-4000-8000-000000000011", full_name: "Installer A", is_active: true },
  { id: "a1b2c3d4-0000-4000-8000-000000000012", full_name: "Installer B", is_active: true }];
const plan = { id: "a1b2c3d4-0000-4000-8000-000000000021", door_type_id: doorTypeId, version: 1, reason: "Initial", created_by: installers[0].id,
  created_at: "2026-10-23T08:00:00Z", items: [{ stage_code: "FRAME", required: true, sequence: 1 }, { stage_code: "LEAF", required: true, sequence: 2 }] };
const stagesView = { door_id: doorId, door_status: "NOT_INSTALLED", door_version: 1, plan_id: plan.id, plan_version: 1, required_total: 2, required_done: 1, installed_by_stages: false,
  stages: [{ stage_code: "FRAME", name: "Frame", required: true, sequence: 1, installer_id: installers[0].id, assignment_id: "a1b2c3d4-0000-4000-8000-000000000031",
    completed_at: "2026-10-20T08:00:00Z", completed_by: installers[0].id, fact_id: "a1b2c3d4-0000-4000-8000-000000000041",
    earning_id: null, earning_status: "NO_RATE" },
  { stage_code: "LEAF", name: "Leaf", required: true, sequence: 2, installer_id: null, assignment_id: null, completed_at: null, completed_by: null, fact_id: null }] };

function mount(node: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);
}

describe("work stages admin", () => {
  beforeEach(() => { api.mockReset(); });

  it("offers a plan for a door without one and applies it", async () => {
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/stages")) return init?.method ? stagesView : null;
      if (url.includes("/stage-plans")) return { items: [plan], latest_version: 1 };
      if (url.endsWith("/work-plan")) return stagesView;
      throw new Error("unexpected " + url);
    });
    mount(<DoorStagesCard doorId={doorId} doorTypeId={doorTypeId} canPlan installers={installers} />);
    expect(await screen.findByText(/installed as a whole/)).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText("Plan"), { target: { value: plan.id } });
    fireEvent.click(screen.getByRole("button", { name: "Apply plan" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining("/work-plan"), expect.objectContaining({ method: "POST", body: JSON.stringify({ plan_id: plan.id }) })));
  });

  it("lets the office confirm a doubtful stage time with what it checked, never with a price", async () => {
    const review = { ...stagesView, stages: [{ ...stagesView.stages[0], earning_status: "TIME_REVIEW" }, stagesView.stages[1]] };
    let current = review;
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/stages") && !init?.method) return current;
      if (url.endsWith("/FRAME/confirm-time")) {
        current = { ...stagesView, stages: [{ ...stagesView.stages[0], earning_status: "RECORDED" }, stagesView.stages[1]] };
        return { id: doorId, status: "NOT_INSTALLED", version: 1, applied: true, required_total: 2, required_done: 1, door_installed: false, earning_status: "RECORDED" };
      }
      throw new Error("unexpected " + url);
    });
    mount(<DoorStagesCard doorId={doorId} doorTypeId={doorTypeId} canPlan installers={installers} />);
    const rows = await screen.findAllByTestId("door-stage-row");
    expect(within(rows[0]).getByTestId("stage-earning-status")).toHaveTextContent("cannot be confirmed");
    fireEvent.click(within(rows[0]).getByRole("button", { name: "Confirm the time" }));
    const submit = within(rows[0]).getByRole("button", { name: "Confirm and value" });
    expect(submit).toBeDisabled();
    fireEvent.change(within(rows[0]).getByLabelText("What did you check? FRAME"), { target: { value: "Site log" } });
    fireEvent.click(submit);
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining("/FRAME/confirm-time"),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ reason: "Site log" }) })));
    expect(await screen.findByText("Earning recorded")).toBeInTheDocument();
  });

  it("does not offer the time check to someone who cannot plan stages", async () => {
    api.mockResolvedValue({ ...stagesView, stages: [{ ...stagesView.stages[0], earning_status: "TIME_REVIEW" }, stagesView.stages[1]] });
    mount(<DoorStagesCard doorId={doorId} doorTypeId={doorTypeId} canPlan={false} installers={installers} />);
    await screen.findAllByTestId("door-stage-row");
    expect(screen.queryByRole("button", { name: "Confirm the time" })).toBeNull();
  });

  it("shows done and pending stages, assigns an installer and records a stage without any price", async () => {
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/stages") && !init?.method) return stagesView;
      if (url.endsWith("/assign")) return { ...stagesView, stages: [stagesView.stages[0], { ...stagesView.stages[1], installer_id: installers[1].id }] };
      if (url.endsWith("/complete")) return { id: doorId, status: "INSTALLED", version: 2, applied: true, required_total: 2, required_done: 2, door_installed: true, earning_status: "RECORDED" };
      throw new Error("unexpected " + url);
    });
    mount(<DoorStagesCard doorId={doorId} doorTypeId={doorTypeId} canPlan installers={installers} />);
    const rows = await screen.findAllByTestId("door-stage-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(/Done · Installer A/)).toBeInTheDocument();
    // Step 4: the money gap is named, never an amount.
    expect(within(rows[0]).getByTestId("stage-earning-status")).toHaveTextContent("No factory rate for this stage: fact kept, nothing accrued");
    expect(within(rows[1]).queryByTestId("stage-earning-status")).toBeNull();
    expect(within(rows[1]).getByText(/Pending · Installer: Not assigned/)).toBeInTheDocument();
    expect(screen.getByText(/Required stages: 1\/2/)).toBeInTheDocument();
    expect(within(rows[1]).queryByRole("button", { name: "Record stage" })).toBeNull();
    fireEvent.change(within(rows[1]).getByLabelText("Installer LEAF"), { target: { value: installers[1].id } });
    fireEvent.click(within(rows[1]).getByRole("button", { name: "Installer" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining("/LEAF/assign"), expect.objectContaining({ method: "POST", body: JSON.stringify({ installer_id: installers[1].id }) })));
    expect(api.mock.calls.every(([, init]) => !init?.body || !/price|earn|rate/.test(String(init.body)))).toBe(true);
  });

  it("hides the card when the stage is switched off and the catalog explains it", async () => {
    api.mockRejectedValue({ status: 409 });
    const { container } = mount(<DoorStagesCard doorId={doorId} doorTypeId={doorTypeId} canPlan installers={installers} />);
    await waitFor(() => expect(container.querySelector("[data-testid=door-stages-card]")).toBeNull());
    mount(<WorkStagesSection canPlan />);
    expect(await screen.findByText("Work stages are switched off on this server.")).toBeInTheDocument();
  });

  it("adds a stage to the catalog with an uppercase code and no price field", async () => {
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/work-stages") && !init?.method) return [{ id: installers[0].id, code: "FRAME", name: "Frame", sort_order: 10, is_active: true }];
      if (url.endsWith("/work-stages") && init?.method === "POST") return { id: installers[1].id, code: "LEAF", name: "Leaf", sort_order: 20, is_active: true };
      if (url.endsWith("/door-types")) return { items: [] };
      throw new Error("unexpected " + url);
    });
    mount(<WorkStagesSection canPlan />);
    expect(await screen.findByText("FRAME")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "leaf" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Leaf" } });
    fireEvent.change(screen.getByLabelText("Order"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Add stage" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith("/api/v1/admin/work-stages", expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "LEAF", name: "Leaf", sort_order: 20 }) })));
  });
});
