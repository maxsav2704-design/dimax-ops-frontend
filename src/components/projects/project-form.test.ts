import { describe, expect, it } from "vitest";

import { buildDraftMapPreviewUrl, emptyProjectForm } from "@/components/projects/project-form";

describe("buildDraftMapPreviewUrl", () => {
  it("shows no map preview while the coordinates are empty", () => {
    // Regression: Number("") is 0, so an empty address drew a map of 0°,0°.
    expect(buildDraftMapPreviewUrl(emptyProjectForm())).toBeNull();
    expect(buildDraftMapPreviewUrl({ ...emptyProjectForm(), address_lat: "32.0" })).toBeNull();
    expect(buildDraftMapPreviewUrl({ ...emptyProjectForm(), address_lat: " ", address_lng: "34.8" })).toBeNull();
  });

  it("rejects coordinates that are not numbers", () => {
    expect(buildDraftMapPreviewUrl({ ...emptyProjectForm(), address_lat: "north", address_lng: "34.8" })).toBeNull();
  });

  it("builds the OpenStreetMap embed around valid coordinates", () => {
    const url = buildDraftMapPreviewUrl({ ...emptyProjectForm(), address_lat: "31.8", address_lng: "34.65" });
    expect(url).toBe(
      "https://www.openstreetmap.org/export/embed.html?bbox=34.640000%2C31.790000%2C34.660000%2C31.810000&layer=mapnik&marker=31.800000%2C34.650000",
    );
  });
});
