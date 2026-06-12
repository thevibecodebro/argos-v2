import { describe, expect, it, vi } from "vitest";
import {
  createPlatformSwitchSession,
  endPlatformSwitchSession,
  type PlatformSessionRepository,
} from "./sessions";

const session = {
  id: "session-1",
  staffUserId: "staff-1",
  targetOrgId: "org-1",
  reason: "Support request",
  status: "active" as const,
  startedAt: new Date("2026-06-11T10:00:00.000Z"),
  expiresAt: new Date("2026-06-11T11:00:00.000Z"),
  endedAt: null,
};

const auditEvent = {
  id: "audit-1",
  staffUserId: "staff-1",
  targetOrgId: "org-1",
  sessionId: "session-1",
  staffEmailSnapshot: "operator@argos.ai",
  staffRoleSnapshot: "operator" as const,
  targetOrgNameSnapshot: "Acme",
  targetOrgSlugSnapshot: "acme",
  action: "platform.session.create",
  resourceType: "organization",
  resourceId: "org-1",
  reason: "Support request",
  metadata: {},
  createdAt: new Date("2026-06-11T10:00:00.000Z"),
};

function createRepository(overrides: Partial<PlatformSessionRepository> = {}) {
  return {
    createAccessSessionWithAuditEvent: vi.fn().mockResolvedValue({ auditEvent, session }),
    endAccessSession: vi.fn().mockResolvedValue(true),
    ...overrides,
  } satisfies PlatformSessionRepository;
}

describe("createPlatformSwitchSession", () => {
  it("requires a reason", async () => {
    const repository = createRepository();

    await expect(
      createPlatformSwitchSession(
        repository,
        { userId: "staff-1", role: "operator" },
        { orgId: "org-1", reason: " " },
      ),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "reason is required",
    });

    expect(repository.createAccessSessionWithAuditEvent).not.toHaveBeenCalled();
  });

  it("creates an audited platform access session", async () => {
    const repository = createRepository();

    await expect(
      createPlatformSwitchSession(
        repository,
        { userId: "staff-1", role: "operator" },
        { orgId: "org-1", reason: " Support request " },
        { now: () => new Date("2026-06-11T10:00:00.000Z") },
      ),
    ).resolves.toEqual({
      ok: true,
      data: { auditEvent, session },
    });

    expect(repository.createAccessSessionWithAuditEvent).toHaveBeenCalledWith({
      audit: {
        action: "platform.session.create",
        metadata: {},
        resourceId: "org-1",
        resourceType: "organization",
      },
      expiresAt: new Date("2026-06-11T11:00:00.000Z"),
      reason: "Support request",
      staffUserId: "staff-1",
      targetOrgId: "org-1",
    });
  });
});

describe("endPlatformSwitchSession", () => {
  it("ends a platform access session", async () => {
    const repository = createRepository();

    await expect(
      endPlatformSwitchSession(repository, {
        sessionId: "session-1",
        staffUserId: "staff-1",
      }),
    ).resolves.toEqual({ ok: true, data: { ended: true } });

    expect(repository.endAccessSession).toHaveBeenCalledWith("session-1", "staff-1");
  });
});
