import { describe, expect, it, vi } from "vitest";
import {
  getCallLibrary,
  getLeaderboard,
  getTeamDirectory,
  type ProductRepository,
} from "./service";

function createRepository(
  overrides: Partial<ProductRepository> = {},
): ProductRepository {
  return {
    findCurrentUserByAuthId: vi.fn(),
    findCallsByOrgId: vi.fn(),
    findCallsByRepId: vi.fn(),
    findUsersByOrgId: vi.fn(),
    ...overrides,
  };
}

const currentUser = {
  id: "user-1",
  email: "manager@argos.ai",
  role: "manager" as const,
  firstName: "Morgan",
  lastName: "Vale",
  org: {
    id: "org-1",
    name: "Argos Demo Org",
    slug: "argos-demo-org",
    plan: "trial",
  },
};

const callFixtures = [
  {
    id: "call-3",
    repId: "user-2",
    repName: "Avery Stone",
    callTopic: "ACME renewal",
    createdAt: new Date("2026-03-26T12:00:00.000Z"),
    overallScore: 88,
    status: "complete",
  },
  {
    id: "call-2",
    repId: "user-1",
    repName: "Morgan Vale",
    callTopic: "Northstar discovery",
    createdAt: new Date("2026-03-20T12:00:00.000Z"),
    overallScore: 72,
    status: "complete",
  },
  {
    id: "call-1",
    repId: "user-2",
    repName: "Avery Stone",
    callTopic: "Globex objection handling",
    createdAt: new Date("2026-03-10T12:00:00.000Z"),
    overallScore: 91,
    status: "complete",
  },
];

describe("getCallLibrary", () => {
  it("returns org calls for managers", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(currentUser),
      findCallsByOrgId: vi.fn().mockResolvedValue(callFixtures),
      findCallsByRepId: vi.fn(),
    });

    const result = await getCallLibrary(repository, "auth-user-id");

    expect(repository.findCallsByOrgId).toHaveBeenCalledWith("org-1", 25);
    expect(repository.findCallsByRepId).not.toHaveBeenCalled();
    expect(result.calls).toHaveLength(3);
    expect(result.calls[0]?.repName).toBe("Avery Stone");
  });

  it("returns only the rep's own calls for reps", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...currentUser,
        id: "user-2",
        role: "rep",
      }),
      findCallsByRepId: vi.fn().mockResolvedValue(callFixtures.filter((call) => call.repId === "user-2")),
      findCallsByOrgId: vi.fn(),
    });

    const result = await getCallLibrary(repository, "auth-user-id");

    expect(repository.findCallsByRepId).toHaveBeenCalledWith("user-2", 25);
    expect(repository.findCallsByOrgId).not.toHaveBeenCalled();
    expect(result.calls.every((call) => call.repId === "user-2")).toBe(true);
  });
});

describe("team views", () => {
  it("builds a sorted leaderboard and team directory from org users and calls", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(currentUser),
      findUsersByOrgId: vi.fn().mockResolvedValue([
        currentUser,
        {
          id: "user-2",
          email: "avery@argos.ai",
          role: "rep",
          firstName: "Avery",
          lastName: "Stone",
          org: currentUser.org,
        },
      ]),
      findCallsByOrgId: vi.fn().mockResolvedValue(callFixtures),
    });

    const [leaderboard, teamDirectory] = await Promise.all([
      getLeaderboard(repository, "auth-user-id"),
      getTeamDirectory(repository, "auth-user-id"),
    ]);

    expect(leaderboard[0]).toMatchObject({
      fullName: "Avery Stone",
      averageScore: 90,
      totalCalls: 2,
    });
    expect(teamDirectory[0]).toMatchObject({
      fullName: "Avery Stone",
      averageScore: 90,
      totalCalls: 2,
    });
    expect(teamDirectory[1]).toMatchObject({
      fullName: "Morgan Vale",
      averageScore: 72,
      totalCalls: 1,
    });
  });
});
