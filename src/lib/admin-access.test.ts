import { describe, expect, it } from "vitest";

import {
  canAccessAdminPath,
  canManageImports,
  canManageUsers,
  canRunPrivilegedAdminActions,
  canViewRates,
} from "@/lib/admin-access";

describe("admin-access policy", () => {
  it("allows an explicit owner profile across admin routes", () => {
    const owner = {
      role: "ADMIN" as const,
      admin_scope: "OWNER" as const,
      can_view_rates: true,
      can_manage_imports: true,
      can_manage_users: true,
    };
    expect(canAccessAdminPath(owner, "/")).toBe(true);
    expect(canAccessAdminPath(owner, "/projects")).toBe(true);
    expect(canAccessAdminPath(owner, "/operations")).toBe(true);
    expect(canAccessAdminPath(owner, "/library")).toBe(true);
    expect(canAccessAdminPath(owner, "/settings")).toBe(true);
  });

  it("does not promote a bare ADMIN role to owner", () => {
    expect(canAccessAdminPath("ADMIN", "/")).toBe(false);
    expect(canViewRates("ADMIN")).toBe(false);
    expect(canManageImports("ADMIN")).toBe(false);
    expect(canManageUsers("ADMIN")).toBe(false);
  });

  it("keeps unknown session closed until the authenticated role is loaded", () => {
    expect(canAccessAdminPath(null, "/")).toBe(false);
    expect(canAccessAdminPath(null, "/reports")).toBe(false);
    expect(canRunPrivilegedAdminActions(null)).toBe(false);
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
      canAccessAdminPath({ role: "ADMIN", admin_scope: "FINANCE", can_view_rates: true }, "/earnings-ledger")
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

  it("keeps financial visibility separate from operational mutations", () => {
    const finance = {
      role: "ADMIN" as const,
      admin_scope: "FINANCE" as const,
      can_view_rates: true,
      can_manage_imports: true,
      can_manage_users: true,
    };
    const operations = {
      role: "ADMIN" as const,
      admin_scope: "OPERATIONS" as const,
      can_view_rates: false,
      can_manage_imports: true,
      can_manage_users: true,
    };
    const viewer = {
      role: "ADMIN" as const,
      admin_scope: "VIEWER" as const,
      can_view_rates: false,
      can_manage_imports: true,
      can_manage_users: true,
    };

    expect(canViewRates(finance)).toBe(true);
    expect(canManageImports(finance)).toBe(false);
    expect(canManageUsers(finance)).toBe(false);
    expect(canRunPrivilegedAdminActions(finance)).toBe(false);
    expect(canRunPrivilegedAdminActions(operations)).toBe(true);
    expect(canManageImports(operations)).toBe(true);
    expect(canManageUsers(operations)).toBe(true);
    expect(canRunPrivilegedAdminActions(viewer)).toBe(false);
    expect(canManageImports(viewer)).toBe(false);
    expect(canManageUsers(viewer)).toBe(false);
  });
});
