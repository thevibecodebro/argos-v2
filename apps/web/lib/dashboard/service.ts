export type DashboardUserRecord = {
  id: string;
  email: string;
  role: "rep" | "manager" | "executive" | "admin" | null;
  firstName: string | null;
  lastName: string | null;
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  } | null;
};

export type DashboardCallRecord = {
  id: string;
  callTopic: string | null;
  createdAt: Date;
  overallScore: number | null;
  status: string;
};

export type CurrentUserProfile = {
  id: string;
  email: string;
  role: DashboardUserRecord["role"];
  fullName: string;
  org: DashboardUserRecord["org"];
};

export type DashboardSummary = {
  user: CurrentUserProfile;
  metrics: {
    rolling30DayAverageScore: number | null;
    callsReviewed30Days: number;
  };
  recentCalls: Array<{
    id: string;
    callTopic: string | null;
    createdAt: string;
    overallScore: number | null;
    status: string;
  }>;
};

export interface DashboardRepository {
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findRecentCallsByRepId(repId: string, limit: number): Promise<DashboardCallRecord[]>;
  findScoredCallsByRepIdSince(repId: string, since: Date): Promise<DashboardCallRecord[]>;
}

function buildFullName(record: DashboardUserRecord): string {
  const fullName = [record.firstName, record.lastName].filter(Boolean).join(" ").trim();
  return fullName || record.email;
}

function serializeProfile(record: DashboardUserRecord): CurrentUserProfile {
  return {
    id: record.id,
    email: record.email,
    role: record.role,
    fullName: buildFullName(record),
    org: record.org,
  };
}

export async function getCurrentUserProfile(
  repository: DashboardRepository,
  authUserId: string,
): Promise<CurrentUserProfile | null> {
  const record = await repository.findCurrentUserByAuthId(authUserId);

  if (!record) {
    return null;
  }

  return serializeProfile(record);
}

export async function getDashboardSummary(
  repository: DashboardRepository,
  authUserId: string,
  now = new Date(),
): Promise<DashboardSummary | null> {
  const userRecord = await repository.findCurrentUserByAuthId(authUserId);

  if (!userRecord) {
    return null;
  }

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [recentCalls, scoredCalls] = await Promise.all([
    repository.findRecentCallsByRepId(userRecord.id, 5),
    repository.findScoredCallsByRepIdSince(userRecord.id, thirtyDaysAgo),
  ]);

  const totalScore = scoredCalls.reduce((sum, call) => sum + (call.overallScore ?? 0), 0);
  const rolling30DayAverageScore =
    scoredCalls.length > 0 ? Math.round(totalScore / scoredCalls.length) : null;

  return {
    user: serializeProfile(userRecord),
    metrics: {
      rolling30DayAverageScore,
      callsReviewed30Days: scoredCalls.length,
    },
    recentCalls: recentCalls.map((call) => ({
      id: call.id,
      callTopic: call.callTopic,
      createdAt: call.createdAt.toISOString(),
      overallScore: call.overallScore,
      status: call.status,
    })),
  };
}
