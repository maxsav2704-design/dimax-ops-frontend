import { describe, expect, it } from "vitest";

import { canAccessAdminPath } from "@/lib/admin-access";

describe("admin-access policy", () => {
  it("allows ADMIN across admin routes", () => {
    expect(canAccessAdminPath("ADMIN", "/")).toBe(true);
    expect(canAccessAdminPath("ADMIN", "/projects")).toBe(true);
    expect(canAccessAdminPath("ADMIN", "/operations")).toBe(true);
    expect(canAccessAdminPath("ADMIN", "/library")).toBe(true);
    expect(canAccessAdminPath("ADMIN", "/settings")).toBe(true);
  });

  it("keeps unknown role permissive to avoid false lockouts before role load", () => {
    expect(canAccessAdminPath(null, "/")).toBe(true);
    expect(canAccessAdminPath(null, "/reports")).toBe(true);
  });

  it("blocks INSTALLER from admin routes", () => {
    expect(canAccessAdminPath("INSTALLER", "/")).toBe(false);
    expect(canAccessAdminPath("INSTALLER", "/operations")).toBe(false);
    expect(canAccessAdminPath("INSTALLER", "/reports")).toBe(false);
    expect(canAccessAdminPath("INSTALLER", "/projects/abc")).toBe(false);
  });

  it("applies admin scopes to admin routes", () => {
    expect(
      canAccessAdminPath({ role: "ADMIN", admin_scope: "OPERATIONS", can_view_rates: false }, "/settings")
    ).toBe(false);
    expect(
      canAccessAdminPath({ role: "ADMIN", admin_scope: "OPERATIONS", can_view_rates: false }, "/operations")
    ).toBe(true);
    expect(
      canAccessAdminPath({ role: "ADMIN", admin_scope: "FINANCE", can_view_rates: true }, "/reports")
    ).toBe(true);
    expect(
      canAccessAdminPath({ role: "ADMIN", admin_scope: "FINANCE", can_view_rates: true }, "/projects")
    ).toBe(false);
    expect(
      canAccessAdminPath({ role: "ADMIN", admin_scope: "FINANCE", can_view_rates: true }, "/library")
    ).toBe(false);
    expect(
      canAccessAdminPath({ role: "ADMIN", admin_scope: "VIEWER", can_view_rates: false }, "/reports")
    ).toBe(false);
    expect(
      canAccessAdminPath({ role: "ADMIN", admin_scope: "VIEWER", can_view_rates: false }, "/calendar")
    ).toBe(true);
  });
});
