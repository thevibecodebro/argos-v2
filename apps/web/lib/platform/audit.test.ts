import { describe, expect, it, vi } from "vitest";
import {
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
} from "./audit";

function createRepository() {
  return {
    createAuditEvent: vi.fn().mockResolvedValue({ id: "audit-1" }),
    findActiveAccessSession: vi.fn(),
    findStaffByUserId: vi.fn(),
  };
}

describe("platform mutation audit helpers", () => {
  it("returns null when there is no active platform session cookie", async () => {
    const repository = createRepository();

    await expect(
      getPlatformMutationAuditContext(repository, {
        authUserId: "staff-1",
        cookies: new Map(),
      }),
    ).resolves.toBeNull();
    expect(repository.findStaffByUserId).not.toHaveBeenCalled();
    expect(repository.findActiveAccessSession).not.toHaveBeenCalled();
  });

  it("resolves an active platform session into reusable audit context", async () => {
    const repository = createRepository();
    repository.findStaffByUserId.mockResolvedValue({
      role: "operator",
      status: "active",
      userId: "staff-1",
    });
    repository.findActiveAccessSession.mockResolvedValue({
      id: "session-1",
      reason: "Support escalation",
      staffEmailSnapshot: "operator@argos.test",
      staffRoleSnapshot: "operator",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
      targetOrgName: "Acme Health",
      targetOrgNameSnapshot: "Acme Health",
      targetOrgSlug: "acme-health",
      targetOrgSlugSnapshot: "acme-health",
    });

    await expect(
      getPlatformMutationAuditContext(repository, {
        authUserId: "staff-1",
        cookies: new Map([["argos_platform_session", "session-1"]]),
      }),
    ).resolves.toEqual({
      reason: "Support escalation",
      sessionId: "session-1",
      staffEmailSnapshot: "operator@argos.test",
      staffRoleSnapshot: "operator",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
      targetOrgNameSnapshot: "Acme Health",
      targetOrgSlugSnapshot: "acme-health",
    });
  });

  it("writes platform audit events with the session reason for workspace mutations", async () => {
    const repository = createRepository();

    await expect(
      auditPlatformWorkspaceMutation(
        repository,
        {
          reason: "Support escalation",
          sessionId: "session-1",
          staffEmailSnapshot: "operator@argos.test",
          staffRoleSnapshot: "operator",
          staffUserId: "staff-1",
          targetOrgId: "org-1",
          targetOrgNameSnapshot: "Acme Health",
          targetOrgSlugSnapshot: "acme-health",
        },
        {
          action: "platform.workspace.invite.create",
          metadata: { email: "admin@acme.test" },
          resourceId: "invite-1",
          resourceType: "invite",
        },
      ),
    ).resolves.toEqual({ id: "audit-1" });

    expect(repository.createAuditEvent).toHaveBeenCalledWith({
      action: "platform.workspace.invite.create",
      metadata: { email: "admin@acme.test" },
      reason: "Support escalation",
      resourceId: "invite-1",
      resourceType: "invite",
      sessionId: "session-1",
      staffEmailSnapshot: "operator@argos.test",
      staffRoleSnapshot: "operator",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
      targetOrgNameSnapshot: "Acme Health",
      targetOrgSlugSnapshot: "acme-health",
    });
  });
});
