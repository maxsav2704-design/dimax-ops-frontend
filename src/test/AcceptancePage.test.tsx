import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AcceptancePage from "@/views/public/AcceptancePage";

const fetchMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiBaseUrl: () => "https://api.dimax.test",
}));

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe("AcceptancePage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => ({
        beginPath: vi.fn(),
        clearRect: vi.fn(),
        lineTo: vi.fn(),
        moveTo: vi.fn(),
        setTransform: vi.fn(),
        stroke: vi.fn(),
        lineCap: "round",
        lineJoin: "round",
        lineWidth: 2,
        strokeStyle: "#111318",
      }),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "getBoundingClientRect",
      {
        configurable: true,
        value: () => ({
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 600,
          bottom: 170,
          width: 600,
          height: 170,
          toJSON: () => ({}),
        }),
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads completed work and signs the acceptance document", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          journal: {
            id: "journal-1",
            title: "Final acceptance",
            status: "ACTIVE",
            snapshot_version: 2,
          },
          project: {
            name: "North Tower",
            address: "Tel Aviv",
            developer_company: "Builder Ltd",
            contact_name: "Dana Cohen",
          },
          items: [
            {
              unit_label: "A-101",
              door_type_name: "Fire door",
              installed_at: "2026-08-29T08:00:00Z",
            },
          ],
          addon_items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, pdf_ready: true, email_queued: true }),
      });

    render(<AcceptancePage token="public-token" />);

    expect(await screen.findByText("Final acceptance")).toBeInTheDocument();
    expect(screen.getByText("A-101")).toBeInTheDocument();
    expect(screen.getByText("Fire door")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Dana Cohen" },
    });
    const canvas = screen.getByLabelText("Signature field");
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 20, clientY: 80 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 160, clientY: 35 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 160, clientY: 35 });
    fireEvent.click(
      screen.getByText(
        "I confirm that the listed work was completed and accepted.",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Sign and create PDF" }),
    );

    expect(await screen.findByText("Document signed")).toBeInTheDocument();
    expect(
      screen.getByText(/queued for delivery to the developer/),
    ).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [signUrl, signInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(signUrl).toBe(
      "https://api.dimax.test/api/v1/public/journals/public-token/sign",
    );
    const body = JSON.parse(String(signInit.body));
    expect(body.signer_name).toBe("Dana Cohen");
    expect(body.signature_payload.strokes).toHaveLength(1);
  });

  it("shows only the accepted volume, the excluded rows with reasons and the open issues, and signs the version it saw", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          journal: { id: "journal-2", title: "Partial acceptance", status: "ACTIVE", snapshot_version: 7, partial_acceptance: true },
          project: { name: "North Tower", address: "Tel Aviv", developer_company: "Builder Ltd", contact_name: "Dana Cohen" },
          items: [
            { unit_label: "W-1", door_type_name: "Entrance", installed_at: "2026-10-20T08:00:00Z", accepted: true, exclusion_reason: null },
            { unit_label: "W-2", door_type_name: "Entrance", installed_at: "2026-10-21T08:00:00Z", accepted: false, exclusion_reason: "Scratch, see issue" },
          ],
          addon_items: [],
          stage_items: [{ unit_label: "S-1", door_type_name: "Staged", stage_code: "FRAME", stage_name: "Frame", completed_at: "2026-10-22T08:00:00Z", accepted: true, exclusion_reason: null }],
          open_issues: [{ unit_label: "W-2", stage_code: null, source: "INTERNAL", title: "Scratch on the leaf", workflow_state: "RESOLVED", raised_at: "2026-10-21T09:00:00Z" }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, pdf_ready: true, email_queued: true }) });

    render(<AcceptancePage token="public-token" />);
    expect(await screen.findByText("Partial acceptance")).toBeInTheDocument();
    expect(screen.getByText("W-1")).toBeInTheDocument();
    expect(screen.getByTestId("acceptance-stages")).toHaveTextContent("S-1 · Frame");
    const excluded = screen.getByTestId("acceptance-excluded");
    expect(excluded).toHaveTextContent("Not accepted in this document (1)");
    expect(excluded).toHaveTextContent("W-2 · Entrance");
    expect(excluded).toHaveTextContent("Scratch, see issue");
    expect(screen.getByTestId("acceptance-issues")).toHaveTextContent("W-2 · Scratch on the leaf");
    expect(screen.getByTestId("acceptance-issues")).toHaveTextContent("fixed, awaiting check");
    // The excluded door is not in the accepted table.
    expect(screen.getAllByRole("row").some((row) => row.textContent?.includes("W-2") && !excluded.contains(row))).toBe(false);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Dana Cohen" } });
    const canvas = screen.getByLabelText("Signature field");
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 20, clientY: 80 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 160, clientY: 35 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 160, clientY: 35 });
    fireEvent.click(screen.getByText("I confirm that the listed work was completed and accepted."));
    fireEvent.click(screen.getByRole("button", { name: "Sign and create PDF" }));
    expect(await screen.findByText("Document signed")).toBeInTheDocument();
    const [, signInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(signInit.body)).snapshot_version).toBe(7);
  });

  it("shows the invalid-link message and no signing form when the public journal cannot be loaded", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ detail: "not found" }) });

    render(<AcceptancePage token="expired-token" />);

    expect(await screen.findByText("This signing link is invalid or expired.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign and create PDF" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the signing form and shows the server message when signing fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          journal: { id: "journal-1", title: "Final acceptance", status: "ACTIVE", snapshot_version: 2 },
          project: { name: "North Tower", address: "Tel Aviv", developer_company: "Builder Ltd", contact_name: "Dana Cohen" },
          items: [{ unit_label: "A-101", door_type_name: "Fire door", installed_at: "2026-08-29T08:00:00Z" }],
          addon_items: [],
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ detail: "Journal already signed" }) });

    render(<AcceptancePage token="public-token" />);
    expect(await screen.findByText("Final acceptance")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Dana Cohen" } });
    const canvas = screen.getByLabelText("Signature field");
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 20, clientY: 80 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 160, clientY: 35 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 160, clientY: 35 });
    fireEvent.click(screen.getByText("I confirm that the listed work was completed and accepted."));
    fireEvent.click(screen.getByRole("button", { name: "Sign and create PDF" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Journal already signed|Signing failed/)).toBeInTheDocument();
    expect(screen.queryByText("Document signed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign and create PDF" })).toBeInTheDocument();
  });
});
