import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WORKSPACE_THEME } from "@/lib/organizations/workspace-theme";

const getAuthenticatedSupabaseUser = vi.fn();
const createUsersRepository = vi.fn();
const createEffectiveTenantUsersRepository = vi.fn();
const createPlatformRepository = vi.fn();
const getCurrentUserDetails = vi.fn();
const updateOrganizationWorkspaceTheme = vi.fn();
const auditPlatformWorkspaceMutation = vi.fn();
const getPlatformMutationAuditContext = vi.fn();
const cookies = vi.fn();

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantUsersRepository,
}));

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/platform/audit", () => ({
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
}));

vi.mock("@/lib/users/service", () => ({
  getCurrentUserDetails,
  updateOrganizationWorkspaceTheme,
}));

function currentUser(role: "admin" | "manager" = "admin") {
  return {
    id: "auth-user-1",
    email: "jared@example.com",
    firstName: "Jared",
    lastName: "Newman",
    profileImageUrl: null,
    role,
    orgId: "org-1",
    displayNameSet: true,
    org: {
      id: "org-1",
      name: "Jared Newman's Team",
      slug: "jared-newman",
      plan: "trial",
      logoUrl: null,
      workspaceTheme: null,
      createdAt: "2026-04-03T00:00:00.000Z",
    },
  };
}

describe("organization branding route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createUsersRepository.mockReset();
    createEffectiveTenantUsersRepository.mockReset();
    createPlatformRepository.mockReset();
    getCurrentUserDetails.mockReset();
    updateOrganizationWorkspaceTheme.mockReset();
    auditPlatformWorkspaceMutation.mockReset();
    getPlatformMutationAuditContext.mockReset();
    cookies.mockReset();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createUsersRepository.mockReturnValue({ repository: true });
    createEffectiveTenantUsersRepository.mockResolvedValue({ repository: "effective" });
    createPlatformRepository.mockReturnValue({ platformRepository: true });
    cookies.mockResolvedValue(new Map());
    getPlatformMutationAuditContext.mockResolvedValue({ sessionId: "session-1" });
    getCurrentUserDetails.mockResolvedValue({ ok: true, data: currentUser() });
  });

  it("saves a workspace branding theme for admins", async () => {
    updateOrganizationWorkspaceTheme.mockResolvedValue({
      ok: true,
      data: {
        ...currentUser(),
        org: {
          ...currentUser().org,
          workspaceTheme: DEFAULT_WORKSPACE_THEME,
        },
      },
    });

    const route = await import("../app/api/organizations/branding/route");
    const response = await route.PATCH(
      new Request("http://localhost:3000/api/organizations/branding", {
        method: "PATCH",
        body: JSON.stringify(DEFAULT_WORKSPACE_THEME),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      org: {
        workspaceTheme: DEFAULT_WORKSPACE_THEME,
      },
    });
    expect(updateOrganizationWorkspaceTheme).toHaveBeenCalledWith(
      { repository: "effective" },
      "auth-user-1",
      DEFAULT_WORKSPACE_THEME,
    );
    expect(auditPlatformWorkspaceMutation).toHaveBeenCalledWith(
      { platformRepository: true },
      { sessionId: "session-1" },
      {
        action: "platform.workspace.branding.update",
        metadata: { route: "/api/organizations/branding" },
        resourceId: "org-1",
        resourceType: "organization",
      },
    );
  });

  it("restores default workspace branding for admins", async () => {
    updateOrganizationWorkspaceTheme.mockResolvedValue({
      ok: true,
      data: currentUser(),
    });

    const route = await import("../app/api/organizations/branding/route");
    const response = await route.DELETE();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      org: {
        workspaceTheme: null,
      },
    });
    expect(updateOrganizationWorkspaceTheme).toHaveBeenCalledWith(
      { repository: "effective" },
      "auth-user-1",
      null,
    );
    expect(auditPlatformWorkspaceMutation).toHaveBeenCalledWith(
      { platformRepository: true },
      { sessionId: "session-1" },
      {
        action: "platform.workspace.branding.restore",
        metadata: { route: "/api/organizations/branding" },
        resourceId: "org-1",
        resourceType: "organization",
      },
    );
  });

  it("rejects malformed JSON before saving", async () => {
    const route = await import("../app/api/organizations/branding/route");
    const response = await route.PATCH(
      new Request("http://localhost:3000/api/organizations/branding", {
        method: "PATCH",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace branding payload must be valid JSON.",
    });
    expect(updateOrganizationWorkspaceTheme).not.toHaveBeenCalled();
    expect(auditPlatformWorkspaceMutation).not.toHaveBeenCalled();
  });

  it("rejects non-admin branding changes", async () => {
    getCurrentUserDetails.mockResolvedValueOnce({
      ok: true,
      data: currentUser("manager"),
    });

    const route = await import("../app/api/organizations/branding/route");
    const response = await route.DELETE();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only admins can update organization branding.",
    });
    expect(updateOrganizationWorkspaceTheme).not.toHaveBeenCalled();
    expect(auditPlatformWorkspaceMutation).not.toHaveBeenCalled();
  });
});
