"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ForgeButton, ForgeIcon } from "@/components/forge";

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

  function clearFilters() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    isFirstRender.current = true;
    setSearch("");
    router.replace("/calls");
  }

  return (
    <div
      className="grid items-stretch gap-2 rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.024)] p-2 shadow-[inset_0_1px_0_rgba(255,244,230,0.035)] lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,0.58fr))_auto]"
      data-calls-filter-bar="operational"
    >
      <div className="group flex min-h-11 items-center rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] px-3 transition focus-within:border-[rgba(136,218,247,0.35)] focus-within:bg-[rgba(136,218,247,0.045)]">
        <ForgeIcon className="mr-2 text-[var(--forge-cyan)]" name="search" size={17} />
        <label className="sr-only" htmlFor="search">
          Search by topic
        </label>
        <input
          className="w-full border-none bg-transparent px-0 py-2 text-sm font-medium text-[var(--forge-text)] outline-none placeholder:text-[rgba(255,244,230,0.42)] focus:ring-0"
          id="search"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search calls, reps, topics..."
          type="text"
          value={search}
        />
      </div>

      <div className="rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] px-3 py-2">
        <p className="mb-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
          Status
        </p>
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <select
          className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-[var(--forge-text)] outline-none focus:ring-0"
          id="status"
          onChange={(e) => router.replace(buildUrl({ status: e.target.value }))}
          value={currentStatus}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] px-3 py-2">
        <p className="mb-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
          Min Score
        </p>
        <label className="sr-only" htmlFor="minScore">
          Minimum score
        </label>
        <select
          className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-[var(--forge-text)] outline-none focus:ring-0"
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

      <div className="rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] px-3 py-2">
        <p className="mb-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
          Max Score
        </p>
        <label className="sr-only" htmlFor="maxScore">
          Maximum score
        </label>
        <select
          className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-[var(--forge-text)] outline-none focus:ring-0"
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

      <div className="rounded-lg border border-[var(--forge-border)] bg-[rgba(8,6,5,0.5)] px-3 py-2">
        <p className="mb-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
          Sort By
        </p>
        <label className="sr-only" htmlFor="sort">
          Sort order
        </label>
        <select
          className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-[var(--forge-text)] outline-none focus:ring-0"
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

      <ForgeButton
        aria-label={hasActiveFilters ? "Clear filters" : "No filters to clear"}
        className={hasActiveFilters ? "min-h-11" : "min-h-11 opacity-45"}
        disabled={!hasActiveFilters}
        icon="filter_list"
        onClick={clearFilters}
        type="button"
        variant="secondary"
      >
        Clear
      </ForgeButton>
    </div>
  );
}
