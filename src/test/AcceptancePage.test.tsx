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
