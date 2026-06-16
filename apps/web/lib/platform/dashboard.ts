export type PlatformDashboardRange = "7d" | "30d" | "90d";
export type PlatformDashboardActivityFilter = "all" | "active" | "inactive" | "at-risk";
export type PlatformDashboardCallStatusFilter = "all" | "complete" | "failed" | "processing";

export type PlatformDashboardFilters = {
  activity: PlatformDashboardActivityFilter;
  callStatus: PlatformDashboardCallStatusFilter;
  from: Date;
  plan: string;
  query: string;
  range: PlatformDashboardRange;
  to: Date;
};

export type PlatformDashboardOrganizationAggregate = {
  activeSubscriptionCount: number;
  averageScore: number | null;
  completedTrainingAssignments: number;
  createdAt: string;
  failedCalls: number;
  id: string;
  lastActivityAt: string | null;
  name: string;
  plan: string;
  processingCalls: number;
  reviewedCalls: number;
  seats: number;
  slug: string;
  totalCalls: number;
  totalTrainingAssignments: number;
};

export type PlatformDashboardOrganizationRow =
  PlatformDashboardOrganizationAggregate & {
    riskReasons: string[];
    riskScore: number;
    trainingCompletionRate: number | null;
  };

export type PlatformDashboardSummary = {
  activeOrganizations: number;
  activeSeats: number;
  atRiskOrganizations: number;
  callsReviewed: number;
  reviewCompletionRate: number;
  totalOrganizations: number;
};

export type PlatformDashboardAlert = {
  count: number;
  href: string;
  label: string;
  severity: "critical" | "warning" | "info";
};

export type PlatformDashboardSnapshot = {
  alerts: PlatformDashboardAlert[];
  filters: PlatformDashboardFilters;
  rows: PlatformDashboardOrganizationRow[];
  summary: PlatformDashboardSummary;
};

const ranges: Record<PlatformDashboardRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseRange(value: string | undefined): PlatformDashboardRange {
  return value === "7d" || value === "90d" ? value : "30d";
}

function parseActivity(value: string | undefined): PlatformDashboardActivityFilter {
  if (value === "active" || value === "inactive" || value === "at-risk") {
    return value;
  }

  return "all";
}

function parseCallStatus(value: string | undefined): PlatformDashboardCallStatusFilter {
  if (value === "complete" || value === "failed" || value === "processing") {
    return value;
  }

  return "all";
}

function subtractDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function isInactiveOrganization(
  row: Pick<PlatformDashboardOrganizationRow, "createdAt" | "lastActivityAt">,
  inactiveBefore: Date,
) {
  const organizationCreatedAt = new Date(row.createdAt);
  const lastActivityAt = row.lastActivityAt ? new Date(row.lastActivityAt) : null;

  return organizationCreatedAt < inactiveBefore && (!lastActivityAt || lastActivityAt < inactiveBefore);
}

function matchesActivityFilter(
  row: PlatformDashboardOrganizationRow,
  activity: PlatformDashboardActivityFilter,
  inactiveBefore: Date,
) {
  const lastActivityAt = row.lastActivityAt ? new Date(row.lastActivityAt) : null;
  const active = Boolean(lastActivityAt && lastActivityAt >= inactiveBefore);
  const inactive = isInactiveOrganization(row, inactiveBefore);

  if (activity === "active") return active;
  if (activity === "inactive") return inactive;
  if (activity === "at-risk") return row.riskReasons.length > 0;

  return true;
}

function matchesCallStatusFilter(
  row: PlatformDashboardOrganizationRow,
  callStatus: PlatformDashboardCallStatusFilter,
) {
  if (callStatus === "complete") return row.reviewedCalls > 0;
  if (callStatus === "failed") return row.failedCalls > 0;
  if (callStatus === "processing") return row.processingCalls > 0;

  return true;
}

function buildDashboardAlertHref(
  filters: PlatformDashboardFilters,
  overrides: Partial<Pick<PlatformDashboardFilters, "activity" | "callStatus">>,
) {
  const params = new URLSearchParams();
  const activity = overrides.activity ?? filters.activity;
  const callStatus = overrides.callStatus ?? filters.callStatus;

  if (filters.query) params.set("q", filters.query);
  if (filters.range !== "30d") params.set("range", filters.range);
  if (filters.plan !== "all") params.set("plan", filters.plan);
  if (activity !== "all") params.set("activity", activity);
  if (callStatus !== "all") params.set("callStatus", callStatus);

  const query = params.toString();

  return query ? `/platform/dashboard?${query}` : "/platform/dashboard";
}

export function parsePlatformDashboardFilters(
  params: Record<string, string | string[] | undefined>,
  now = new Date(),
): PlatformDashboardFilters {
  const range = parseRange(firstValue(params.range));

  return {
    activity: parseActivity(firstValue(params.activity)),
    callStatus: parseCallStatus(firstValue(params.callStatus)),
    from: subtractDays(now, ranges[range]),
    plan: firstValue(params.plan)?.trim() || "all",
    query: firstValue(params.q)?.trim() ?? "",
    range,
    to: now,
  };
}

export function buildPlatformDashboardSnapshot({
  filters,
  now,
  organizations,
}: {
  filters: PlatformDashboardFilters;
  now?: Date;
  organizations: PlatformDashboardOrganizationAggregate[];
}): PlatformDashboardSnapshot {
  const referenceDate = now ?? filters.to;
  const inactiveBefore = subtractDays(referenceDate, 14);
  const normalizedQuery = filters.query.toLowerCase();

  const scoredRows = organizations
    .filter((organization) => filters.plan === "all" || organization.plan === filters.plan)
    .filter(
      (organization) =>
        !normalizedQuery ||
        organization.name.toLowerCase().includes(normalizedQuery) ||
        organization.slug.toLowerCase().includes(normalizedQuery),
    )
    .map((organization) => {
      const trainingCompletionRate =
        organization.totalTrainingAssignments > 0
          ? Math.round(
              (organization.completedTrainingAssignments /
                organization.totalTrainingAssignments) *
                100,
            )
          : null;
      const riskReasons: string[] = [];
      let riskScore = 0;
      const lastActivityAt = organization.lastActivityAt
        ? new Date(organization.lastActivityAt)
        : null;
      const organizationCreatedAt = new Date(organization.createdAt);
      const isOldEnoughForInactivity = organizationCreatedAt < inactiveBefore;

      if (
        isOldEnoughForInactivity &&
        (!lastActivityAt || lastActivityAt < inactiveBefore)
      ) {
        riskReasons.push("No activity in 14 days");
        riskScore += 2;
      }

      if (
        organization.totalCalls > 0 &&
        organization.failedCalls / organization.totalCalls > 0.1
      ) {
        riskReasons.push("Failed calls above 10%");
        riskScore += 1;
      }

      if (
        organization.reviewedCalls >= 5 &&
        organization.averageScore !== null &&
        organization.averageScore < 70
      ) {
        riskReasons.push("Avg score below 70");
        riskScore += 2;
      }

      if (
        organization.totalTrainingAssignments > 0 &&
        trainingCompletionRate !== null &&
        trainingCompletionRate < 50
      ) {
        riskReasons.push("Training completion below 50%");
        riskScore += 1;
      }

      return {
        ...organization,
        riskReasons,
        riskScore,
        trainingCompletionRate,
      };
    });

  const rows = scoredRows
    .filter((row) => matchesActivityFilter(row, filters.activity, inactiveBefore))
    .filter((row) => matchesCallStatusFilter(row, filters.callStatus))
    .sort((left, right) => {
      if (right.riskScore !== left.riskScore) {
        return right.riskScore - left.riskScore;
      }

      return left.name.localeCompare(right.name);
    });

  const totalCalls = rows.reduce((sum, row) => sum + row.totalCalls, 0);
  const callsReviewed = rows.reduce((sum, row) => sum + row.reviewedCalls, 0);
  const activeSince = inactiveBefore;
  const activityScopedRows = scoredRows.filter((row) =>
    matchesActivityFilter(row, filters.activity, inactiveBefore),
  );
  const callStatusScopedRows = scoredRows.filter((row) =>
    matchesCallStatusFilter(row, filters.callStatus),
  );
  const processingBacklog = activityScopedRows.filter((row) => row.processingCalls > 0).length;
  const failedCallRisk = activityScopedRows.filter(
    (row) => row.totalCalls > 0 && row.failedCalls / row.totalCalls > 0.1,
  ).length;
  const inactiveOrganizations = callStatusScopedRows.filter((row) =>
    isInactiveOrganization(row, activeSince),
  ).length;
  const alerts: PlatformDashboardAlert[] = [];

  if (processingBacklog > 0) {
    alerts.push({
      count: processingBacklog,
      href: buildDashboardAlertHref(filters, { callStatus: "processing" }),
      label: "Organizations with processing backlog",
      severity: "warning",
    });
  }

  if (failedCallRisk > 0) {
    alerts.push({
      count: failedCallRisk,
      href: buildDashboardAlertHref(filters, { callStatus: "failed" }),
      label: "Organizations with failed-call risk",
      severity: "warning",
    });
  }

  if (inactiveOrganizations > 0) {
    alerts.push({
      count: inactiveOrganizations,
      href: buildDashboardAlertHref(filters, { activity: "inactive" }),
      label: "Inactive organizations",
      severity: "info",
    });
  }

  return {
    alerts,
    filters,
    rows,
    summary: {
      activeOrganizations: rows.filter((row) => {
        if (!row.lastActivityAt) return false;
        return new Date(row.lastActivityAt) >= activeSince;
      }).length,
      activeSeats: rows.reduce((sum, row) => sum + row.seats, 0),
      atRiskOrganizations: rows.filter((row) => row.riskReasons.length > 0).length,
      callsReviewed,
      reviewCompletionRate: totalCalls > 0 ? Math.round((callsReviewed / totalCalls) * 100) : 0,
      totalOrganizations: rows.length,
    },
  };
}
