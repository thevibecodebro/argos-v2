import { describe, expect, it, vi } from "vitest";
import {
  createEffectiveAccessRepository,
  createEffectiveCurrentUserRepository,
  createEffectiveDashboardRepository,
  toEffectiveDashboardUserRecord,
} from "./effective-platform";
import type { AccessRepository } from "@/lib/access/repository.types";
import type { CurrentUserProfile, DashboardRepository } from "./service";

const effectiveProfile: CurrentUserProfile = {
  email: "platform:staff-user",
  fullName: "Platform Staff",
  id: "staff-user",
  role: "admin",
  org: {
    id: "org-1",
    logoUrl: null,
    name: "Acme Health",
    plan: "trial",
    slug: "acme-health",
  },
};

describe("effective platform dashboard adapters", () => {
  it("preserves class prototype repository methods when wrapping the current user", async () => {
    class PrototypeRepository {
      async findCurrentUserByAuthId(_authUserId: string) {
        return null;
      }

      async findOrgUsersByOrgId(orgId: string) {
        return [{ id: "rep-1", orgId }];
      }
    }

    const repository = new PrototypeRepository();
    const effectiveRepository = createEffectiveCurrentUserRepository(
      repository,
      toEffectiveDashboardUserRecord(effectiveProfile),
      "staff-user",
    );

    await expect(effectiveRepository.findCurrentUserByAuthId("staff-user")).resolves.toMatchObject({
      id: "staff-user",
      org: {
        id: "org-1",
      },
    });
    await expect(effectiveRepository.findOrgUsersByOrgId("org-1")).resolves.toEqual([
      { id: "rep-1", orgId: "org-1" },
    ]);
    expect(effectiveRepository).toBeInstanceOf(PrototypeRepository);
  });

  it("wraps any tenant repository that resolves the current user by auth id", async () => {
    const repository = {
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
      listCalls: vi.fn().mockResolvedValue([]),
    };
    const effectiveRepository = createEffectiveCurrentUserRepository(
      repository,
      toEffectiveDashboardUserRecord(effectiveProfile),
      "staff-user",
    );

    await expect(effectiveRepository.findCurrentUserByAuthId("staff-user")).resolves.toMatchObject({
      email: "platform:staff-user",
      org: {
        id: "org-1",
        slug: "acme-health",
      },
    });
    await expect(effectiveRepository.listCalls()).resolves.toEqual([]);
    expect(repository.findCurrentUserByAuthId).not.toHaveBeenCalled();
  });

  it("returns the effective tenant profile instead of re-querying the raw platform staff user", async () => {
    const repository = {
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
    } as unknown as DashboardRepository;
    const effectiveRepository = createEffectiveDashboardRepository(
      repository,
      effectiveProfile,
      "staff-user",
    );

    await expect(effectiveRepository.findCurrentUserByAuthId("staff-user")).resolves.toMatchObject({
      id: "staff-user",
      role: "admin",
      org: {
        id: "org-1",
        slug: "acme-health",
      },
    });
    expect(repository.findCurrentUserByAuthId).not.toHaveBeenCalled();
  });

  it("delegates unrelated user lookups and exposes effective access actor for the session org", async () => {
    const repository = {
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({ id: "rep-1" }),
    } as unknown as DashboardRepository;
    const accessRepository = {
      findActorByAuthUserId: vi.fn().mockResolvedValue(null),
      findGrantsByUserId: vi.fn().mockResolvedValue([]),
      findMembershipsByOrgId: vi.fn().mockResolvedValue([]),
    } satisfies AccessRepository;

    const effectiveRepository = createEffectiveDashboardRepository(
      repository,
      effectiveProfile,
      "staff-user",
    );
    const effectiveAccessRepository = createEffectiveAccessRepository(
      accessRepository,
      effectiveProfile,
      "staff-user",
    );

    await expect(effectiveRepository.findCurrentUserByAuthId("rep-1")).resolves.toEqual({ id: "rep-1" });
    await expect(effectiveAccessRepository.findActorByAuthUserId("staff-user")).resolves.toEqual({
      id: "staff-user",
      orgId: "org-1",
      role: "admin",
    });

    expect(repository.findCurrentUserByAuthId).toHaveBeenCalledWith("rep-1");
    expect(accessRepository.findActorByAuthUserId).not.toHaveBeenCalled();
  });
});
