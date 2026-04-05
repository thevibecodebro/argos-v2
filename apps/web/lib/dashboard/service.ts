import { createAccessRepository } from "@/lib/access/create-repository";
import {
  buildAccessContext,
  canActorDrillIntoLeaderboardRep,
  canActorUsePermissionForRep,
} from "@/lib/access/service";
import type { AccessRepository } from "@/lib/access/repository.types";
import type { AppUserRole } from "@/lib/users/roles";

export type DashboardUserRecord = {
  id: string;
  email: string;
  role: AppUserRole | null;
  firstName: string | null;
  lastName: string | null;
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  } | null;
};

export type DashboardOrgUserRecord = {
  id: string;
  email: string;
  role: AppUserRole | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

export type DashboardRecentCallRecord = {
  id: string;
  repId: string;
  callTopic: string | null;
  createdAt: Date;
  overallScore: number | null;
  status: string;
  durationSeconds: number | null;
  repFirstName: string | null;
  repLastName: string | null;
};

export type DashboardScoredCallRecord = {
  id: string;
  repId: string;
  callTopic: string | null;
  createdAt: Date;
  overallScore: number | null;
  durationSeconds: number | null;
  frameControlScore: number | null;
  rapportScore: number | null;
  discoveryScore: number | null;
  painExpansionScore: number | null;
  solutionScore: number | null;
  objectionScore: number | null;
  closingScore: number | null;
};

export type DashboardTrainingProgressRecord = {
  repId: string;
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

export type WeeklyPoint = {
  week: string;
  avgScore: number | null;
  callCount: number;
};

export type CategoryScore = {
  category: string;
  avgScore: number;
};

export type RepDashboard = {
  monthlyAvgScore: number | null;
  weeklyTrend: WeeklyPoint[];
  lowestCategories: CategoryScore[];
  recentCalls: Array<{
    id: string;
    status: string;
    overallScore: number | null;
    durationSeconds: number | null;
    callTopic: string | null;
    repId: string;
    createdAt: string;
    repFirstName: string | null;
    repLastName: string | null;
  }>;
};

export type RepCard = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  compositeScore: number | null;
  weekOverWeekDelta: number | null;
  needsCoaching: boolean;
  callCount: number;
};

export type ManagerDashboard = {
  reps: RepCard[];
  teamAvgScore: number | null;
  totalCallsThisMonth: number;
  coachingFlagsCount: number;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  value: number | null;
};

export type DashboardLeaderboard = {
  topQuality: LeaderboardEntry[];
  topVolume: LeaderboardEntry[];
  mostImproved: LeaderboardEntry[];
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedAt: string | null;
};

export type RepBadges = {
  badges: Badge[];
};

export type SkillAverage = {
  category: string;
  avgScore: number | null;
};

export type WeeklyCallVolume = {
  week: string;
  callCount: number;
};

export type TrainingStats = {
  totalAssigned: number;
  totalPassed: number;
  completionRate: number;
};

export type RepSkillBreakdown = {
  repId: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  compositeScore: number | null;
  callCount: number;
  skills: {
    frameControl: number | null;
    rapport: number | null;
    discovery: number | null;
    painExpansion: number | null;
    solution: number | null;
    objection: number | null;
    closing: number | null;
  };
};

export type ExecutiveDashboard = {
  skillAverages: SkillAverage[];
  weeklyCallVolume: WeeklyCallVolume[];
  trainingStats: TrainingStats;
  repSkillBreakdown: RepSkillBreakdown[];
};

export type SetupStatus = {
  orgSlug: string;
  repsCount: number;
  callsCount: number;
  roleplayCount: number;
};

export interface DashboardRepository {
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findRecentCallsByRepId(repId: string, limit: number): Promise<DashboardRecentCallRecord[]>;
  findScoredCallsByRepIdSince(repId: string, since: Date): Promise<DashboardScoredCallRecord[]>;
  findCompletedCallsByRepId(repId: string): Promise<DashboardScoredCallRecord[]>;
  findCompletedCallsByOrgId(orgId: string): Promise<DashboardScoredCallRecord[]>;
  findOrgUsersByOrgId(orgId: string): Promise<DashboardOrgUserRecord[]>;
  findTrainingProgressByOrgId(orgId: string): Promise<DashboardTrainingProgressRecord[]>;
  findPassedTrainingByRepId(repId: string): Promise<Date[]>;
  findCompletedRoleplaysByRepId(repId: string): Promise<Date[]>;
  findCallCountByOrgIdSince(orgId: string, since: Date): Promise<number>;
  findCompletedRoleplayCountByOrgId(orgId: string): Promise<number>;
}

export class DashboardServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 403 | 404,
  ) {
    super(message);
    this.name = "DashboardServiceError";
  }
}

const MANAGER_ROLES: AppUserRole[] = ["admin", "manager", "executive"];
const SKILL_CATEGORIES = [
  { key: "frameControlScore", label: "Frame Control" },
  { key: "rapportScore", label: "Rapport" },
  { key: "discoveryScore", label: "Discovery" },
  { key: "painExpansionScore", label: "Pain Expansion" },
  { key: "solutionScore", label: "Solution" },
  { key: "objectionScore", label: "Objection Handling" },
  { key: "closingScore", label: "Closing" },
] as const;

function isManagerRole(role: AppUserRole | null | undefined): boolean {
  return MANAGER_ROLES.includes((role ?? null) as AppUserRole);
}

function buildFullName(record: Pick<DashboardUserRecord, "email" | "firstName" | "lastName">): string {
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

function averageScore(values: Array<number | null | undefined>, round = true): number | null {
  const scores = values.filter((value): value is number => typeof value === "number");

  if (!scores.length) {
    return null;
  }

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return round ? Math.round(average) : average;
}

function buildWeeklyKeys(since: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const weekStart = new Date(since.getTime() + index * 7 * 24 * 60 * 60 * 1000);
    return weekStart.toISOString().slice(0, 10);
  });
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function serializeRecentCall(call: DashboardRecentCallRecord) {
  return {
    id: call.id,
    status: call.status,
    overallScore: call.overallScore,
    durationSeconds: call.durationSeconds,
    callTopic: call.callTopic,
    repId: call.repId,
    createdAt: call.createdAt.toISOString(),
    repFirstName: call.repFirstName,
    repLastName: call.repLastName,
  };
}

async function resolveAccessContext(
  accessRepository: AccessRepository,
  authUserId: string,
) {
  const actor = await accessRepository.findActorByAuthUserId(authUserId);

  if (!actor?.orgId) {
    return null;
  }

  const [memberships, grants] = await Promise.all([
    accessRepository.findMembershipsByOrgId(actor.orgId),
    accessRepository.findGrantsByUserId(actor.id, actor.orgId),
  ]);

  return buildAccessContext({ actor, memberships, grants });
}

function assertManager(user: DashboardUserRecord) {
  if (!isManagerRole(user.role)) {
    throw new DashboardServiceError("Manager or admin role required", 403);
  }
}

function buildLeaderboardEntries(
  users: DashboardOrgUserRecord[],
  getValue: (userId: string) => number | null,
): LeaderboardEntry[] {
  return users
    .map((user) => ({
      user,
      value: getValue(user.id),
    }))
    .filter((entry) => entry.value !== null)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))
    .slice(0, 3)
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.user.id,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      profileImageUrl: entry.user.profileImageUrl,
      value: entry.value,
    }));
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

  return {
    user: serializeProfile(userRecord),
    metrics: {
      rolling30DayAverageScore: averageScore(scoredCalls.map((call) => call.overallScore)),
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

export async function getRepDashboard(
  repository: DashboardRepository,
  authUserId: string,
  requestedRepId?: string,
  now = new Date(),
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<RepDashboard | null> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return null;
  }

  if (!user.org) {
    return {
      monthlyAvgScore: null,
      weeklyTrend: [],
      lowestCategories: [],
      recentCalls: [],
    };
  }

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return null;
  }

  if (requestedRepId && requestedRepId !== user.id && !canActorDrillIntoLeaderboardRep(access, requestedRepId)) {
    throw new DashboardServiceError("Only authorized team managers can view this rep", 403);
  }

  const targetRepId = requestedRepId ?? user.id;
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

  const [recentCalls, trendCalls] = await Promise.all([
    repository.findRecentCallsByRepId(targetRepId, 5),
    repository.findScoredCallsByRepIdSince(targetRepId, twelveWeeksAgo),
  ]);

  const monthlyAvgScore = averageScore(
    trendCalls
      .filter((call) => call.createdAt >= thirtyDaysAgo)
      .map((call) => call.overallScore),
  );

  const weeklyBuckets = new Map(
    buildWeeklyKeys(twelveWeeksAgo, 12).map((week) => [week, { scores: [] as number[], callCount: 0 }]),
  );
  const weekKeys = buildWeeklyKeys(twelveWeeksAgo, 12);

  for (const call of trendCalls) {
    const weekIndex = Math.floor(
      (call.createdAt.getTime() - twelveWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

    if (weekIndex < 0 || weekIndex >= 12) {
      continue;
    }

    const weekKey = weekKeys[weekIndex];
    const bucket = weeklyBuckets.get(weekKey);

    if (!bucket) {
      continue;
    }

    if (typeof call.overallScore === "number") {
      bucket.scores.push(call.overallScore);
    }

    bucket.callCount += 1;
  }

  const weeklyTrend = Array.from(weeklyBuckets.entries()).map(([week, bucket]) => ({
    week,
    avgScore: averageScore(bucket.scores, false),
    callCount: bucket.callCount,
  }));

  const lowestCategories = SKILL_CATEGORIES
    .map(({ key, label }) => ({
      category: label as string,
      avgScore: averageScore(trendCalls.map((call) => call[key]), false),
    }))
    .filter((category): category is { category: string; avgScore: number } => typeof category.avgScore === "number")
    .sort((left, right) => left.avgScore - right.avgScore)
    .slice(0, 3)
    .map((category) => ({
      category: category.category,
      avgScore: Math.round(category.avgScore),
    }));

  return {
    monthlyAvgScore,
    weeklyTrend,
    lowestCategories,
    recentCalls: recentCalls.map(serializeRecentCall),
  };
}

export async function getManagerDashboard(
  repository: DashboardRepository,
  authUserId: string,
  now = new Date(),
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<ManagerDashboard | null> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return null;
  }

  assertManager(user);

  if (!user.org) {
    return { reps: [], teamAvgScore: null, totalCallsThisMonth: 0, coachingFlagsCount: 0 };
  }

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return null;
  }

  const monthStart = startOfMonth(now);
  const thisWeekStart = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
  thisWeekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [users, allCompletedCalls] = await Promise.all([
    repository.findOrgUsersByOrgId(user.org.id),
    repository.findCompletedCallsByOrgId(user.org.id),
  ]);

  const reps = users.filter(
    (member) => member.role === "rep" && canActorUsePermissionForRep(access, "view_team_calls", member.id),
  );
  const scopedCalls = allCompletedCalls.filter((call) =>
    canActorUsePermissionForRep(access, "view_team_calls", call.repId),
  );

  const repCards = reps
    .map((rep) => {
      const repCalls = scopedCalls.filter((call) => call.repId === rep.id);
      const compositeScore = averageScore(repCalls.map((call) => call.overallScore));
      const thisWeekAvg = averageScore(
        repCalls
          .filter((call) => call.createdAt >= thisWeekStart)
          .map((call) => call.overallScore),
        false,
      );
      const lastWeekAvg = averageScore(
        repCalls
          .filter((call) => call.createdAt >= lastWeekStart && call.createdAt < thisWeekStart)
          .map((call) => call.overallScore),
        false,
      );
      const weekOverWeekDelta =
        thisWeekAvg !== null && lastWeekAvg !== null ? Math.round(thisWeekAvg - lastWeekAvg) : null;

      return {
        id: rep.id,
        firstName: rep.firstName,
        lastName: rep.lastName,
        profileImageUrl: rep.profileImageUrl,
        compositeScore,
        weekOverWeekDelta,
        needsCoaching: weekOverWeekDelta !== null && weekOverWeekDelta <= -10,
        callCount: repCalls.length,
      };
    })
    .sort((left, right) => (right.compositeScore ?? -1) - (left.compositeScore ?? -1));

  const monthScopedCalls = scopedCalls.filter((call) => call.createdAt >= monthStart);
  const teamAvgScore = averageScore(monthScopedCalls.map((call) => call.overallScore));

  return {
    reps: repCards,
    teamAvgScore,
    totalCallsThisMonth: monthScopedCalls.length,
    coachingFlagsCount: repCards.filter((rep) => rep.needsCoaching).length,
  };
}

export async function getDashboardLeaderboard(
  repository: DashboardRepository,
  authUserId: string,
  now = new Date(),
): Promise<DashboardLeaderboard | null> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return null;
  }

  if (!user.org) {
    return {
      topQuality: [],
      topVolume: [],
      mostImproved: [],
    };
  }

  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [users, completedCalls] = await Promise.all([
    repository.findOrgUsersByOrgId(user.org.id),
    repository.findCompletedCallsByOrgId(user.org.id),
  ]);

  const reps = users.filter((member) => member.role === "rep");
  const monthCalls = completedCalls.filter((call) => call.createdAt >= monthStart);
  const lastMonthCalls = completedCalls.filter(
    (call) => call.createdAt >= lastMonthStart && call.createdAt < monthStart,
  );

  const qualityByRep = new Map<string, number[]>();
  const volumeByRep = new Map<string, number>();
  const lastMonthByRep = new Map<string, number[]>();

  for (const call of monthCalls) {
    if (typeof call.overallScore === "number") {
      const scores = qualityByRep.get(call.repId) ?? [];
      scores.push(call.overallScore);
      qualityByRep.set(call.repId, scores);
    }

    volumeByRep.set(call.repId, (volumeByRep.get(call.repId) ?? 0) + 1);
  }

  for (const call of lastMonthCalls) {
    if (typeof call.overallScore !== "number") {
      continue;
    }

    const scores = lastMonthByRep.get(call.repId) ?? [];
    scores.push(call.overallScore);
    lastMonthByRep.set(call.repId, scores);
  }

  return {
    topQuality: buildLeaderboardEntries(reps, (userId) => averageScore(qualityByRep.get(userId) ?? [])),
    topVolume: buildLeaderboardEntries(reps, (userId) => volumeByRep.get(userId) ?? null),
    mostImproved: buildLeaderboardEntries(reps, (userId) => {
      const thisMonthAverage = averageScore(qualityByRep.get(userId) ?? [], false);
      const priorMonthAverage = averageScore(lastMonthByRep.get(userId) ?? [], false);

      if (thisMonthAverage === null || priorMonthAverage === null) {
        return null;
      }

      return Math.round(thisMonthAverage - priorMonthAverage);
    }),
  };
}

export async function getRepBadges(
  repository: DashboardRepository,
  authUserId: string,
  requestedRepId?: string,
  accessRepository: AccessRepository = createAccessRepository(),
): Promise<RepBadges | null> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return null;
  }

  if (!user.org) {
    return { badges: [] };
  }

  const access = await resolveAccessContext(accessRepository, authUserId);

  if (!access) {
    return null;
  }

  if (requestedRepId && requestedRepId !== user.id && !canActorDrillIntoLeaderboardRep(access, requestedRepId)) {
    throw new DashboardServiceError("Only authorized team managers can view this rep", 403);
  }

  const targetRepId = requestedRepId ?? user.id;
  const [completedCalls, passedTraining, completedRoleplays] = await Promise.all([
    repository.findCompletedCallsByRepId(targetRepId),
    repository.findPassedTrainingByRepId(targetRepId),
    repository.findCompletedRoleplaysByRepId(targetRepId),
  ]);

  const orderedCalls = [...completedCalls].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  const orderedPassedTraining = [...passedTraining].sort((left, right) => left.getTime() - right.getTime());
  const orderedRoleplays = [...completedRoleplays].sort((left, right) => left.getTime() - right.getTime());

  const badges: Badge[] = [
    {
      id: "first_call",
      name: "First Call",
      description: "Get your first call scored by AI.",
      emoji: "🎯",
      earned: orderedCalls.length >= 1,
      earnedAt: orderedCalls[0]?.createdAt.toISOString() ?? null,
    },
    {
      id: "calls_10",
      name: "10 Calls",
      description: "Complete 10 scored calls.",
      emoji: "📞",
      earned: orderedCalls.length >= 10,
      earnedAt: orderedCalls[9]?.createdAt.toISOString() ?? null,
    },
    {
      id: "calls_50",
      name: "50 Calls",
      description: "Complete 50 scored calls.",
      emoji: "🏆",
      earned: orderedCalls.length >= 50,
      earnedAt: orderedCalls[49]?.createdAt.toISOString() ?? null,
    },
    {
      id: "elite_performer",
      name: "Elite Performer",
      description: "Maintain an average overall score of 85 or above.",
      emoji: "⭐",
      earned: (averageScore(orderedCalls.map((call) => call.overallScore), false) ?? -1) >= 85,
      earnedAt: null,
    },
    {
      id: "sharp_closer",
      name: "Sharp Closer",
      description: "Achieve an average closing score of 85 or above.",
      emoji: "🔒",
      earned: (averageScore(orderedCalls.map((call) => call.closingScore), false) ?? -1) >= 85,
      earnedAt: null,
    },
    {
      id: "discovery_pro",
      name: "Discovery Pro",
      description: "Achieve an average discovery score of 85 or above.",
      emoji: "🔍",
      earned: (averageScore(orderedCalls.map((call) => call.discoveryScore), false) ?? -1) >= 85,
      earnedAt: null,
    },
    {
      id: "rapport_builder",
      name: "Rapport Builder",
      description: "Achieve an average rapport score of 85 or above.",
      emoji: "🤝",
      earned: (averageScore(orderedCalls.map((call) => call.rapportScore), false) ?? -1) >= 85,
      earnedAt: null,
    },
    {
      id: "certified",
      name: "Certified",
      description: "Pass your first training module.",
      emoji: "📚",
      earned: orderedPassedTraining.length >= 1,
      earnedAt: orderedPassedTraining[0]?.toISOString() ?? null,
    },
    {
      id: "roleplay_5x",
      name: "Roleplay Pro",
      description: "Complete 5 AI roleplay sessions.",
      emoji: "🎭",
      earned: orderedRoleplays.length >= 5,
      earnedAt: orderedRoleplays[4]?.toISOString() ?? null,
    },
  ];

  return { badges };
}

export async function getExecutiveDashboard(
  repository: DashboardRepository,
  authUserId: string,
  now = new Date(),
): Promise<ExecutiveDashboard | null> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return null;
  }

  assertManager(user);

  if (!user.org) {
    return {
      skillAverages: [],
      weeklyCallVolume: [],
      trainingStats: { totalAssigned: 0, totalPassed: 0, completionRate: 0 },
      repSkillBreakdown: [],
    };
  }

  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  const [completedCalls, users, trainingProgress] = await Promise.all([
    repository.findCompletedCallsByOrgId(user.org.id),
    repository.findOrgUsersByOrgId(user.org.id),
    repository.findTrainingProgressByOrgId(user.org.id),
  ]);

  const reps = users.filter((member) => member.role === "rep");
  const recentCalls = completedCalls.filter((call) => call.createdAt >= twelveWeeksAgo);
  const weekKeys = buildWeeklyKeys(twelveWeeksAgo, 12);
  const weeklyBuckets = new Map(weekKeys.map((week) => [week, 0]));

  for (const call of recentCalls) {
    const weekIndex = Math.floor(
      (call.createdAt.getTime() - twelveWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

    if (weekIndex < 0 || weekIndex >= 12) {
      continue;
    }

    const weekKey = weekKeys[weekIndex];
    weeklyBuckets.set(weekKey, (weeklyBuckets.get(weekKey) ?? 0) + 1);
  }

  return {
    skillAverages: SKILL_CATEGORIES.map(({ key, label }) => ({
      category: label,
      avgScore: averageScore(recentCalls.map((call) => call[key])),
    })),
    weeklyCallVolume: weekKeys.map((week) => ({
      week,
      callCount: weeklyBuckets.get(week) ?? 0,
    })),
    trainingStats: {
      totalAssigned: trainingProgress.length,
      totalPassed: trainingProgress.filter((progress) => progress.status === "passed").length,
      completionRate:
        trainingProgress.length > 0
          ? Math.round(
              (trainingProgress.filter((progress) => progress.status === "passed").length /
                trainingProgress.length) *
                100,
            )
          : 0,
    },
    repSkillBreakdown: reps
      .map((rep) => {
        const repCalls = completedCalls.filter((call) => call.repId === rep.id);

        return {
          repId: rep.id,
          firstName: rep.firstName,
          lastName: rep.lastName,
          profileImageUrl: rep.profileImageUrl,
          compositeScore: averageScore(repCalls.map((call) => call.overallScore)),
          callCount: repCalls.length,
          skills: {
            frameControl: averageScore(repCalls.map((call) => call.frameControlScore)),
            rapport: averageScore(repCalls.map((call) => call.rapportScore)),
            discovery: averageScore(repCalls.map((call) => call.discoveryScore)),
            painExpansion: averageScore(repCalls.map((call) => call.painExpansionScore)),
            solution: averageScore(repCalls.map((call) => call.solutionScore)),
            objection: averageScore(repCalls.map((call) => call.objectionScore)),
            closing: averageScore(repCalls.map((call) => call.closingScore)),
          },
        };
      })
      .sort((left, right) => (right.compositeScore ?? -1) - (left.compositeScore ?? -1)),
  };
}

export async function getSetupStatus(
  repository: DashboardRepository,
  authUserId: string,
  now = new Date(),
): Promise<SetupStatus | null> {
  const user = await repository.findCurrentUserByAuthId(authUserId);

  if (!user) {
    return null;
  }

  assertManager(user);

  if (!user.org) {
    throw new DashboardServiceError("No organization", 403);
  }

  const [orgUsers, callsCount, roleplayCount] = await Promise.all([
    repository.findOrgUsersByOrgId(user.org.id),
    repository.findCallCountByOrgIdSince(user.org.id, new Date(0)),
    repository.findCompletedRoleplayCountByOrgId(user.org.id),
  ]);

  return {
    orgSlug: user.org.slug,
    repsCount: orgUsers.filter((member) => member.role === "rep").length,
    callsCount,
    roleplayCount,
  };
}
