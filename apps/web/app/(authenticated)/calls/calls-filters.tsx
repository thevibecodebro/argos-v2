"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

type Props = {
  initialSearch: string;
};

export function CallsFilters({ initialSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const currentStatus = searchParams.get("status") ?? "all";
  const currentSort = searchParams.get("sort") ?? "createdAt:desc";
  const currentMinScore = searchParams.get("minScore") ?? "";
  const currentMaxScore = searchParams.get("maxScore") ?? "";

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(currentMinScore) ||
    Boolean(currentMaxScore) ||
    currentStatus !== "all" ||
    currentSort !== "createdAt:desc";

  const buildUrl = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete("offset");
      if (!params.get("status") || params.get("status") === "all") params.delete("status");
      if (!params.get("sort") || params.get("sort") === "createdAt:desc") params.delete("sort");
      const query = params.toString();
      return query ? `/calls?${query}` : "/calls";
    },
    [searchParams],
  );

  // Debounced search — skip firing on initial mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(buildUrl({ search }));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMinScoreChange(newMin: string) {
    const patch: Record<string, string> = { minScore: newMin };
    // Auto-clear max if it would be less than the new min
    if (newMin && currentMaxScore && Number(newMin) > Number(currentMaxScore)) {
      patch.maxScore = "";
    }
    router.replace(buildUrl(patch));
  }

  function handleMaxScoreChange(newMax: string) {
    const patch: Record<string, string> = { maxScore: newMax };
    // Auto-clear min if it would be greater than the new max
    if (newMax && currentMinScore && Number(currentMinScore) > Number(newMax)) {
      patch.minScore = "";
    }
    router.replace(buildUrl(patch));
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1.6fr,0.8fr,0.8fr,0.8fr]">
        <div>
          <label className="sr-only" htmlFor="search">
            Search by topic
          </label>
          <input
            className="w-full rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
            id="search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic..."
            type="text"
            value={search}
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="minScore">
            Minimum score
          </label>
          <select
            className="w-full rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
            id="minScore"
            onChange={(e) => handleMinScoreChange(e.target.value)}
            value={currentMinScore}
          >
            <option value="">Min score</option>
            {[50, 60, 70, 80, 90].map((v) => (
              <option key={v} value={v}>
                {v}+
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="sr-only" htmlFor="maxScore">
            Maximum score
          </label>
          <select
            className="w-full rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
            id="maxScore"
            onChange={(e) => handleMaxScoreChange(e.target.value)}
            value={currentMaxScore}
          >
            <option value="">Max score</option>
            {[60, 70, 80, 90, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="sr-only" htmlFor="sort">
            Sort order
          </label>
          <select
            className="w-full rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
            id="sort"
            onChange={(e) => router.replace(buildUrl({ sort: e.target.value }))}
            value={currentSort}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            aria-current={currentStatus === option.value ? "page" : undefined}
            className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
              currentStatus === option.value
                ? "border-blue-500/40 bg-blue-600/15 text-blue-300"
                : "border-slate-700/70 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
            key={option.value}
            onClick={() => router.replace(buildUrl({ status: option.value }))}
            type="button"
          >
            {option.label}
          </button>
        ))}
        {hasActiveFilters ? (
          <button
            className="ml-auto rounded-xl border border-slate-700/70 bg-slate-950/30 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            onClick={() => router.replace("/calls")}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
