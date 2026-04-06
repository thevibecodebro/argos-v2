import { Suspense } from "react";
import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listCalls } from "@/lib/calls/service";
import { CallsFilters } from "./calls-filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CallsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const authUser = await getAuthenticatedSupabaseUser();
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
    <PageFrame
      actions={[{ href: "/upload", label: "Upload a call" }]}
      description="Search, filter, and sort calls. Click any row to open the full scorecard and transcript."
      title="Call Library"
    >
      <section className="space-y-4 rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        {canSeeRep && viewer ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/50 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Viewing as
              </p>
              <p className="mt-1 text-base font-semibold text-white">{viewer.fullName}</p>
              <p className="text-sm capitalize text-slate-400">{viewer.role}</p>
            </div>
            <p className="text-sm text-slate-500">
              {total} {total === 1 ? "call" : "calls"} in library
            </p>
          </div>
        ) : null}

        <Suspense
          fallback={
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1.6fr,0.8fr,0.8fr,0.8fr]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    className="h-[46px] animate-pulse rounded-[1.15rem] bg-slate-800/40"
                    key={i}
                  />
                ))}
              </div>
              <div className="h-9 animate-pulse rounded-full bg-slate-800/40 w-48" />
            </div>
          }
        >
          <CallsFilters initialSearch={filters.search ?? ""} />
        </Suspense>

        <div className="overflow-hidden rounded-[1.5rem] border border-slate-800/70 bg-slate-950/25">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800/70">
                <th
                  className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                  scope="col"
                >
                  Call
                </th>
                {canSeeRep ? (
                  <th
                    className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                    scope="col"
                  >
                    Rep
                  </th>
                ) : null}
                <th
                  className="hidden px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 md:table-cell"
                  scope="col"
                >
                  Duration
                </th>
                <th
                  className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                  scope="col"
                >
                  Score
                </th>
                <th
                  className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                  scope="col"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.length ? (
                calls.map((call) => {
                  const badge = statusBadge(call.status);
                  const duration = formatDuration(call.durationSeconds);
                  const repName =
                    call.repFirstName || call.repLastName
                      ? `${call.repFirstName ?? ""} ${call.repLastName ?? ""}`.trim()
                      : null;
                  const topic = call.callTopic ?? "Untitled call";

                  return (
                    <tr
                      className="group relative border-b border-slate-900/70 transition last:border-b-0 hover:bg-blue-600/5"
                      key={call.id}
                    >
                      <td className="px-5 py-4">
                        {/* Full-row link via absolute positioning — no other interactive content in the row */}
                        <a
                          aria-label={`View call: ${topic}`}
                          className="absolute inset-0"
                          href={`/calls/${call.id}`}
                        />
                        <p
                          className="truncate text-sm font-medium text-slate-100 group-hover:underline"
                          title={topic}
                        >
                          {topic}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTimestamp(call.createdAt)}
                        </p>
                      </td>
                      {canSeeRep ? (
                        <td className="px-5 py-4">
                          <span
                            className={`text-sm ${repName ? "text-slate-300" : "italic text-slate-600"}`}
                          >
                            {repName ?? "—"}
                          </span>
                        </td>
                      ) : null}
                      <td className="hidden px-5 py-4 text-right md:table-cell">
                        <span className="text-sm text-slate-500">{duration ?? "—"}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`text-base font-semibold ${scoreColor(call.overallScore)}`}
                        >
                          {call.overallScore ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    className="px-6 py-12 text-center"
                    colSpan={canSeeRep ? 5 : 4}
                  >
                    <p className="text-lg font-medium text-slate-200">No calls found</p>
                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      {hasActiveFilters ? (
                        <>
                          No calls match the current filters.{" "}
                          <Link className="text-blue-400 hover:underline" href="/calls">
                            Clear filters
                          </Link>{" "}
                          or{" "}
                          <Link className="text-blue-400 hover:underline" href="/upload">
                            upload a call
                          </Link>
                          .
                        </>
                      ) : (
                        <>
                          No calls yet.{" "}
                          <Link className="text-blue-400 hover:underline" href="/upload">
                            Upload a call
                          </Link>{" "}
                          to populate the library.
                        </>
                      )}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {total > 0
              ? `Showing ${calls.length} of ${total} ${total === 1 ? "call" : "calls"}`
              : "No calls"}
          </p>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <Link
                aria-disabled={page === 0}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  page === 0
                    ? "pointer-events-none border-slate-800/70 bg-slate-950/20 text-slate-600"
                    : "border-slate-700/70 bg-slate-950/30 text-slate-300 hover:border-slate-600 hover:text-white"
                }`}
                href={buildCallsHref(filters, {
                  offset: Math.max(0, (page - 1) * (filters.limit ?? 20)),
                })}
                tabIndex={page === 0 ? -1 : undefined}
              >
                Previous
              </Link>
              <span className="px-2 text-sm text-slate-500">
                {page + 1} / {totalPages}
              </span>
              <Link
                aria-disabled={page + 1 >= totalPages}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  page + 1 >= totalPages
                    ? "pointer-events-none border-slate-800/70 bg-slate-950/20 text-slate-600"
                    : "border-slate-700/70 bg-slate-950/30 text-slate-300 hover:border-slate-600 hover:text-white"
                }`}
                href={buildCallsHref(filters, {
                  offset: (page + 1) * (filters.limit ?? 20),
                })}
                tabIndex={page + 1 >= totalPages ? -1 : undefined}
              >
                Next
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </PageFrame>
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
  if (typeof value !== "number") return "text-slate-400";
  if (value >= 85) return "text-emerald-400";
  if (value >= 70) return "text-blue-300";
  if (value >= 60) return "text-amber-400";
  return "text-red-400";
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "complete") {
    return {
      label: "Complete",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }
  if (["processing", "transcribing", "evaluating"].includes(normalized)) {
    return {
      label: "Processing",
      className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
  }
  if (normalized === "failed") {
    return {
      label: "Failed",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    };
  }
  return {
    label: status,
    className: "bg-slate-800/60 text-slate-400 border-slate-700/50",
  };
}
