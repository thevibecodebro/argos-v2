import { Suspense } from "react";
import Link from "next/link";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listCalls, type CallSummary } from "@/lib/calls/service";
import {
  ForgeChip,
  ForgeEmptyState,
  ForgeIcon,
  ForgeScoreMeter,
  ForgeSegmentedTab,
  ForgeSegmentedTabs,
  ForgeSkeleton,
} from "@/components/forge";
import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { CallsFilters } from "./calls-filters";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CallsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const filters = parseFilters(resolvedSearchParams);

  const result = authUser
    ? await listCalls(createCallsRepository(), authUser.id, filters)
    : null;

  const calls = result?.ok ? result.data.calls : [];
  const total = result?.ok ? result.data.total : 0;
  const viewer = result?.ok ? result.data.viewer : null;
  const canSeeRep =
    viewer?.role === "admin" ||
    viewer?.role === "manager" ||
    viewer?.role === "executive";
  const page = Math.floor((filters.offset ?? 0) / (filters.limit ?? 20));
  const totalPages = total > 0 ? Math.ceil(total / (filters.limit ?? 20)) : 1;
  const activeSort = `${filters.sortBy}:${filters.sortOrder}`;
  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.minScore !== undefined) ||
    Boolean(filters.maxScore !== undefined) ||
    filters.status !== "all" ||
    activeSort !== "createdAt:desc";
  const quickViews = buildQuickViews(filters);
  const callStats = buildCallStats(calls);
  const selectedCall = calls[0] ?? null;
  const selectedCallRepName = selectedCall ? repDisplayName(selectedCall) : null;

  return (
    <AuthenticatedPageContainer className="py-4 sm:py-5" size="wide">
      <OperationalWorkspace
        data-calls-layout="operational-list"
        data-calls-surface="forge-ledger"
      >
        <OperationalToolbar
          actions={[
            { href: "/upload", icon: "attach_file", label: "Upload call", variant: "primary" },
          ]}
          description="Review scored calls, processing status, rep ownership, and coaching readiness."
          status={
            hasActiveFilters
              ? { icon: "filter_list", label: "Filters applied", tone: "ember" }
              : { icon: "subject", label: `${total.toLocaleString()} records`, tone: "muted" }
          }
          title="Calls"
        >
          <div className="space-y-2">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <ForgeSegmentedTabs
                className="w-full justify-start overflow-x-auto xl:w-auto"
                label="Saved call views"
              >
                {quickViews.map((view) => (
                  <ForgeSegmentedTab
                    active={view.active}
                    href={view.href}
                    key={view.label}
                  >
                    {view.label}
                  </ForgeSegmentedTab>
                ))}
              </ForgeSegmentedTabs>
            </div>

            <Suspense
              fallback={
                <ForgeSkeleton className="rounded-xl py-4" lines={2} />
              }
            >
              <CallsFilters initialSearch={filters.search ?? ""} />
            </Suspense>
          </div>
        </OperationalToolbar>

        <OperationalMetricStrip
          metrics={[
            {
              icon: "subject",
              label: "Records",
              tone: "muted",
              value: total.toLocaleString(),
            },
            {
              icon: "monitoring",
              label: "Avg score",
              tone: callStats.averageScoreTone,
              value: callStats.averageScoreLabel,
            },
            {
              icon: "check_circle",
              label: "Complete",
              tone: "success",
              value: callStats.completeCount,
            },
            {
              icon: callStats.failureCount > 0 ? "warning" : "pending",
              label: "Needs attention",
              tone: callStats.failureCount > 0 ? "danger" : "cyan",
              value: callStats.attentionLabel,
            },
          ]}
        />

        <section
          className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
          data-operational-list-workspace="calls"
        >
          <div
            className="min-w-0"
            data-forge-management-table="true"
            data-operational-list-table="true"
          >
            <div className="md:hidden">
              <div className="grid gap-2" data-forge-mobile-table-cards="true">
                {calls.length ? (
                  calls.map((call) => {
                    const badge = statusBadge(call.status);
                    const icon = rowIcon(call.status);
                    const duration = formatDuration(call.durationSeconds);
                    const repName = repDisplayName(call);
                    const topic = call.callTopic ?? "Untitled call";

                    return (
                      <Link
                        className="block rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] p-4 transition hover:border-[rgba(241,191,123,0.3)] hover:bg-[rgba(241,191,123,0.055)]"
                        data-mobile-call-card="true"
                        href={`/calls/${call.id}`}
                        key={call.id}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            aria-hidden="true"
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${icon.className}`}
                          >
                            <ForgeIcon name={icon.icon} size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                                  {topic}
                                </p>
                                <p className="mt-1 text-xs text-[var(--forge-muted)]">
                                  {formatTimestamp(call.createdAt)}
                                </p>
                              </div>
                              <ForgeChip tone={badge.tone}>{badge.label}</ForgeChip>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                              {canSeeRep ? (
                                <div>
                                  <p className="font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                                    Rep
                                  </p>
                                  <p className="mt-1 truncate font-semibold text-[var(--forge-text)]">
                                    {repName ?? "Unassigned"}
                                  </p>
                                </div>
                              ) : null}
                              <div>
                                <p className="font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                                  Score
                                </p>
                                <p className={`mt-1 font-bold ${scoreColor(call.overallScore)}`}>
                                  {call.overallScore ?? "--"}
                                </p>
                              </div>
                              <div>
                                <p className="font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                                  Duration
                                </p>
                                <p className="mt-1 font-semibold text-[var(--forge-text)]">
                                  {duration ?? "--:--"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <ForgeEmptyState
                    action={
                      hasActiveFilters
                        ? { href: "/calls", label: "Clear filters" }
                        : { href: "/upload", label: "Upload a call" }
                    }
                    description={
                      hasActiveFilters
                        ? "No calls match the current filters. Clear the filters or upload a new recording when the next review is ready."
                        : "Upload a call recording to populate the library and start the scoring workflow."
                    }
                    icon={hasActiveFilters ? "filter_list" : "attach_file"}
                    title={hasActiveFilters ? "No matching calls" : "No calls yet"}
                  />
                )}
              </div>
            </div>

            <div
              className="hidden overflow-hidden rounded-xl border border-[var(--forge-border)] bg-[rgba(8,6,5,0.88)] shadow-[inset_0_1px_0_rgba(255,244,230,0.04)] md:block"
              data-forge-table="true"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--forge-border)] bg-[rgba(255,244,230,0.024)]">
                      <th
                        className="px-4 py-3 text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]"
                        scope="col"
                      >
                        Call
                      </th>
                      {canSeeRep ? (
                        <th
                          className="px-4 py-3 text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]"
                          scope="col"
                        >
                          Rep
                        </th>
                      ) : null}
                      <th
                        className="px-4 py-3 text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]"
                        scope="col"
                      >
                        Score
                      </th>
                      <th
                        className="px-4 py-3 text-left text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]"
                        scope="col"
                      >
                        Status
                      </th>
                      <th className="w-16 px-4 py-3" scope="col" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border)]">
                    {calls.length ? (
                      calls.map((call) => {
                        const badge = statusBadge(call.status);
                        const icon = rowIcon(call.status);
                        const duration = formatDuration(call.durationSeconds);
                        const repName = repDisplayName(call);
                        const topic = call.callTopic ?? "Untitled call";

                        return (
                          <tr
                            className="group transition hover:bg-[rgba(255,244,230,0.035)]"
                            key={call.id}
                          >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${icon.className}`}
                                aria-hidden="true"
                              >
                                <ForgeIcon name={icon.icon} size={18} />
                              </div>
                              <div className="min-w-0">
                                <Link
                                  className="truncate text-sm font-semibold text-[var(--forge-text)] transition group-hover:text-[var(--forge-gold)]"
                                  href={`/calls/${call.id}`}
                                  title={topic}
                                >
                                  {topic}
                                </Link>
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--forge-muted)]">
                                  <span>{formatTimestamp(call.createdAt)}</span>
                                  {duration ? (
                                    <>
                                      <span
                                        aria-hidden="true"
                                        className="h-1 w-1 rounded-full bg-[rgba(255,244,230,0.24)]"
                                      />
                                      <span>{duration}</span>
                                    </>
                                  ) : null}
                                </p>
                              </div>
                            </div>
                          </td>
                          {canSeeRep ? (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-xs font-bold text-[var(--forge-cyan)]">
                                  {initials(repName)}
                                </div>
                                <span
                                  className={`text-sm font-medium ${
                                    repName
                                      ? "text-[var(--forge-text)]"
                                      : "italic text-[rgba(255,244,230,0.4)]"
                                  }`}
                                >
                                  {repName ?? "Unassigned"}
                                </span>
                              </div>
                            </td>
                          ) : null}
                          <td className="px-4 py-3">
                            <ForgeScoreMeter
                              label={`${topic} score`}
                              showValue
                              value={call.overallScore}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ForgeChip tone={badge.tone}>{badge.label}</ForgeChip>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              aria-label={`Open ${topic}`}
                              className="inline-flex rounded-lg border border-transparent p-2 text-[var(--forge-muted)] transition hover:border-[var(--forge-border)] hover:bg-[rgba(241,191,123,0.08)] hover:text-[var(--forge-gold)]"
                              href={`/calls/${call.id}`}
                            >
                              <ForgeIcon name="arrow_forward" size={18} />
                            </Link>
                          </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-4 py-10" colSpan={canSeeRep ? 5 : 4}>
                          <ForgeEmptyState
                            action={
                              hasActiveFilters
                                ? { href: "/calls", label: "Clear filters" }
                                : { href: "/upload", label: "Upload a call" }
                            }
                            description={
                              hasActiveFilters
                                ? "No calls match the current filters. Clear the filters or upload a new recording when the next review is ready."
                                : "Upload a call recording to populate the library and start the scoring workflow."
                            }
                            icon={hasActiveFilters ? "filter_list" : "attach_file"}
                            title={hasActiveFilters ? "No matching calls" : "No calls yet"}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <OperationalPreviewDrawer
            actions={
              selectedCall
                ? [
                    {
                      href: `/calls/${selectedCall.id}`,
                      icon: "open_in_new",
                      label: "Open detail",
                      variant: "primary",
                    },
                    { href: "/upload", icon: "attach_file", label: "Upload another" },
                  ]
                : [{ href: "/upload", icon: "attach_file", label: "Upload call", variant: "primary" }]
            }
            description={
              selectedCall
                ? "A compact preview of the first row in this view."
                : "Upload a call to populate the library and preview details."
            }
            eyebrow="Preview"
            title={selectedCall ? selectedCall.callTopic ?? "Untitled call" : "No call selected"}
          >
            {selectedCall ? (
              <>
                <div className="rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] p-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                    Score
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`text-2xl font-semibold tabular-nums ${scoreColor(selectedCall.overallScore)}`}>
                      {selectedCall.overallScore ?? "--"}
                    </span>
                    <ForgeScoreMeter
                      className="flex-1"
                      label="Selected call score"
                      value={selectedCall.overallScore}
                    />
                  </div>
                </div>
                <dl className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] px-3 py-2">
                    <dt className="text-[var(--forge-muted)]">Rep</dt>
                    <dd className="truncate font-medium text-[var(--forge-text)]">
                      {selectedCallRepName ?? "Unassigned"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] px-3 py-2">
                    <dt className="text-[var(--forge-muted)]">Duration</dt>
                    <dd className="font-medium text-[var(--forge-text)]">
                      {formatDuration(selectedCall.durationSeconds) ?? "--:--"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] px-3 py-2">
                    <dt className="text-[var(--forge-muted)]">Status</dt>
                    <dd>
                      <ForgeChip tone={statusBadge(selectedCall.status).tone}>
                        {statusBadge(selectedCall.status).label}
                      </ForgeChip>
                    </dd>
                  </div>
                </dl>
                <div className="rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] p-3">
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                    Uploaded
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--forge-text)]">
                    {formatTimestamp(selectedCall.createdAt)}
                  </p>
                </div>
              </>
            ) : null}
          </OperationalPreviewDrawer>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.024)] px-3 py-2">
          <p className="text-sm font-medium text-[var(--forge-muted)]">
            {total > 0
              ? `Showing ${(filters.offset ?? 0) + 1} - ${(filters.offset ?? 0) + calls.length} of ${total.toLocaleString()} ${total === 1 ? "interaction" : "interactions"}`
              : "No interactions"}
          </p>

            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Link
                  aria-disabled={page === 0}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    page === 0
                      ? "pointer-events-none border-[var(--forge-border)] bg-[rgba(255,244,230,0.025)] text-[rgba(255,244,230,0.26)]"
                      : "border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-[var(--forge-muted)] hover:border-[rgba(241,191,123,0.3)] hover:text-[var(--forge-gold)]"
                  }`}
                  href={buildCallsHref(filters, {
                    offset: Math.max(0, (page - 1) * (filters.limit ?? 20)),
                  })}
                  tabIndex={page === 0 ? -1 : undefined}
                >
                  <ForgeIcon name="arrow_back" size={18} />
                </Link>
                <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-[rgba(241,191,123,0.28)] bg-[rgba(241,191,123,0.11)] px-3 text-sm font-bold text-[var(--forge-gold)]">
                  {page + 1}
                </span>
                <span className="px-1 text-sm text-[var(--forge-muted)]">/</span>
                <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 text-sm font-semibold text-[var(--forge-muted)]">
                  {totalPages}
                </span>
                <Link
                  aria-disabled={page + 1 >= totalPages}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    page + 1 >= totalPages
                      ? "pointer-events-none border-[var(--forge-border)] bg-[rgba(255,244,230,0.025)] text-[rgba(255,244,230,0.26)]"
                      : "border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-[var(--forge-muted)] hover:border-[rgba(241,191,123,0.3)] hover:text-[var(--forge-gold)]"
                  }`}
                  href={buildCallsHref(filters, {
                    offset: (page + 1) * (filters.limit ?? 20),
                  })}
                  tabIndex={page + 1 >= totalPages ? -1 : undefined}
                >
                  <ForgeIcon name="arrow_forward" size={18} />
                </Link>
              </div>
            ) : null}
          </div>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>) {
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
  if (next.minScore !== undefined) params.set("minScore", String(next.minScore));
  if (next.maxScore !== undefined) params.set("maxScore", String(next.maxScore));
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
      active: filters.status === "all" && filters.minScore === undefined && filters.maxScore === undefined,
      href: buildCallsHref(filters, { maxScore: undefined, minScore: undefined, status: "all" }),
      label: "All calls",
    },
    {
      active: filters.status === "complete" && filters.maxScore === 79,
      href: buildCallsHref(filters, { maxScore: 79, minScore: undefined, status: "complete" }),
      label: "Needs review",
    },
    {
      active: filters.maxScore === 69,
      href: buildCallsHref(filters, { maxScore: 69, minScore: undefined, status: "all" }),
      label: "Low score",
    },
    {
      active: filters.minScore === 85,
      href: buildCallsHref(filters, { maxScore: undefined, minScore: 85, status: "all" }),
      label: "High score",
    },
    {
      active: filters.status === "processing",
      href: buildCallsHref(filters, { maxScore: undefined, minScore: undefined, status: "processing" }),
      label: "Processing",
    },
  ];
}

function buildCallStats(calls: CallSummary[]) {
  const scoredCalls = calls.filter((call) => typeof call.overallScore === "number");
  const averageScore =
    scoredCalls.length > 0
      ? Math.round(
          scoredCalls.reduce((sum, call) => sum + (call.overallScore ?? 0), 0) /
            scoredCalls.length,
        )
      : null;
  const failureCount = calls.filter((call) => call.status.toLowerCase() === "failed").length;
  const processingCount = calls.filter((call) =>
    ["processing", "transcribing", "evaluating"].includes(call.status.toLowerCase()),
  ).length;

  return {
    attentionLabel: failureCount > 0 ? failureCount : processingCount,
    averageScoreLabel: averageScore === null ? "--" : averageScore,
    averageScoreTone: scoreTone(averageScore),
    completeCount: calls.filter((call) => call.status.toLowerCase() === "complete").length,
    failureCount,
  };
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreColor(value: number | null | undefined) {
  if (typeof value !== "number") return "text-[var(--forge-muted)]";
  if (value >= 85) return "text-[var(--forge-cyan)]";
  if (value >= 70) return "text-[rgba(136,218,247,0.82)]";
  if (value >= 60) return "text-[var(--forge-gold)]";
  return "text-[var(--forge-danger)]";
}

function scoreTone(value: number | null): "cyan" | "danger" | "gold" | "muted" | "success" {
  if (typeof value !== "number") return "muted";
  if (value >= 85) return "cyan";
  if (value >= 70) return "success";
  if (value >= 60) return "gold";
  return "danger";
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "complete") {
    return {
      label: "Complete",
      tone: "success" as const,
    };
  }
  if (["processing", "transcribing", "evaluating"].includes(normalized)) {
    return {
      label: "Processing",
      tone: "cyan" as const,
    };
  }
  if (normalized === "failed") {
    return {
      label: "Failed",
      tone: "danger" as const,
    };
  }
  return {
    label: status,
    tone: "muted" as const,
  };
}

function rowIcon(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "complete") {
    return {
      icon: "query_stats",
      className: "border-[rgba(136,218,247,0.22)] bg-[rgba(136,218,247,0.08)] text-[var(--forge-cyan)]",
    };
  }

  if (["processing", "transcribing", "evaluating"].includes(normalized)) {
    return {
      icon: "history",
      className: "border-[rgba(255,159,95,0.22)] bg-[rgba(255,159,95,0.08)] text-[var(--forge-ember)]",
    };
  }

  if (normalized === "failed") {
    return {
      icon: "warning",
      className: "border-[rgba(255,113,108,0.22)] bg-[rgba(255,113,108,0.08)] text-[var(--forge-danger)]",
    };
  }

  return {
    icon: "insights",
    className: "border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-[var(--forge-muted)]",
  };
}

function initials(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function repDisplayName(call: Pick<CallSummary, "repFirstName" | "repLastName">) {
  return call.repFirstName || call.repLastName
    ? `${call.repFirstName ?? ""} ${call.repLastName ?? ""}`.trim()
    : null;
}
