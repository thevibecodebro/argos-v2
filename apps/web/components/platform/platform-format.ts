export function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : "none";
}

export function formatPlan(value: string) {
  return value ? value.replace(/-/g, " ") : "unassigned";
}

export function formatPercent(value: number | null) {
  return value === null ? "n/a" : `${value}%`;
}

export function formatAccessSessionStatus(
  session: {
    endedAt?: string | null;
    expiresAt: string;
    status: string;
  },
  now = new Date(),
) {
  if (session.status === "active") {
    if (session.endedAt) {
      return "ended";
    }

    if (new Date(session.expiresAt) <= now) {
      return "expired";
    }
  }

  return session.status;
}
