import { describe, expect, it, vi } from "vitest";
import type {
  CoachingAccessGrant,
  CoachingAccessRepository,
} from "./coaching-access";
import { mutateCoachingAccess } from "./coaching-access";

const actor = {
  email: "operator@argos.test",
  role: "operator" as const,
  userId: "staff-1",
};

function grant(
  overrides: Partial<CoachingAccessGrant> = {},
): CoachingAccessGrant {
  return {
    contractReference: "CRM-123",
    endsAt: new Date("2099-12-31T00:00:00.000Z"),
    id: "grant-1",
    monthlyVoiceMinutesPerSeat: 120,
    notes: null,
    orgId: "org-1",
    package: "team",
    seatLimit: 4,
    startsAt: new Date("2026-07-01T00:00:00.000Z"),
    status: "active",
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeRepository(
  overrides: Partial<CoachingAccessRepository> = {},
): CoachingAccessRepository {
  return {
    findActiveStripeSubscriptionForOrg: vi.fn().mockResolvedValue(null),
    findLatestCoachingAccessGrant: vi.fn().mockResolvedValue(null),
    findOrganizationBySlug: vi.fn().mockResolvedValue({
      id: "org-1",
      name: "Acme",
      slug: "acme",
    }),
    mutateCoachingAccessWithAudit: vi.fn().mockResolvedValue(grant()),
    ...overrides,
  };
}

describe("mutateCoachingAccess", () => {
  it("saves a contract-backed Team grant with audited normalized fields", async () => {
    const mutateCoachingAccessWithAudit = vi.fn().mockResolvedValue(grant());
    const repository = makeRepository({ mutateCoachingAccessWithAudit });

    const result = await mutateCoachingAccess(repository, actor, "acme", {
      action: "save",
      contractReference: " CRM-123 ",
      endsAt: "2027-07-01",
      notes: " Founder coaching ",
      package: "team",
      reason: " Contract signed ",
      seatLimit: 4,
      startsAt: "2026-07-01",
    });

    expect(result.ok).toBe(true);
    expect(mutateCoachingAccessWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "save",
        contractReference: "CRM-123",
        endsAt: new Date("2027-07-01"),
        notes: "Founder coaching",
        package: "team",
        reason: "Contract signed",
        seatLimit: 4,
        startsAt: new Date("2026-07-01"),
      }),
    );
  });

  it("rejects invalid Solo seat counts", async () => {
    const repository = makeRepository();

    await expect(
      mutateCoachingAccess(repository, actor, "acme", {
        action: "save",
        contractReference: "CRM-123",
        endsAt: "2027-07-01",
        package: "solo",
        reason: "Contract signed",
        seatLimit: 2,
        startsAt: "2026-07-01",
      }),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error:
        "Valid package, seat count, contract dates, and contract reference are required",
    });
  });

  it("prevents coaching and Stripe base access from overlapping", async () => {
    const repository = makeRepository({
      findActiveStripeSubscriptionForOrg: vi.fn().mockResolvedValue({
        id: "subscription-1",
      }),
    });

    const result = await mutateCoachingAccess(repository, actor, "acme", {
      action: "save",
      contractReference: "CRM-123",
      endsAt: "2027-07-01",
      package: "team",
      reason: "Contract signed",
      seatLimit: 4,
      startsAt: "2026-07-01",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "Cancel the active Stripe subscription before enabling coaching access",
    });
  });

  it("requires a new contract after access has expired", async () => {
    const repository = makeRepository({
      findLatestCoachingAccessGrant: vi.fn().mockResolvedValue(
        grant({
          endsAt: new Date("2020-01-01T00:00:00.000Z"),
          status: "expired",
        }),
      ),
    });

    const result = await mutateCoachingAccess(repository, actor, "acme", {
      action: "reactivate",
      reason: "Requested by founder",
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error:
        "Save a new active contract instead of reactivating expired or revoked access",
    });
  });
});
