export type PlatformOrganizationDetailOrganization = {
  archivedAt?: string | null;
  createdAt: string;
  id: string;
  name: string;
  plan: string;
  slug: string;
  status?: "active" | "archived";
};

export type PlatformOrganizationDetailMember = {
  email: string | null;
  id: string;
  role: string | null;
};

export type PlatformOrganizationDetailInvite = {
  acceptedAt: string | null;
  createdAt: string;
  email: string;
  expiresAt: string;
  id: string;
  role: string;
};

export type PlatformOrganizationDetailAccessSession = {
  endedAt: string | null;
  expiresAt: string;
  id: string;
  reason: string;
  staffEmailSnapshot: string;
  startedAt: string;
  status: string;
};

export type PlatformOrganizationDetailBillingSubscription = {
  seatCount: number;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export type PlatformOrganizationDetailCallStats = {
  averageScore: number | null;
  failedCalls: number;
  lastCallAt: string | null;
  processingCalls: number;
  reviewedCalls: number;
  totalCalls: number;
};

export type PlatformOrganizationDetailRoleplayStats = {
  lastRoleplayAt: string | null;
  roleplaySessions: number;
};

export type PlatformOrganizationDetailTrainingStats = {
  completedTrainingAssignments: number;
  totalTrainingAssignments: number;
};

export type PlatformOrganizationDetailAuditEvent = {
  action: string;
  createdAt: string;
  id: string;
  reason: string;
  resourceType: string;
  staffEmailSnapshot: string | null;
};

export type PlatformOrganizationDetailAlert = {
  label: string;
  severity: "critical" | "info" | "warning";
};

export type PlatformOrganizationDetailSnapshot = {
  access: {
    activeSessionCount: number;
    recentSessions: PlatformOrganizationDetailAccessSession[];
  };
  adminInviteResend: {
    email: string;
    expiresAt: string;
  } | null;
  alerts: PlatformOrganizationDetailAlert[];
  auditEvents: PlatformOrganizationDetailAuditEvent[];
  billing: {
    activeSubscriptionCount: number;
    seats: number;
    subscriptions: PlatformOrganizationDetailBillingSubscription[];
  };
  callStats: PlatformOrganizationDetailCallStats;
  invites: PlatformOrganizationDetailInvite[];
  members: PlatformOrganizationDetailMember[];
  organization: PlatformOrganizationDetailOrganization;
  roleplayStats: PlatformOrganizationDetailRoleplayStats;
  summary: {
    admins: number;
    members: number;
    pendingInvites: number;
    trainingCompletionRate: number | null;
  };
  trainingStats: PlatformOrganizationDetailTrainingStats;
};

export type BuildPlatformOrganizationDetailSnapshotInput = {
  accessSessions: PlatformOrganizationDetailAccessSession[];
  auditEvents: PlatformOrganizationDetailAuditEvent[];
  billingSubscriptions: PlatformOrganizationDetailBillingSubscription[];
  callStats: PlatformOrganizationDetailCallStats;
  invites: PlatformOrganizationDetailInvite[];
  members: PlatformOrganizationDetailMember[];
  now?: Date;
  organization: PlatformOrganizationDetailOrganization;
  roleplayStats: PlatformOrganizationDetailRoleplayStats;
  trainingStats: PlatformOrganizationDetailTrainingStats;
};

function isAfterNow(value: string, now: Date) {
  return new Date(value) > now;
}

function isActiveAccessSession(
  session: PlatformOrganizationDetailAccessSession,
  now: Date,
) {
  return session.status === "active" && session.endedAt === null && isAfterNow(session.expiresAt, now);
}

function normalizeAccessSessionStatus(
  session: PlatformOrganizationDetailAccessSession,
  now: Date,
) {
  if (session.status === "active") {
    if (session.endedAt) {
      return "ended";
    }

    if (!isAfterNow(session.expiresAt, now)) {
      return "expired";
    }
  }

  return session.status;
}

function isActiveBillingSubscription(
  subscription: PlatformOrganizationDetailBillingSubscription,
) {
  return subscription.status === "active" || subscription.status === "trialing";
}

export function buildPlatformOrganizationDetailSnapshot({
  accessSessions,
  auditEvents,
  billingSubscriptions,
  callStats,
  invites,
  members,
  now = new Date(),
  organization,
  roleplayStats,
  trainingStats,
}: BuildPlatformOrganizationDetailSnapshotInput): PlatformOrganizationDetailSnapshot {
  const activeSessions = accessSessions.filter((session) =>
    isActiveAccessSession(session, now),
  );
  const pendingInvites = invites.filter(
    (invite) => invite.acceptedAt === null && isAfterNow(invite.expiresAt, now),
  );
  const adminCount = members.filter((member) => member.role === "admin").length;
  const pendingAdminInvite = pendingInvites.find((invite) => invite.role === "admin") ?? null;
  const trainingCompletionRate =
    trainingStats.totalTrainingAssignments > 0
      ? Math.round(
          (trainingStats.completedTrainingAssignments /
            trainingStats.totalTrainingAssignments) *
            100,
        )
      : null;
  const activeBillingSubscriptions = billingSubscriptions.filter(
    isActiveBillingSubscription,
  );
  const alerts: PlatformOrganizationDetailAlert[] = [];

  if (adminCount === 0) {
    alerts.push({ label: "No active admin", severity: "critical" });
  }

  if (callStats.processingCalls > 0) {
    alerts.push({ label: "Processing backlog", severity: "warning" });
  }

  if (callStats.totalCalls > 0 && callStats.failedCalls / callStats.totalCalls > 0.1) {
    alerts.push({ label: "Failed calls above 10%", severity: "warning" });
  }

  if (
    callStats.reviewedCalls >= 5 &&
    callStats.averageScore !== null &&
    callStats.averageScore < 70
  ) {
    alerts.push({ label: "Avg score below 70", severity: "warning" });
  }

  if (
    trainingCompletionRate !== null &&
    trainingStats.totalTrainingAssignments > 0 &&
    trainingCompletionRate < 50
  ) {
    alerts.push({ label: "Training completion below 50%", severity: "info" });
  }

  return {
    access: {
      activeSessionCount: activeSessions.length,
      recentSessions: accessSessions.map((session) => ({
        ...session,
        status: normalizeAccessSessionStatus(session, now),
      })),
    },
    adminInviteResend:
      adminCount === 0 && pendingAdminInvite
        ? {
            email: pendingAdminInvite.email,
            expiresAt: pendingAdminInvite.expiresAt,
          }
        : null,
    alerts,
    auditEvents,
    billing: {
      activeSubscriptionCount: activeBillingSubscriptions.length,
      seats: activeBillingSubscriptions.reduce(
        (sum, subscription) => sum + subscription.seatCount,
        0,
      ),
      subscriptions: billingSubscriptions,
    },
    callStats,
    invites: pendingInvites,
    members,
    organization,
    roleplayStats,
    summary: {
      admins: adminCount,
      members: members.length,
      pendingInvites: pendingInvites.length,
      trainingCompletionRate,
    },
    trainingStats,
  };
}
