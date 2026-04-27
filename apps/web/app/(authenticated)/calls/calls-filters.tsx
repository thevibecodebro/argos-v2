"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ForgeActionBar, ForgeButton, ForgeChip } from "@/components/forge";

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
    <div className="space-y-4" data-calls-filter-bar="forge">
      <ForgeActionBar className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.72fr))_auto]">
        <div className="group flex items-center rounded-[1.05rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-4 py-1.5 shadow-[inset_0_1px_0_rgba(255,244,230,0.045)] transition focus-within:border-[rgba(241,191,123,0.34)] focus-within:bg-[rgba(241,191,123,0.055)]">
          <span
            aria-hidden="true"
            className="material-symbols-outlined forge-icon mr-3 text-[var(--forge-gold)]"
            style={{ fontSize: "18px" }}
          >
            search
          </span>
          <label className="sr-only" htmlFor="search">
            Search by topic
          </label>
          <input
            className="w-full border-none bg-transparent px-0 py-3 text-sm font-medium text-[var(--forge-text)] outline-none placeholder:text-[rgba(255,244,230,0.42)] focus:ring-0"
            id="search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topics, deals, or objections"
            type="text"
            value={search}
          />
        </div>

        <div className="rounded-[1.05rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.045)]">
          <p className="mb-1 font-[var(--font-display)] text-[0.63rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
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

        <div className="rounded-[1.05rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.045)]">
          <p className="mb-1 font-[var(--font-display)] text-[0.63rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
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

        <div className="rounded-[1.05rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.045)]">
          <p className="mb-1 font-[var(--font-display)] text-[0.63rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
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
          className={hasActiveFilters ? "min-h-[62px]" : "min-h-[62px] opacity-45"}
          disabled={!hasActiveFilters}
          icon="filter_list"
          onClick={() => router.replace("/calls")}
          type="button"
          variant="secondary"
        >
          Clear
        </ForgeButton>
      </ForgeActionBar>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            aria-current={currentStatus === option.value ? "page" : undefined}
            className="rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(241,191,123,0.42)]"
            data-filter-active={currentStatus === option.value ? "true" : "false"}
            data-filter-status={option.value}
            key={option.value}
            onClick={() => router.replace(buildUrl({ status: option.value }))}
            type="button"
          >
            <ForgeChip tone={currentStatus === option.value ? statusTone(option.value) : "muted"}>
              {option.label}
            </ForgeChip>
          </button>
        ))}
        {hasActiveFilters ? (
          <button
            className="ml-auto rounded-full border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-4 py-2 font-[var(--font-display)] text-xs font-bold text-[var(--forge-muted)] transition hover:border-[rgba(241,191,123,0.28)] hover:text-[var(--forge-gold)]"
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

function statusTone(
  value: (typeof STATUS_OPTIONS)[number]["value"],
): "cyan" | "danger" | "gold" | "success" {
  if (value === "complete") return "success";
  if (value === "processing") return "cyan";
  if (value === "failed") return "danger";
  return "gold";
}
