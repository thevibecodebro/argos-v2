import { describe, expect, it, vi, beforeEach } from "vitest";
import type { InvitesRepository, InviteRecord, TeamRecord } from "./repository";
import type { UsersRepository } from "@/lib/users/service";
import type { OnboardingRepository } from "@/lib/onboarding/service";
import {
  sendInvite,
  commitInviteAcceptance,
  listPendingInvites,
} from "./service";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{
  id: string;
  email: string;
  orgId: string | null;
  role: string | null;
  org: { id: string; name: string; slug: string; plan: string; createdAt: string } | null;
  displayNameSet: boolean;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}> = {}) {
  return {
    id: "user-1",
    email: "admin@acme.com",
    orgId: "org-1",
    role: "admin" as const,
    org: { id: "org-1", name: "Acme", slug: "acme", plan: "trial", createdAt: new Date().toISOString() },
    displayNameSet: true,
    firstName: "Admin",
    lastName: "User",
    profileImageUrl: null,
    ...overrides,
  };
}

function makeInvite(overrides: Partial<InviteRecord> = {}): InviteRecord {
  return {
    id: "invite-1",
    orgId: "org-1",
    email: "rep@acme.com",
    role: "rep",
    token: "test-token",
    teamIds: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeInvitesRepo(overrides: Partial<InvitesRepository> = {}): InvitesRepository {
  return {
    createInvite: vi.fn().mockResolvedValue(makeInvite()),
    findInviteByToken: vi.fn().mockResolvedValue(null),
    findPendingInviteByOrgAndEmail: vi.fn().mockResolvedValue(null),
    findPendingInvitesByOrg: vi.fn().mockResolvedValue([]),
    markInviteAccepted: vi.fn().mockResolvedValue(undefined),
    findTeamsByIds: vi.fn().mockResolvedValue([]),
    listActiveTeamsByOrg: vi.fn().mockResolvedValue([]),
    createTeamMemberships: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeUsersRepo(overrides: Partial<UsersRepository> = {}): UsersRepository {
  return {
    findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser()),
    findOrganizationMember: vi.fn().mockResolvedValue(null),
    findOrganizationMembers: vi.fn().mockResolvedValue([]),
    removeOrganizationMember: vi.fn().mockResolvedValue(true),
    updateCurrentUserProfile: vi.fn().mockResolvedValue(null),
    updateOrganizationMemberRole: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeOnboardingRepo(overrides: Partial<OnboardingRepository> = {}): OnboardingRepository {
  return {
    assignUserToOrganization: vi.fn().mockResolvedValue(undefined),
    createOrganization: vi.fn().mockResolvedValue(null),
    findCurrentUserByAuthId: vi.fn().mockResolvedValue(null),
    findOrganizationBySlug: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("./email", () => ({
  sendInviteEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

beforeEach(() => {
  mockSendEmail.mockClear();
});

// ── sendInvite ────────────────────────────────────────────────────────────────

describe("sendInvite", () => {
  it("creates invite record and sends email on happy path", async () => {
    const repo = makeInvitesRepo();
    const usersRepo = makeUsersRepo();
    const result = await sendInvite(repo, usersRepo, "user-1", {
      email: "rep@acme.com",
      role: "rep",
    });
    expect(result.ok).toBe(true);
    expect(repo.createInvite).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("returns 400 when caller has no orgId", async () => {
    const usersRepo = makeUsersRepo({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser({ orgId: null, org: null })),
    });
    const result = await sendInvite(makeInvitesRepo(), usersRepo, "user-1", {
      email: "rep@acme.com",
      role: "rep",
    });
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("returns 403 when caller is not admin", async () => {
    const usersRepo = makeUsersRepo({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser({ role: "manager" })),
    });
    const result = await sendInvite(makeInvitesRepo(), usersRepo, "user-1", {
      email: "rep@acme.com",
      role: "rep",
    });
    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });

  it("returns 400 when email format is invalid", async () => {
    const result = await sendInvite(makeInvitesRepo(), makeUsersRepo(), "user-1", {
      email: "not-an-email",
      role: "rep",
    });
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("returns 400 when role is invalid", async () => {
    const result = await sendInvite(makeInvitesRepo(), makeUsersRepo(), "user-1", {
      email: "rep@acme.com",
      role: "unknown-role" as any,
    });
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("persists teamIds as null for executive role even if teamIds supplied", async () => {
    const repo = makeInvitesRepo();
    await sendInvite(repo, makeUsersRepo(), "user-1", {
      email: "exec@acme.com",
      role: "executive",
      teamIds: ["team-1"],
    });
    expect(repo.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds: null }),
    );
  });

  it("persists teamIds as null for admin role even if teamIds supplied", async () => {
    const repo = makeInvitesRepo();
    await sendInvite(repo, makeUsersRepo(), "user-1", {
      email: "admin2@acme.com",
      role: "admin",
      teamIds: ["team-1"],
    });
    expect(repo.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds: null }),
    );
  });

  it("returns 409 when pending unexpired invite already exists", async () => {
    const repo = makeInvitesRepo({
      findPendingInviteByOrgAndEmail: vi.fn().mockResolvedValue(makeInvite()),
    });
    const result = await sendInvite(repo, makeUsersRepo(), "user-1", {
      email: "rep@acme.com",
      role: "rep",
    });
    expect(result).toEqual({ ok: false, status: 409, error: expect.any(String) });
  });

  it("returns 400 when teamIds contains unknown team", async () => {
    const repo = makeInvitesRepo({
      findTeamsByIds: vi.fn().mockResolvedValue([]), // returns 0 of 1 requested
    });
    const result = await sendInvite(repo, makeUsersRepo(), "user-1", {
      email: "rep@acme.com",
      role: "rep",
      teamIds: ["nonexistent-team"],
    });
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("throws when email send fails (invite row already persisted)", async () => {
    mockSendEmail.mockRejectedValueOnce(new Error("Resend error"));
    await expect(
      sendInvite(makeInvitesRepo(), makeUsersRepo(), "user-1", {
        email: "rep@acme.com",
        role: "rep",
      }),
    ).rejects.toThrow("Resend error");
  });
});

// ── commitInviteAcceptance ────────────────────────────────────────────────────

describe("commitInviteAcceptance", () => {
  function makeAcceptArgs(inviteOverrides: Partial<InviteRecord> = {}) {
    const caller = { id: "user-2", email: "rep@acme.com", orgId: null as string | null };
    const invite = makeInvite(inviteOverrides);
    return { caller, invite };
  }

  it("happy path for rep: assigns org, inserts rep team memberships, marks accepted", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "rep", teamIds: ["team-1"] });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    const result = await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(result.ok).toBe(true);
    expect(onboardingRepo.assignUserToOrganization).toHaveBeenCalledWith({
      orgId: invite.orgId,
      userId: caller.id,
      role: "rep",
    });
    expect(repo.createTeamMemberships).toHaveBeenCalledWith({
      orgId: invite.orgId,
      userId: caller.id,
      teamIds: ["team-1"],
      membershipType: "rep",
    });
    expect(repo.markInviteAccepted).toHaveBeenCalledWith(invite.id);
  });

  it("happy path for manager: assigns org with manager team memberships", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "manager", teamIds: ["team-2"] });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(repo.createTeamMemberships).toHaveBeenCalledWith(
      expect.objectContaining({ membershipType: "manager" }),
    );
  });

  it("happy path for executive: assigns org, no team memberships", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "executive", teamIds: null });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(repo.createTeamMemberships).not.toHaveBeenCalled();
  });

  it("happy path for admin: assigns org, no team memberships", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "admin", teamIds: null });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(repo.createTeamMemberships).not.toHaveBeenCalled();
  });

  it("no team memberships inserted when teamIds is empty", async () => {
    const { caller, invite } = makeAcceptArgs({ role: "rep", teamIds: [] });
    const repo = makeInvitesRepo();
    const onboardingRepo = makeOnboardingRepo();
    await commitInviteAcceptance(repo, onboardingRepo, caller, invite);
    expect(repo.createTeamMemberships).not.toHaveBeenCalled();
  });
});

// ── listPendingInvites ────────────────────────────────────────────────────────

describe("listPendingInvites", () => {
  it("returns pending invites for the caller's org", async () => {
    const pending = [makeInvite(), makeInvite({ id: "invite-2", email: "other@acme.com" })];
    const repo = makeInvitesRepo({
      findPendingInvitesByOrg: vi.fn().mockResolvedValue(pending),
    });
    const result = await listPendingInvites(repo, makeUsersRepo(), "user-1");
    expect(result).toEqual({ ok: true, data: pending });
  });

  it("returns 400 when caller has no orgId", async () => {
    const usersRepo = makeUsersRepo({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser({ orgId: null, org: null })),
    });
    const result = await listPendingInvites(makeInvitesRepo(), usersRepo, "user-1");
    expect(result).toEqual({ ok: false, status: 400, error: expect.any(String) });
  });

  it("returns 403 when caller is not admin", async () => {
    const usersRepo = makeUsersRepo({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(makeUser({ role: "rep" })),
    });
    const result = await listPendingInvites(makeInvitesRepo(), usersRepo, "user-1");
    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });
});
