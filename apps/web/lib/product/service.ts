import type { DashboardUserRecord } from "@/lib/dashboard/service";

export type ProductCallRecord = {
  id: string;
  repId: string;
  repName: string;
  callTopic: string | null;
  createdAt: Date;
  overallScore: number | null;
  status: string;
};

export type TeamMemberSummary = {
  id: string;
  email: string;
  role: DashboardUserRecord["role"];
  fullName: string;
  averageScore: number | null;
  totalCalls: number;
};

export type ProductRepository = {
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findCallsByOrgId(orgId: string, limit: number): Promise<ProductCallRecord[]>;
  findCallsByRepId(repId: string, limit: number): Promise<ProductCallRecord[]>;
  findUsersByOrgId(orgId: string): Promise<DashboardUserRecord[]>;
};

export async function getCallLibrary(
  repository: ProductRepository,
  authUserId: string,
) {
  const currentUser = await repository.findCurrentUserByAuthId(authUserId);

  if (!currentUser) {
    return { calls: [], user: null };
  }

  const limit = 25;
  const calls =
    currentUser.role === "rep" || !currentUser.org
      ? await repository.findCallsByRepId(currentUser.id, limit)
      : await repository.findCallsByOrgId(currentUser.org.id, limit);

  return {
    calls: calls.map(serializeCall),
    user: serializeUser(currentUser),
  };
}

export async function getLeaderboard(
  repository: ProductRepository,
  authUserId: string,
) {
  const currentUser = await repository.findCurrentUserByAuthId(authUserId);

  if (!currentUser?.org) {
    return [];
  }

  const [users, calls] = await Promise.all([
    repository.findUsersByOrgId(currentUser.org.id),
    repository.findCallsByOrgId(currentUser.org.id, 100),
  ]);

  return buildTeamSummaries(users, calls);
}

export async function getTeamDirectory(
  repository: ProductRepository,
  authUserId: string,
) {
  const currentUser = await repository.findCurrentUserByAuthId(authUserId);

  if (!currentUser?.org) {
    return [];
  }

  const [users, calls] = await Promise.all([
    repository.findUsersByOrgId(currentUser.org.id),
    repository.findCallsByOrgId(currentUser.org.id, 100),
  ]);

  return buildTeamSummaries(users, calls);
}

function buildTeamSummaries(
  users: DashboardUserRecord[],
  calls: ProductCallRecord[],
): TeamMemberSummary[] {
  const scoresByRep = new Map<string, number[]>();

  for (const call of calls) {
    if (call.overallScore === null) {
      continue;
    }

    const currentScores = scoresByRep.get(call.repId) ?? [];
    currentScores.push(call.overallScore);
    scoresByRep.set(call.repId, currentScores);
  }

  return users
    .map((user) => {
      const scores = scoresByRep.get(user.id) ?? [];
      const averageScore = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null;
      const totalCalls = calls.filter((call) => call.repId === user.id).length;

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: buildFullName(user),
        averageScore,
        totalCalls,
      };
    })
    .sort((left, right) => {
      const leftScore = left.averageScore ?? -1;
      const rightScore = right.averageScore ?? -1;

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return left.fullName.localeCompare(right.fullName);
    });
}

function serializeCall(call: ProductCallRecord) {
  return {
    id: call.id,
    repId: call.repId,
    repName: call.repName,
    callTopic: call.callTopic,
    createdAt: call.createdAt.toISOString(),
    overallScore: call.overallScore,
    status: call.status,
  };
}

function serializeUser(user: DashboardUserRecord) {
  return {
    id: user.id,
    email: user.email,
    fullName: buildFullName(user),
    org: user.org,
    role: user.role,
  };
}

function buildFullName(user: DashboardUserRecord) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}
