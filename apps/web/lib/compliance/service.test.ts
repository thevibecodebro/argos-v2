import { describe, expect, it, vi } from "vitest";
import {
  activateRecordingConsent,
  getComplianceStatus,
  type ComplianceRepository,
} from "./service";

function createRepository(
  overrides: Partial<ComplianceRepository> = {},
): ComplianceRepository {
  return {
    createConsentRecord: vi.fn(),
    findCurrentUserByAuthId: vi.fn(),
    findLatestConsentByOrgId: vi.fn(),
    ...overrides,
  };
}

const managerUser = {
  id: "user-1",
  email: "manager@argos.ai",
  role: "manager" as const,
  firstName: "Morgan",
  lastName: "Lane",
  org: {
    id: "org-1",
    name: "Argos",
    slug: "argos",
    plan: "trial",
  },
};

describe("getComplianceStatus", () => {
  it("returns false when the org has not consented yet", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(managerUser),
      findLatestConsentByOrgId: vi.fn().mockResolvedValue(null),
    });

    const result = await getComplianceStatus(repository, "user-1");

    expect(result).toEqual({
      ok: true,
      data: {
        hasConsented: false,
        consentedAt: null,
      },
    });
  });

  it("returns the latest consent timestamp when acknowledged", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(managerUser),
      findLatestConsentByOrgId: vi.fn().mockResolvedValue({
        acknowledgedAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await getComplianceStatus(repository, "user-1");

    expect(result).toEqual({
      ok: true,
      data: {
        hasConsented: true,
        consentedAt: "2026-04-03T00:00:00.000Z",
      },
    });
  });
});

describe("activateRecordingConsent", () => {
  it("rejects reps from activating recording consent", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...managerUser,
        role: "rep",
      }),
    });

    const result = await activateRecordingConsent(repository, "user-1", {
      eventType: "recording_consent_acknowledged",
      tosVersion: "2026-04-03",
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Only organization admins can activate call recording consent",
    });
  });

  it("records consent for managers and executives", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(managerUser),
      createConsentRecord: vi.fn().mockResolvedValue({
        acknowledgedAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
    });

    const result = await activateRecordingConsent(repository, "user-1", {
      eventType: "recording_consent_acknowledged",
      tosVersion: "2026-04-03",
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
      metadata: { source: "settings" },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        success: true,
        consentedAt: "2026-04-03T00:00:00.000Z",
      },
    });
    expect(repository.createConsentRecord).toHaveBeenCalledWith({
      acknowledgedBy: "user-1",
      eventType: "recording_consent_acknowledged",
      ipAddress: "127.0.0.1",
      metadata: { source: "settings" },
      orgId: "org-1",
      tosVersion: "2026-04-03",
      userAgent: "Vitest",
    });
  });
});
