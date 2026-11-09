export function getCallsWorkspaceQuery(searchParams: Record<string, string | string[] | undefined>, scoringEnabled: boolean, total = 0) {
  const parsedFilters = parseFilters(searchParams);
  const filters = scoringEnabled ? parsedFilters : { ...parsedFilters, minScore: undefined, maxScore: undefined, sortBy: "createdAt" as const };
  const page = Math.floor((filters.offset ?? 0) / filters.limit);
  return {
    filters,
    page,
    totalPages: total > 0 ? Math.ceil(total / filters.limit) : 1,
    views: scoringEnabled ? buildQuickViews(filters) : buildRecordingQuickViews(filters),
    hasActiveFilters: Boolean(filters.search) || filters.minScore !== undefined || filters.maxScore !== undefined || filters.status !== "all" || `${filters.sortBy}:${filters.sortOrder}` !== "createdAt:desc",
    previousHref: buildCallsHref(filters, { offset: Math.max(0, (page - 1) * filters.limit) }),
    nextHref: buildCallsHref(filters, { offset: (page + 1) * filters.limit }),
  };
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const sortValue = firstValue(searchParams.sort) ?? "createdAt:desc";
  const [sortBy, sortOrder] = sortValue.split(":");

  return {
    limit: 20,
    offset: toNumber(firstValue(searchParams.offset)) ?? 0,
    search: firstValue(searchParams.search)?.trim() || undefined,
    status: firstValue(searchParams.status) ?? "all",
    minScore: toNumber(firstValue(searchParams.minScore)),
    maxScore: toNumber(firstValue(searchParams.maxScore)),
    sortBy: sortBy === "overallScore" ? "overallScore" : "createdAt",
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  } as const;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildCallsHref(
  filters: ReturnType<typeof parseFilters>,
  patch: Partial<ReturnType<typeof parseFilters>>,
) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();

  if (next.search) params.set("search", next.search);
  if (next.status && next.status !== "all") params.set("status", next.status);
  if (next.minScore !== undefined)
    params.set("minScore", String(next.minScore));
  if (next.maxScore !== undefined)
    params.set("maxScore", String(next.maxScore));
  if (next.sortBy !== "createdAt" || next.sortOrder !== "desc") {
    params.set("sort", `${next.sortBy}:${next.sortOrder}`);
  }
  if ((next.offset ?? 0) > 0) params.set("offset", String(next.offset));

  const query = params.toString();
  return query ? `/calls?${query}` : "/calls";
}

function buildQuickViews(filters: ReturnType<typeof parseFilters>) {
  return [
    {
      active:
        filters.status === "all" &&
        filters.minScore === undefined &&
        filters.maxScore === undefined,
      href: buildCallsHref(filters, {
        maxScore: undefined,
        minScore: undefined,
        status: "all",
      }),
      label: "All calls",
    },
    {
      active: filters.status === "complete" && filters.maxScore === 79,
      href: buildCallsHref(filters, {
        maxScore: 79,
        minScore: undefined,
        status: "complete",
      }),
      label: "Needs review",
    },
    {
      active: filters.maxScore === 69,
      href: buildCallsHref(filters, {
        maxScore: 69,
        minScore: undefined,
        status: "all",
      }),
      label: "Low score",
    },
    {
      active: filters.minScore === 85,
      href: buildCallsHref(filters, {
        maxScore: undefined,
        minScore: 85,
        status: "all",
      }),
      label: "High score",
    },
    {
      active: filters.status === "processing",
      href: buildCallsHref(filters, {
        maxScore: undefined,
        minScore: undefined,
        status: "processing",
      }),
      label: "Processing",
    },
  ];
}

function buildRecordingQuickViews(filters: ReturnType<typeof parseFilters>) {
  return [
    { active: filters.status === "all", href: buildCallsHref(filters, { status: "all" }), label: "All recordings" },
    { active: filters.status === "processing", href: buildCallsHref(filters, { status: "processing" }), label: "Processing" },
    { active: filters.status === "complete", href: buildCallsHref(filters, { status: "complete" }), label: "Ready" },
    { active: filters.status === "failed", href: buildCallsHref(filters, { status: "failed" }), label: "Needs attention" },
  ];
}
