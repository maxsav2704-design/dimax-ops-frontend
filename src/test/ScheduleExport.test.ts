import { describe, expect, it, vi } from "vitest";

import {
  buildScheduleCsv,
  downloadScheduleCsv,
} from "@/views/installer/schedule-export";

describe("schedule-export", () => {
  it("builds CSV rows with escaping", () => {
    const csv = buildScheduleCsv([
      {
        title: 'Door "A", line 1',
        event_type: "installation",
        starts_at: "2026-03-08T08:00:00Z",
        ends_at: "2026-03-08T09:00:00Z",
        location: "Tower A\nFloor 2",
        waze_url: null,
        description: "Need tools",
        project_id: "project-1",
      },
    ]);

    expect(csv).toContain("title,event_type,starts_at,ends_at,location,waze_url,description,project_id");
    expect(csv).toContain('"Door ""A"", line 1"');
    expect(csv).toContain('"Tower A\nFloor 2"');
  });

  it("downloads CSV blob with provided filename", () => {
    const createObjectURLMock = vi.fn(() => "blob:mock");
    const revokeObjectURLMock = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURLMock,
    });

    try {
      downloadScheduleCsv("col1,col2\nv1,v2", "schedule.csv");
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock");

      const blobArg = createObjectURLMock.mock.calls[0][0] as Blob;
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toContain("text/csv");
      expect(blobArg.size).toBeGreaterThan(0);
      expect(clickSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
      clickSpy.mockRestore();
    }
  });
});
