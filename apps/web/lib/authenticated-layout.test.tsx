import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthenticatedLayout from "@/app/(authenticated)/layout";

const mocks = vi.hoisted(() => ({
  authUser: vi.fn(), profile: vi.fn(), cookies: vi.fn(), capabilities: vi.fn(),
  staff: vi.fn(), session: vi.fn(), organizations: vi.fn(), requireStaff: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); } }));
vi.mock("@/components/authenticated-app-chrome", () => ({ AuthenticatedAppChrome: () => null }));
vi.mock("@/lib/auth/request-user", () => ({
  getCachedAuthenticatedSupabaseUser: mocks.authUser,
  getCachedCurrentUserProfile: mocks.profile,
}));
vi.mock("@/lib/access/managed-capabilities-server", () => ({ getCachedOrganizationCapabilities: mocks.capabilities }));
vi.mock("@/lib/platform/auth", () => ({ requirePlatformStaffAccess: mocks.requireStaff }));
vi.mock("@/lib/platform/create-repository", () => ({ createPlatformRepository: () => ({
  findStaffByUserId: mocks.staff, findActiveAccessSession: mocks.session, listOrganizations: mocks.organizations,
}) }));

const profile = { id: "staff-1", email: "admin@example.com", role: "admin", org: { id: "org-1", name: "Home" } };
const organization = { id: "org-2", name: "Customer", slug: "customer", plan: "trial", accessModel: "legacy", createdAt: new Date() };

describe("returning admin layout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.authUser.mockResolvedValue({ id: "staff-1" });
    mocks.profile.mockResolvedValue(profile);
    mocks.cookies.mockResolvedValue(new Map());
    mocks.staff.mockResolvedValue({ userId: "staff-1", status: "active", role: "owner" });
    mocks.organizations.mockResolvedValue([organization]);
    mocks.capabilities.mockResolvedValue({ mode: "active" });
  });

  it("keeps account selection when login survives but the support cookie is gone", async () => {
    const result = await AuthenticatedLayout({ children: null });
    expect(result.props.platformSwitcher).toMatchObject({ activeSession: null, organizations: [{ id: "org-2" }] });
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it("keeps account selection after a support session expires", async () => {
    mocks.cookies.mockResolvedValue(new Map([["argos_platform_session", "expired"]]));
    mocks.session.mockResolvedValue(null);
    const result = await AuthenticatedLayout({ children: null });
    expect(result.props.platformSwitcher).toMatchObject({ activeSession: null, organizations: [{ id: "org-2" }] });
    expect(mocks.session).toHaveBeenCalledWith("expired", "staff-1");
  });

  it("preserves a valid selected account", async () => {
    mocks.profile.mockResolvedValue({ ...profile, email: "platform:staff-1" });
    mocks.cookies.mockResolvedValue(new Map([["argos_platform_session", "session-1"]]));
    mocks.session.mockResolvedValue({ id: "session-1", targetOrgId: "org-2", expiresAt: new Date(), reason: "Support" });
    const result = await AuthenticatedLayout({ children: null });
    expect(result.props.platformSwitcher.activeSession.targetOrgId).toBe("org-2");
  });

  it.each([null, { status: "revoked" }])("does not expose account selection to non-staff or revoked staff: %s", async (staff) => {
    mocks.staff.mockResolvedValue(staff);
    const result = await AuthenticatedLayout({ children: null });
    expect(result.props.platformSwitcher).toBeUndefined();
    expect(mocks.organizations).not.toHaveBeenCalled();
  });

  it.each([null, { ...profile, org: null }])("returns staff without a usable tenant profile to the admin dashboard: %s", async (user) => {
    mocks.profile.mockResolvedValue(user);
    await expect(AuthenticatedLayout({ children: null })).rejects.toThrow("redirect:/platform/dashboard");
  });

  it("sends staff in an inactive home account back to the admin dashboard", async () => {
    mocks.capabilities.mockResolvedValue({ mode: "inactive" });
    await expect(AuthenticatedLayout({ children: null })).rejects.toThrow("redirect:/platform/dashboard");
  });

  it.each([
    [null, "active", "/auth/error"],
    [{ ...profile, org: null }, "active", "/onboarding"],
    [profile, "inactive", "/access-pending"],
  ])("preserves ordinary user routing: %s", async (user, mode, destination) => {
    mocks.staff.mockResolvedValue(null);
    mocks.profile.mockResolvedValue(user);
    mocks.capabilities.mockResolvedValue({ mode });
    await expect(AuthenticatedLayout({ children: null })).rejects.toThrow(`redirect:${destination}`);
  });

  it("requires existing staff MFA before loading the account list", async () => {
    mocks.requireStaff.mockRejectedValue(new Error("redirect:/platform/mfa/verify"));
    await expect(AuthenticatedLayout({ children: null })).rejects.toThrow("redirect:/platform/mfa/verify");
    expect(mocks.organizations).not.toHaveBeenCalled();
  });
});
