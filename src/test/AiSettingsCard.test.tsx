import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiSettingsCard } from "@/components/ai/AiSettingsCard";

const { api, language } = vi.hoisted(() => ({ api: vi.fn(), language: { locale: "en" as "en" | "ru" | "he" } }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ locale: language.locale, dir: language.locale === "he" ? "rtl" : "ltr" }),
  useCopy: () => (en: string, ru: string, he: string) => ({ en, ru, he })[language.locale],
}));

const status = { ready: true, reason: "ready", tools: [], read_only: true, provider: "mock", actions_enabled: true, execution: "background",
  rules_version: 1, daily_limit: 500, daily_used: 7 };
const rules = { version: 1, text: "Deadlines at least two days.", updated_at: "2026-10-19T09:00:00Z", updated_by: "Max" };

function mount(canManage = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AiSettingsCard canManage={canManage} /></QueryClientProvider>);
}

describe("AiSettingsCard", () => {
  beforeEach(() => {
    language.locale = "en"; api.mockReset();
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.endsWith("/ai/status")) return status;
      if (path.endsWith("/ai/rules") && init?.method === "PUT") return { ...rules, version: 2, text: JSON.parse(init.body as string).text };
      if (path.endsWith("/ai/rules")) return rules;
      if (path.endsWith("/ai/check")) return { ok: true, provider: "mock", model: null, latency_ms: 12, code: null, answer_preview: "OK" };
      return {};
    });
  });

  it("shows connection facts, the budget and the current rules, saves a new version and checks the connection", async () => {
    mount();
    expect(await screen.findByDisplayValue("Deadlines at least two days.")).toBeInTheDocument();
    expect(screen.getByText("Daily limit: 7 of 500 requests today")).toBeInTheDocument();
    expect(screen.getByText("Execution: background worker")).toBeInTheDocument();
    expect(screen.getByText(/Version 1 · Max/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save rules" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Company rules for the agent"), { target: { value: "Deadlines at least three days." } });
    fireEvent.click(screen.getByRole("button", { name: "Save rules" }));
    await waitFor(() => expect(api.mock.calls.some(([path, init]) => String(path).endsWith("/ai/rules") && init?.method === "PUT")).toBe(true));
    expect(await screen.findByText(/Rules saved · Version 2/)).toBeInTheDocument();
    const put = api.mock.calls.find(([path, init]) => String(path).endsWith("/ai/rules") && init?.method === "PUT");
    expect(JSON.parse(put?.[1].body as string)).toEqual({ text: "Deadlines at least three days." });
    fireEvent.click(screen.getByRole("button", { name: "Check connection" }));
    expect(await screen.findByText(/Connection works · mock · 12 ms/)).toBeInTheDocument();
  });

  it("reports a failed check with its code only and keeps controls read-only for non-owners", async () => {
    api.mockImplementation(async (path: string) => path.endsWith("/ai/status") ? status : path.endsWith("/ai/rules") ? rules :
      path.endsWith("/ai/check") ? { ok: false, provider: "openai", model: "gpt", latency_ms: 300, code: "AI_PROVIDER_ACCESS", answer_preview: null } : {});
    mount();
    await screen.findByDisplayValue("Deadlines at least two days.");
    fireEvent.click(screen.getByRole("button", { name: "Check connection" }));
    expect(await screen.findByText(/Connection check failed · AI_PROVIDER_ACCESS/)).toBeInTheDocument();
    cleanup();
    mount(false);
    expect(await screen.findByDisplayValue("Deadlines at least two days.")).toBeDisabled();
    expect(screen.getByText("Only the company owner can change rules or run the check.")).toBeInTheDocument();
  });

  it("renders Hebrew copy and survives an empty status payload", async () => {
    language.locale = "he";
    api.mockImplementation(async () => ({}));
    mount();
    expect(await screen.findByText("כללי החברה לסוכן")).toBeInTheDocument();
    expect(screen.getByText("עדיין לא הוגדרו כללים")).toBeInTheDocument();
  });
});
