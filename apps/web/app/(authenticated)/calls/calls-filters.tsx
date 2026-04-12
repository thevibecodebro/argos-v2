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
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.75fr))_auto]">
        <div className="group flex items-center rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-1.5 shadow-[0_12px_40px_rgba(3,8,20,0.24)] backdrop-blur-md transition focus-within:border-[#74b1ff]/40 focus-within:bg-white/[0.06]">
          <span
            aria-hidden="true"
            className="material-symbols-outlined mr-3 text-[#74b1ff]"
            style={{ fontSize: "18px" }}
          >
            topic
          </span>
          <label className="sr-only" htmlFor="search">
            Search by topic
          </label>
          <input
            className="w-full border-none bg-transparent px-0 py-3 text-sm font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:ring-0"
            id="search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topics, deals, or objections"
            type="text"
            value={search}
          />
        </div>

        <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_12px_40px_rgba(3,8,20,0.24)] backdrop-blur-md">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
            Min Score
          </p>
          <label className="sr-only" htmlFor="minScore">
            Minimum score
          </label>
          <select
            className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-slate-100 outline-none focus:ring-0"
            id="minScore"
            onChange={(e) => handleMinScoreChange(e.target.value)}
            value={currentMinScore}
          >
            <option value="">Any</option>
            {[50, 60, 70, 80, 90].map((v) => (
              <option key={v} value={v}>
                {v}+
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_12px_40px_rgba(3,8,20,0.24)] backdrop-blur-md">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
            Max Score
          </p>
          <label className="sr-only" htmlFor="maxScore">
            Maximum score
          </label>
          <select
            className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-slate-100 outline-none focus:ring-0"
            id="maxScore"
            onChange={(e) => handleMaxScoreChange(e.target.value)}
            value={currentMaxScore}
          >
            <option value="">Any</option>
            {[60, 70, 80, 90, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_12px_40px_rgba(3,8,20,0.24)] backdrop-blur-md">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
            Sort By
          </p>
          <label className="sr-only" htmlFor="sort">
            Sort order
          </label>
          <select
            className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-slate-100 outline-none focus:ring-0"
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

        <button
          aria-label={hasActiveFilters ? "Clear filters" : "Filters applied"}
          className={`flex h-full min-h-[62px] items-center justify-center rounded-[1.15rem] border shadow-[0_12px_40px_rgba(3,8,20,0.24)] backdrop-blur-md transition ${
            hasActiveFilters
              ? "border-[#74b1ff]/30 bg-[#74b1ff]/10 text-[#74b1ff] hover:bg-[#74b1ff]/15"
              : "border-white/10 bg-white/[0.04] text-slate-400"
          }`}
          onClick={() => hasActiveFilters && router.replace("/calls")}
          type="button"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            filter_list
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-b border-white/8 pb-1">
        {STATUS_OPTIONS.map((option) => (
          <button
            aria-current={currentStatus === option.value ? "page" : undefined}
            className={`border-b-2 pb-4 text-xs font-black uppercase tracking-[0.24em] transition ${
              currentStatus === option.value
                ? "border-[#74b1ff] text-[#74b1ff]"
                : "border-transparent text-slate-500 hover:text-slate-200"
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
            className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
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
