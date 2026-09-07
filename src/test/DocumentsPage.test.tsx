import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import DocumentsPage from "@/views/DocumentsPage";

const { apiFetchMock, apiDownloadMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiDownloadMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
  apiDownload: apiDownloadMock,
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentsPage />
    </QueryClientProvider>
  );
}

async function baseApiHandler(path: string, init?: RequestInit) {
  if (path === "/api/v1/admin/documents/templates" && !init) {
    return {
      items: [
        {
          id: "template-1",
          code: "handover",
          name: "Project Handover",
          description: "Client handover document",
          entity_scope: "PROJECT",
          source_filename: "handover.txt",
          mime_type: "text/plain",
          size_bytes: 120,
          placeholders: ["project.name", "manual.note"],
          is_active: true,
          created_at: "2026-05-18T10:00:00Z",
          updated_at: "2026-05-18T10:00:00Z",
        },
      ],
    };
  }
  if (path === "/api/v1/admin/projects?limit=200") {
    return {
      items: [
        {
          id: "project-1",
          code: "P-1",
          name: "Project Alpha",
          address: "HaYam 17",
          status: "ACTIVE",
        },
      ],
    };
  }
  if (path === "/api/v1/admin/documents/projects/project-1/context") {
    return {
      project_id: "project-1",
      fields: {
        "project.name": "Project Alpha",
        "project.address": "HaYam 17",
        "doors.total": 4,
      },
    };
  }
  if (path.startsWith("/api/v1/admin/documents/generated?")) {
    return {
      items: [
        {
            id: "generation-1",
            template_id: "template-1",
            project_id: "project-1",
            template_name: "Project Handover",
            project_name: "Project Alpha",
            project_code: "P-1",
            file_name: "handover-1234.txt",
          mime_type: "text/plain",
          size_bytes: 80,
          status: "READY",
          download_url: "/api/v1/admin/documents/generated/generation-1/download",
          created_at: "2026-05-18T10:10:00Z",
        },
      ],
    };
  }
  throw new Error(`Unexpected path: ${path}`);
}

function mockBaseApi() {
  apiFetchMock.mockImplementation(baseApiHandler);
}

describe("DocumentsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiDownloadMock.mockReset();
  });

  it("renders templates, project fields and generated documents", async () => {
    mockBaseApi();

    renderPage();

    expect((await screen.findAllByText("Project Handover")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Project Alpha")).length).toBeGreaterThan(0);
    expect(await screen.findByText("project.address")).toBeInTheDocument();
    expect(screen.getAllByText("handover-1234.txt").length).toBeGreaterThan(0);
  }, 15000);

  it("uploads a document template with multipart form data", async () => {
    mockBaseApi();
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/admin/documents/templates" && init?.method === "POST") {
        expect(init.body).toBeInstanceOf(FormData);
        const body = init.body as FormData;
        expect(body.get("name")).toBe("Completion Act");
        expect(body.get("description")).toBe("For project closeout");
        expect(body.get("file")).toBeInstanceOf(File);
        return {
          id: "template-2",
          code: "completion-act",
          name: "Completion Act",
          description: "For project closeout",
          entity_scope: "PROJECT",
          source_filename: "completion.txt",
          mime_type: "text/plain",
          size_bytes: 32,
          placeholders: ["project.name"],
          is_active: true,
          created_at: "2026-05-18T11:00:00Z",
          updated_at: "2026-05-18T11:00:00Z",
        };
      }
      return baseApiHandler(path, init);
    });

    renderPage();

    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Completion Act" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "For project closeout" } });
    fireEvent.change(screen.getByLabelText("Template file (.docx, .html, .txt)"), {
      target: {
        files: [new File(["Object: {{project.name}}"], "completion.txt", { type: "text/plain" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload template/i }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/v1/admin/documents/templates",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("Template uploaded: Completion Act")).toBeInTheDocument();
  }, 15000);

  it("generates a project document from the selected template", async () => {
    mockBaseApi();
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/admin/documents/projects/project-1/render" && init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({
            template_id: "template-1",
            overrides: { "manual.note": "" },
          })
        );
        return {
          id: "generation-2",
          template_id: "template-1",
          project_id: "project-1",
          template_name: "Project Handover",
          project_name: "Project Alpha",
          project_code: "P-1",
          file_name: "handover-5678.txt",
          mime_type: "text/plain",
          size_bytes: 90,
          status: "READY",
          download_url: "/api/v1/admin/documents/generated/generation-2/download",
          created_at: "2026-05-18T11:10:00Z",
        };
      }
      return baseApiHandler(path, init);
    });

    renderPage();

    expect(await screen.findByText("project.address")).toBeInTheDocument();
    const generateButton = await screen.findByRole("button", { name: /generate document/i });
    await waitFor(() => expect(generateButton).not.toBeDisabled());
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/v1/admin/documents/projects/project-1/render",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("Document generated: handover-5678.txt")).toBeInTheDocument();
  }, 15000);

  it("blocks document generation until all template placeholders are resolved", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/admin/documents/templates" && !init) {
        return {
          items: [
            {
              id: "template-1",
              code: "approval",
              name: "Approval Document",
              description: "Requires a manual approver",
              entity_scope: "PROJECT",
              source_filename: "approval.txt",
              mime_type: "text/plain",
              size_bytes: 120,
              placeholders: ["project.name", "manual.approved_by"],
              is_active: true,
              created_at: "2026-05-18T10:00:00Z",
              updated_at: "2026-05-18T10:00:00Z",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/documents/projects/project-1/render" && init?.method === "POST") {
        throw new Error("Render endpoint should not be called with unresolved fields.");
      }
      return baseApiHandler(path, init);
    });

    renderPage();

    expect((await screen.findAllByText("manual.approved_by")).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(/fields required before generation/i)
    ).toBeInTheDocument();
    const generateButton = await screen.findByRole("button", { name: /generate document/i });
    expect(generateButton).toBeDisabled();
    expect(
      apiFetchMock.mock.calls.some(
        ([path, init]) =>
          path === "/api/v1/admin/documents/projects/project-1/render" &&
          (init as RequestInit | undefined)?.method === "POST"
      )
    ).toBe(false);
  }, 15000);

  it("archives a template without deleting document history", async () => {
    mockBaseApi();
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/admin/documents/templates/template-1" && init?.method === "PATCH") {
        expect(init.body).toBe(JSON.stringify({ is_active: false }));
        return {
          id: "template-1",
          code: "handover",
          name: "Project Handover",
          description: "Client handover document",
          entity_scope: "PROJECT",
          source_filename: "handover.txt",
          mime_type: "text/plain",
          size_bytes: 120,
          placeholders: ["project.name", "manual.note"],
          is_active: false,
          created_at: "2026-05-18T10:00:00Z",
          updated_at: "2026-05-18T10:30:00Z",
        };
      }
      return baseApiHandler(path, init);
    });

    renderPage();

    expect((await screen.findAllByText("Project Handover")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /archive project handover/i })[0]);

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/v1/admin/documents/templates/template-1",
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }
      );
    });
    expect(await screen.findByText("Template archived: Project Handover")).toBeInTheDocument();
    expect(screen.getAllByText("handover-1234.txt").length).toBeGreaterThan(0);
  }, 15000);

  it("downloads the original template file", async () => {
    mockBaseApi();
    apiDownloadMock.mockResolvedValue(
      new Response("Object: {{project.name}}", {
        headers: { "content-disposition": 'attachment; filename="handover.txt"' },
      })
    );

    renderPage();

    expect((await screen.findAllByText("Project Handover")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /download template project handover/i })[0]);

    await waitFor(() => {
      expect(apiDownloadMock).toHaveBeenCalledWith(
        "/api/v1/admin/documents/templates/template-1/download",
        {
          method: "GET",
          credentials: "include",
        }
      );
    });
  }, 15000);
});
