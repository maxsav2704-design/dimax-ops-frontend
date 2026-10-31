import { describe, expect, it } from "vitest";

import { filenameFromDisposition } from "./download";

describe("filenameFromDisposition", () => {
  it("prefers the UTF-8 name, so Hebrew and Russian names survive the download", () => {
    const header = "attachment; filename=\"_____ ____.txt\"; filename*=UTF-8''%D7%97%D7%95%D7%96%D7%94%20%D0%90%D0%BA%D1%82.txt";
    expect(filenameFromDisposition(header, "x.txt")).toBe("חוזה Акт.txt");
  });

  it("falls back to the plain name, then to the given fallback", () => {
    expect(filenameFromDisposition('attachment; filename="handover.txt"', "x.txt")).toBe("handover.txt");
    expect(filenameFromDisposition("attachment; filename*=UTF-8''%E0%A4%A", "x.txt")).toBe("x.txt");
    expect(filenameFromDisposition(null, "x.txt")).toBe("x.txt");
  });
});
