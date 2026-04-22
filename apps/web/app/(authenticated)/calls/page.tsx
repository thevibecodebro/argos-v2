import { Suspense } from "react";
import Link from "next/link";
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
    <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(116,177,255,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(109,221,255,0.08),transparent_30%),linear-gradient(180deg,rgba(15,19,26,0.98),rgba(10,13,19,0.95))] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.42)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_24%,transparent_72%,rgba(255,255,255,0.04))]" />

        <section className="relative mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
              {total.toLocaleString()} {total === 1 ? "interaction" : "interactions"}
            </span>
            {hasActiveFilters ? (
              <span className="rounded-full border border-[#74b1ff]/20 bg-[#74b1ff]/8 px-3 py-2 text-[#74b1ff]">
                Filters applied
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {canSeeRep && viewer ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-5 py-4 shadow-[0_12px_40px_rgba(3,8,20,0.22)] backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                  Viewing As
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{viewer.fullName}</p>
                <p className="text-sm capitalize text-slate-400">{viewer.role}</p>
              </div>
            ) : null}

            <Link
              className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] border border-[#74b1ff]/20 bg-white/[0.04] px-5 py-4 text-sm font-semibold text-[#74b1ff] shadow-[0_12px_40px_rgba(3,8,20,0.22)] backdrop-blur-md transition hover:border-[#74b1ff]/35 hover:bg-[#74b1ff]/10"
              href="/upload"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                upload_file
              </span>
              Upload a call
            </Link>
          </div>
        </section>

        <section className="relative space-y-6">
          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.75fr))_auto]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      className="h-[68px] animate-pulse rounded-[1.15rem] bg-white/[0.05]"
                      key={i}
                    />
                  ))}
                </div>
                <div className="h-10 w-72 animate-pulse rounded-full bg-white/[0.05]" />
              </div>
            }
          >
            <CallsFilters initialSearch={filters.search ?? ""} />
          </Suspense>

          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] shadow-[0_18px_60px_rgba(2,8,23,0.28)] backdrop-blur-md">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/8 bg-black/10">
                  <th
                    className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.28em] text-slate-500"
                    scope="col"
                  >
                    Call
                  </th>
                  {canSeeRep ? (
                    <th
                      className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.28em] text-slate-500"
                      scope="col"
                    >
                      Rep
                    </th>
                  ) : null}
                  <th
                    className="hidden px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 md:table-cell"
                    scope="col"
                  >
                    Duration
                  </th>
                  <th
                    className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.28em] text-slate-500"
                    scope="col"
                  >
                    Score
                  </th>
                  <th
                    className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.28em] text-slate-500"
                    scope="col"
                  >
                    Status
                  </th>
                  <th className="w-16 px-6 py-4" scope="col" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
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
                        className="group relative transition hover:bg-white/[0.03]"
                        key={call.id}
                      >
                        <td className="px-6 py-5">
                          <a
                            aria-label={`View call: ${topic}`}
                            className="absolute inset-0"
                            href={`/calls/${call.id}`}
                          />
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${icon.className}`}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "18px" }}
                              >
                                {icon.icon}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate text-sm font-semibold text-white group-hover:text-[#9ec7ff]"
                                title={topic}
                              >
                                {topic}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatTimestamp(call.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        {canSeeRep ? (
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-bold text-[#74b1ff]">
                                {initials(repName)}
                              </div>
                              <span
                                className={`text-sm font-medium ${
                                  repName ? "text-slate-200" : "italic text-slate-600"
                                }`}
                              >
                                {repName ?? "Unassigned"}
                              </span>
                            </div>
                          </td>
                        ) : null}
                        <td className="hidden px-6 py-5 md:table-cell">
                          <span className="text-sm font-medium text-slate-400">
                            {duration ?? "--:--"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-black/30">
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
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="inline-flex rounded-xl p-2 text-slate-500 transition group-hover:bg-[#74b1ff]/10 group-hover:text-[#74b1ff]">
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: "18px" }}
                            >
                              {badge.label === "Failed" ? "refresh" : "arrow_forward"}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-6 py-16 text-center" colSpan={canSeeRep ? 6 : 5}>
                      <div className="mx-auto max-w-xl space-y-3">
                        <p className="text-lg font-semibold text-slate-100">No calls found</p>
                        <p className="text-sm leading-7 text-slate-500">
                          {hasActiveFilters ? (
                            <>
                              No calls match the current filters.{" "}
                              <Link className="text-[#74b1ff] hover:underline" href="/calls">
                                Clear filters
                              </Link>{" "}
                              or{" "}
                              <Link className="text-[#74b1ff] hover:underline" href="/upload">
                                upload a call
                              </Link>
                              .
                            </>
                          ) : (
                            <>
                              No calls yet.{" "}
                              <Link className="text-[#74b1ff] hover:underline" href="/upload">
                                Upload a call
                              </Link>{" "}
                              to populate the library.
                            </>
                          )}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-500">
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
                      ? "pointer-events-none border-white/8 bg-white/[0.03] text-slate-700"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                  href={buildCallsHref(filters, {
                    offset: Math.max(0, (page - 1) * (filters.limit ?? 20)),
                  })}
                  tabIndex={page === 0 ? -1 : undefined}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    chevron_left
                  </span>
                </Link>
                <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#74b1ff] px-3 text-sm font-bold text-[#03111f]">
                  {page + 1}
                </span>
                <span className="px-1 text-sm text-slate-500">/</span>
                <span className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-slate-300">
                  {totalPages}
                </span>
                <Link
                  aria-disabled={page + 1 >= totalPages}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                    page + 1 >= totalPages
                      ? "pointer-events-none border-white/8 bg-white/[0.03] text-slate-700"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                  href={buildCallsHref(filters, {
                    offset: (page + 1) * (filters.limit ?? 20),
                  })}
                  tabIndex={page + 1 >= totalPages ? -1 : undefined}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    chevron_right
                  </span>
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
  if (typeof value !== "number") return "text-slate-400";
  if (value >= 85) return "text-[#74b1ff]";
  if (value >= 70) return "text-cyan-300";
  if (value >= 60) return "text-amber-400";
  return "text-red-400";
}

function scoreBarClass(value: number | null | undefined) {
  if (typeof value !== "number") return "bg-slate-700";
  if (value >= 85) return "bg-[#4da0ff] shadow-[0_0_14px_rgba(77,160,255,0.4)]";
  if (value >= 70) return "bg-cyan-400";
  if (value >= 60) return "bg-amber-400";
  return "bg-red-400";
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
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    };
  }
  if (["processing", "transcribing", "evaluating"].includes(normalized)) {
    return {
      label: "Processing",
      className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    };
  }
  if (normalized === "failed") {
    return {
      label: "Failed",
      className: "border-red-500/20 bg-red-500/10 text-red-400",
    };
  }
  return {
    label: status,
    className: "border-slate-700/50 bg-slate-800/60 text-slate-400",
  };
}

function rowIcon(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "complete") {
    return {
      icon: "call",
      className: "border-[#74b1ff]/15 bg-[#74b1ff]/10 text-[#74b1ff]",
    };
  }

  if (["processing", "transcribing", "evaluating"].includes(normalized)) {
    return {
      icon: "sync",
      className: "border-cyan-500/15 bg-cyan-500/10 text-cyan-300",
    };
  }

  if (normalized === "failed") {
    return {
      icon: "error",
      className: "border-red-500/15 bg-red-500/10 text-red-400",
    };
  }

  return {
    icon: "library_books",
    className: "border-white/10 bg-white/[0.05] text-slate-300",
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
