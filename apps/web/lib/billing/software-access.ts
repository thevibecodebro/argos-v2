export type SoftwareAccessSource = "coaching_contract" | "stripe_subscription";

export type SoftwareAccessEntitlement = {
  accessEndsAt: Date | null;
  accessStartsAt: Date | null;
  billingPlanId: string;
  package: "solo" | "team";
  seatCount: number;
  sourceId: string;
  sourceType: SoftwareAccessSource;
  voiceMinutesPerSeat: number;
};

export type CoachingVoicePeriod = {
  periodEnd: Date;
  periodStart: Date;
};

function daysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function anchoredUtcMonth(start: Date, monthOffset: number) {
  const targetMonth = start.getUTCMonth() + monthOffset;
  const targetYear = start.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const targetDay = Math.min(
    start.getUTCDate(),
    daysInUtcMonth(targetYear, normalizedMonth),
  );

  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      targetDay,
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
      start.getUTCMilliseconds(),
    ),
  );
}

export function getCoachingVoicePeriod(
  startsAt: Date,
  endsAt: Date,
  now = new Date(),
): CoachingVoicePeriod | null {
  if (now < startsAt || now >= endsAt) {
    return null;
  }

  let monthOffset =
    (now.getUTCFullYear() - startsAt.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    startsAt.getUTCMonth();
  let periodStart = anchoredUtcMonth(startsAt, monthOffset);

  if (periodStart > now) {
    monthOffset -= 1;
    periodStart = anchoredUtcMonth(startsAt, monthOffset);
  }

  const periodEnd = new Date(
    Math.min(anchoredUtcMonth(startsAt, monthOffset + 1).getTime(), endsAt.getTime()),
  );

  return { periodEnd, periodStart };
}

export function getCoachingVoiceGrantSourceId(
  entitlementId: string,
  periodStart: Date,
) {
  return `coaching:${entitlementId}:${periodStart.toISOString()}`;
}

export function normalizeStripePackage(planId: string): "solo" | "team" {
  return planId.startsWith("team") ? "team" : "solo";
}
