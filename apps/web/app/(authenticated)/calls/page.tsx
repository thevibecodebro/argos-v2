import { Suspense } from "react";
import Link from "next/link";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listCalls } from "@/lib/calls/service";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeIcon,
  ForgeManagementTable,
  ForgeMobileTableCards,
  ForgeSkeleton,
  ForgeSurface,
} from "@/components/forge";
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

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-5" data-calls-surface="forge-ledger">
        <ForgeSurface className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="font-[var(--font-display)] text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-gold)]">
                Call intake
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ForgeChip icon="query_stats" tone="gold">
                  {total.toLocaleString()} {total === 1 ? "interaction" : "interactions"}
                </ForgeChip>
                {hasActiveFilters ? (
                  <ForgeChip icon="filter_list" tone="ember">
                    Filters applied
                  </ForgeChip>
                ) : null}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--forge-muted)]">
                Review scored calls, processing status, rep ownership, and coaching readiness.
              </p>
            </div>

            <ForgeButton href="/upload" icon="attach_file" variant="primary">
              Upload a call
            </ForgeButton>
          </div>
        </ForgeSurface>

        <section className="space-y-5">
          <Suspense
            fallback={
              <ForgeSkeleton className="py-4" lines={2} />
            }
          >
            <CallsFilters initialSearch={filters.search ?? ""} />
          </Suspense>

          <ForgeManagementTable
            mobileCards={
              <ForgeMobileTableCards>
                {calls.length ? (
                  calls.map((call) => {
                    const badge = statusBadge(call.status);
                    const icon = rowIcon(call.status);
                    const duration = formatDuration(call.durationSeconds);
                    const repName =
                      call.repFirstName || call.repLastName
                        ? `${call.repFirstName ?? ""} ${call.repLastName ?? ""}`.trim()
                        : null;
                    const topic = call.callTopic ?? "Untitled call";

                    return (
                      <Link
                        className="block rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] p-4 transition hover:border-[rgba(241,191,123,0.3)] hover:bg-[rgba(241,191,123,0.055)]"
                        href={`/calls/${call.id}`}
                        key={call.id}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            aria-hidden="true"
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border ${icon.className}`}
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
                                  <p className="font-[var(--font-display)] font-bold uppercase tracking-[0.14em] text-[var(--forge-muted)]">
                                    Rep
                                  </p>
                                  <p className="mt-1 truncate font-semibold text-[var(--forge-text)]">
                                    {repName ?? "Unassigned"}
                                  </p>
                                </div>
                              ) : null}
                              <div>
                                <p className="font-[var(--font-display)] font-bold uppercase tracking-[0.14em] text-[var(--forge-muted)]">
                                  Score
                                </p>
                                <p className={`mt-1 font-bold ${scoreColor(call.overallScore)}`}>
                                  {call.overallScore ?? "--"}
                                </p>
                              </div>
                              <div>
                                <p className="font-[var(--font-display)] font-bold uppercase tracking-[0.14em] text-[var(--forge-muted)]">
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
              </ForgeMobileTableCards>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--forge-border)] bg-[rgba(255,244,230,0.025)]">
                    <th
                      className="px-5 py-4 text-left font-[var(--font-display)] text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]"
                      scope="col"
                    >
                      Call
                    </th>
                    {canSeeRep ? (
                      <th
                        className="px-5 py-4 text-left font-[var(--font-display)] text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]"
                        scope="col"
                      >
                        Rep
                      </th>
                    ) : null}
                    <th
                      className="px-5 py-4 text-left font-[var(--font-display)] text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]"
                      scope="col"
                    >
                      Duration
                    </th>
                    <th
                      className="px-5 py-4 text-left font-[var(--font-display)] text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]"
                      scope="col"
                    >
                      Score
                    </th>
                    <th
                      className="px-5 py-4 text-left font-[var(--font-display)] text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]"
                      scope="col"
                    >
                      Status
                    </th>
                    <th className="w-14 px-5 py-4" scope="col" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border)]">
                  {calls.length ? (
                    calls.map((call) => {
                      const badge = statusBadge(call.status);
                      const icon = rowIcon(call.status);
                      const duration = formatDuration(call.durationSeconds);
                      const repName =
                        call.repFirstName || call.repLastName
                          ? `${call.repFirstName ?? ""} ${call.repLastName ?? ""}`.trim()
                          : null;
                      const topic = call.callTopic ?? "Untitled call";
                      const scoreValue = normalizedScore(call.overallScore);

                      return (
                        <tr
                          className="group relative transition hover:bg-[rgba(255,244,230,0.035)]"
                          key={call.id}
                        >
                          <td className="px-5 py-4">
                            <a
                              aria-label={`View call: ${topic}`}
                              className="absolute inset-0"
                              href={`/calls/${call.id}`}
                            />
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border ${icon.className}`}
                                aria-hidden="true"
                              >
                                <ForgeIcon name={icon.icon} size={18} />
                              </div>
                              <div className="min-w-0">
                                <p
                                  className="truncate text-sm font-semibold text-[var(--forge-text)] transition group-hover:text-[var(--forge-gold)]"
                                  title={topic}
                                >
                                  {topic}
                                </p>
                                <p className="mt-1 text-xs text-[var(--forge-muted)]">
                                  {formatTimestamp(call.createdAt)}
                                </p>
                              </div>
                            </div>
                          </td>
                          {canSeeRep ? (
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-xs font-bold text-[var(--forge-cyan)]">
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
                          <td className="px-5 py-4">
                            <span className="text-sm font-medium text-[var(--forge-muted)]">
                              {duration ?? "--:--"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-[rgba(255,244,230,0.08)]">
                                <div
                                  className={`h-full rounded-full ${scoreBarClass(call.overallScore)}`}
                                  style={{ width: `${scoreValue}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${scoreColor(call.overallScore)}`}>
                                {call.overallScore ?? "--"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <ForgeChip tone={badge.tone}>{badge.label}</ForgeChip>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="inline-flex rounded-xl border border-transparent p-2 text-[var(--forge-muted)] transition group-hover:border-[var(--forge-border)] group-hover:bg-[rgba(241,191,123,0.08)] group-hover:text-[var(--forge-gold)]">
                              <ForgeIcon name={badge.label === "Failed" ? "history" : "arrow_forward"} size={18} />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-5 py-10" colSpan={canSeeRep ? 6 : 5}>
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
          </ForgeManagementTable>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--forge-muted)]">
              {total > 0
                ? `Showing ${(filters.offset ?? 0) + 1} - ${(filters.offset ?? 0) + calls.length} of ${total.toLocaleString()} ${total === 1 ? "interaction" : "interactions"}`
                : "No interactions"}
            </p>

            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Link
                  aria-disabled={page === 0}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
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
                <span className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-[rgba(241,191,123,0.28)] bg-[rgba(241,191,123,0.11)] px-3 text-sm font-bold text-[var(--forge-gold)]">
                  {page + 1}
                </span>
                <span className="px-1 text-sm text-[var(--forge-muted)]">/</span>
                <span className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-3 text-sm font-semibold text-[var(--forge-muted)]">
                  {totalPages}
                </span>
                <Link
                  aria-disabled={page + 1 >= totalPages}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
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
        </section>
      </div>
    </div>
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

function scoreBarClass(value: number | null | undefined) {
  if (typeof value !== "number") return "bg-[rgba(255,244,230,0.2)]";
  if (value >= 85) return "bg-[var(--forge-cyan)] shadow-[0_0_14px_rgba(136,218,247,0.22)]";
  if (value >= 70) return "bg-[rgba(136,218,247,0.76)]";
  if (value >= 60) return "bg-[var(--forge-gold)]";
  return "bg-[var(--forge-danger)]";
}

function normalizedScore(value: number | null | undefined) {
  if (typeof value !== "number") return 20;
  return Math.max(8, Math.min(100, value));
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
