import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listCalls } from "@/lib/calls/service";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Complete", value: "complete" },
  { label: "Processing", value: "processing" },
  { label: "Failed", value: "failed" },
] as const;

const SORT_OPTIONS = [
  { label: "Newest first", value: "createdAt:desc" },
  { label: "Oldest first", value: "createdAt:asc" },
  { label: "Highest score", value: "overallScore:desc" },
  { label: "Lowest score", value: "overallScore:asc" },
] as const;

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
  const canSeeRep = viewer?.role === "admin" || viewer?.role === "manager" || viewer?.role === "executive";
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
      description="The call library supports live filters, sorting, and drill-down links instead of a flat static list."
      eyebrow="Library"
      title="Call Library"
    >
      <section className="space-y-4 rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Viewer</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {viewer?.fullName ?? "Unknown user"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {viewer?.role ?? "member"}{total ? ` · ${total} total calls` : " · 0 total calls"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/30 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Visible this page
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">{calls.length}</p>
          </div>
        </div>

        <form className="space-y-3" method="get">
          <div className="grid gap-3 md:grid-cols-[1.6fr,0.8fr,0.8fr,0.8fr]">
            <input
              className="rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
              defaultValue={filters.search ?? ""}
              name="search"
              placeholder="Search by topic..."
              type="text"
            />
            <select
              className="rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
              defaultValue={filters.minScore?.toString() ?? ""}
              name="minScore"
            >
              <option value="">Min score</option>
              {[50, 60, 70, 80, 90].map((value) => (
                <option key={value} value={value}>
                  {value}+
                </option>
              ))}
            </select>
            <select
              className="rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
              defaultValue={filters.maxScore?.toString() ?? ""}
              name="maxScore"
            >
              <option value="">Max score</option>
              {[60, 70, 80, 90, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              className="rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
              defaultValue={activeSort}
              name="sort"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Link
                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  filters.status === option.value
                    ? "border-blue-500/40 bg-blue-600/15 text-blue-300"
                    : "border-slate-700/70 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
                href={buildCallsHref(filters, { offset: 0, status: option.value })}
                key={option.value}
              >
                {option.label}
              </Link>
            ))}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input name="status" type="hidden" value={filters.status} />
              <button
                className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25"
                type="submit"
              >
                Apply filters
              </button>
              {hasActiveFilters ? (
                <Link
                  className="rounded-xl border border-slate-700/70 bg-slate-950/30 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                  href="/calls"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </div>
        </form>

        <div className="overflow-hidden rounded-[1.5rem] border border-slate-800/70 bg-slate-950/25">
          <div
            className={`grid gap-4 border-b border-slate-800/70 px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 ${
              canSeeRep
                ? "grid-cols-[minmax(0,1.4fr),140px,120px,120px]"
                : "grid-cols-[minmax(0,1.8fr),140px,120px]"
            }`}
          >
            <span>Call</span>
            {canSeeRep ? <span>Rep</span> : null}
            <span className="text-right">Score</span>
            <span className="text-right">Status</span>
          </div>

          {calls.length ? (
            calls.map((call) => (
              <Link
                className={`grid gap-4 border-b border-slate-900/70 px-5 py-4 transition last:border-b-0 hover:bg-blue-600/5 ${
                  canSeeRep
                    ? "grid-cols-[minmax(0,1.4fr),140px,120px,120px]"
                    : "grid-cols-[minmax(0,1.8fr),140px,120px]"
                }`}
                href={`/calls/${call.id}`}
                key={call.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {call.callTopic ?? "Untitled call"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatTimestamp(call.createdAt)}</p>
                </div>
                {canSeeRep ? (
                  <span className="truncate text-sm text-slate-300">{call.repFirstName || call.repLastName ? `${call.repFirstName ?? ""} ${call.repLastName ?? ""}`.trim() : "Unknown rep"}</span>
                ) : null}
                <span className={`text-right text-lg font-semibold ${scoreColor(call.overallScore)}`}>
                  {call.overallScore ?? "—"}
                </span>
                <span className="text-right text-sm uppercase tracking-[0.18em] text-slate-400">
                  {call.status}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-lg font-medium text-slate-200">No calls found</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                {hasActiveFilters
                  ? "No calls match the current filters. Clear them or upload a new call."
                  : "Upload a call to populate the library."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </p>
          <div className="flex gap-2">
            <Link
              aria-disabled={page === 0}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                page === 0
                  ? "pointer-events-none border-slate-800/70 bg-slate-950/20 text-slate-600"
                  : "border-slate-700/70 bg-slate-950/30 text-slate-300 hover:border-slate-600 hover:text-white"
              }`}
              href={buildCallsHref(filters, { offset: Math.max(0, (page - 1) * (filters.limit ?? 20)) })}
            >
              Previous
            </Link>
            <Link
              aria-disabled={page + 1 >= totalPages}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                page + 1 >= totalPages
                  ? "pointer-events-none border-slate-800/70 bg-slate-950/20 text-slate-600"
                  : "border-slate-700/70 bg-slate-950/30 text-slate-300 hover:border-slate-600 hover:text-white"
              }`}
              href={buildCallsHref(filters, { offset: (page + 1) * (filters.limit ?? 20) })}
            >
              Next
            </Link>
          </div>
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

function scoreColor(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "text-slate-400";
  }

  if (value >= 85) return "text-emerald-400";
  if (value >= 70) return "text-blue-300";
  if (value >= 60) return "text-amber-400";
  return "text-red-400";
}
