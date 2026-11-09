"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
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
  scoringEnabled?: boolean;
};

export function CallsFilters({ initialSearch, scoringEnabled = true }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const query = searchParams.toString();
  const committedQueryRef = useRef(query);
  const intendedQueryRef = useRef(query);
  const pendingQueriesRef = useRef<string[]>([]);

  const cancelSearch = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const followNavigation = useCallback((nextQuery: string) => {
    pendingQueriesRef.current = [];
    intendedQueryRef.current = nextQuery;
    cancelSearch();
    setSearch(new URLSearchParams(nextQuery).get("search") ?? "");
  }, [cancelSearch]);

  useLayoutEffect(() => {
    committedQueryRef.current = query;
    const requestedNavigation = pendingQueriesRef.current.indexOf(query);
    if (requestedNavigation !== -1) {
      pendingQueriesRef.current.splice(0, requestedNavigation + 1);
      if (pendingQueriesRef.current.length === 0) intendedQueryRef.current = query;
      // A requested URL may commit after the user has typed again. Keep
      // that newer draft and its timer when acknowledging the destination.
      return;
    }
    // A URL change without a captured intent owns the canonical search.
    followNavigation(query);
  }, [query, followNavigation]);

  useEffect(() => {
    const workspace = filterBarRef.current?.closest('[data-calls-layout="table-first"]');
    function requestNavigation(nextQuery: string) {
      followNavigation(nextQuery);
      // Cancel the pre-navigation draft now, then recognize this destination's
      // eventual commit so it cannot discard typing that follows the intent.
      if (nextQuery !== committedQueryRef.current) pendingQueriesRef.current.push(nextQuery);
    }
    function handleNavigationClick(event: Event) {
      if (!(event instanceof MouseEvent) || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self") || anchor.getAttribute("href")?.includes("#")) return;
      const destination = new URL(anchor.href);
      if (destination.origin !== window.location.origin) return;
      // Explicit links can share a target with an unacknowledged replace.
      // Cancel on intent, before Next commits the destination URL.
      requestNavigation(destination.searchParams.toString());
    }
    function handleHistoryNavigation() {
      requestNavigation(new URLSearchParams(window.location.search).toString());
    }
    workspace?.addEventListener("click", handleNavigationClick, true);
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => {
      workspace?.removeEventListener("click", handleNavigationClick, true);
      window.removeEventListener("popstate", handleHistoryNavigation);
    };
  }, [followNavigation]);

  useEffect(() => cancelSearch, [cancelSearch]);

  const currentStatus = searchParams.get("status") ?? "all";
  const currentSort = searchParams.get("sort") ?? "createdAt:desc";
  const currentMinScore = searchParams.get("minScore") ?? "";
  const currentMaxScore = searchParams.get("maxScore") ?? "";
  const scoreRangeLabel =
    currentMinScore || currentMaxScore
      ? `${currentMinScore ? `${currentMinScore}+` : "Any"} to ${currentMaxScore || "Any"}`
      : "Any score";

  const hasActiveFilters =
    Boolean(search) ||
    (scoringEnabled && (Boolean(currentMinScore) || Boolean(currentMaxScore))) ||
    currentStatus !== "all" ||
    currentSort !== "createdAt:desc";

  const buildUrl = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(intendedQueryRef.current);
      for (const [key, value] of Object.entries(patch)) {
        if (value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete("offset");
      if (!params.get("status") || params.get("status") === "all")
        params.delete("status");
      if (!params.get("sort") || params.get("sort") === "createdAt:desc")
        params.delete("sort");
      const query = params.toString();
      return query ? `/calls?${query}` : "/calls";
    },
    [],
  );

  const replaceUrl = useCallback(
    (href: string) => {
      const nextQuery = href.split("?")[1] ?? "";
      intendedQueryRef.current = nextQuery;
      if (nextQuery === committedQueryRef.current) {
        pendingQueriesRef.current = [];
      } else {
        pendingQueriesRef.current.push(nextQuery);
      }
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [router],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    cancelSearch();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      replaceUrl(buildUrl({ search: value }));
    }, 180);
  }

  function handleMinScoreChange(newMin: string) {
    const patch: Record<string, string> = { minScore: newMin };
    // Validate against the same intended query used to build the URL; another
    // score selection may still be waiting for its navigation to commit.
    const intendedMax = new URLSearchParams(intendedQueryRef.current).get("maxScore");
    if (newMin && intendedMax && Number(newMin) > Number(intendedMax)) {
      patch.maxScore = "";
    }
    replaceUrl(buildUrl(patch));
  }

  function handleMaxScoreChange(newMax: string) {
    const patch: Record<string, string> = { maxScore: newMax };
    const intendedMin = new URLSearchParams(intendedQueryRef.current).get("minScore");
    if (newMax && intendedMin && Number(intendedMin) > Number(newMax)) {
      patch.minScore = "";
    }
    replaceUrl(buildUrl(patch));
  }

  function clearFilters() {
    cancelSearch();
    setSearch("");
    replaceUrl("/calls");
  }

  return (
    <div
      ref={filterBarRef}
      className="grid items-stretch gap-2"
      data-calls-filter-bar="operational"
      data-calls-filter-surface="inline"
      data-filter-pending={isPending ? "true" : undefined}
    >
      <span aria-live="polite" className="sr-only" role="status">
        {isPending ? "Updating calls" : ""}
      </span>
      <div className="group flex min-h-11 items-center rounded-lg border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 transition focus-within:border-[color-mix(in_srgb,var(--forge-cyan)_35%,transparent)] focus-within:bg-[color-mix(in_srgb,var(--forge-cyan)_4.5%,transparent)]">
        <ForgeIcon
          className="mr-2 text-[var(--forge-cyan)]"
          name="search"
          size={17}
        />
        <label className="sr-only" htmlFor="search">
          Search by topic
        </label>
        <input
          className="w-full border-none bg-transparent px-0 py-2 text-sm font-medium text-[var(--forge-text)] outline-none placeholder:text-[color-mix(in_srgb,var(--forge-text)_42%,transparent)] focus:ring-0"
          id="search"
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={scoringEnabled ? "Search calls, reps, topics..." : "Search recordings, reps, topics..."}
          type="text"
          value={search}
        />
      </div>

      <details className="min-w-0 sm:col-span-full" open={currentStatus !== "all" || currentSort !== "createdAt:desc" || Boolean(currentMinScore || currentMaxScore)} data-calls-advanced-filters="true">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--forge-text)]">Filters &amp; sort</summary>
        <div className="grid items-stretch gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 py-2">
            <p className="mb-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
              Status
            </p>
            <label className="sr-only" htmlFor="status">
              Status
            </label>
            <select
              className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-[var(--forge-text)] outline-none focus:ring-0"
              id="status"
              onChange={(e) => replaceUrl(buildUrl({ status: e.target.value }))}
              value={currentStatus}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 py-2">
            <p className="mb-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
              Sort By
            </p>
            <label className="sr-only" htmlFor="sort">
              Sort order
            </label>
            <select
              className="w-full border-none bg-transparent px-0 py-0 text-sm font-semibold text-[var(--forge-text)] outline-none focus:ring-0"
              id="sort"
              onChange={(e) => replaceUrl(buildUrl({ sort: e.target.value }))}
              value={currentSort}
            >
              {SORT_OPTIONS.filter((option) => scoringEnabled || !option.value.startsWith("overallScore")).map((option) => (
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

          {scoringEnabled ? <details
            className="rounded-lg border border-[var(--forge-border)] bg-[var(--forge-panel-muted-bg)] sm:col-span-full"
            open={Boolean(currentMinScore || currentMaxScore)}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-[var(--forge-text)] marker:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <ForgeIcon
                  className="text-[var(--forge-muted)]"
                  name="tune"
                  size={16}
                />
                <span>Score range</span>
              </span>
              <span className="text-xs font-semibold text-[var(--forge-muted)]">
                {scoreRangeLabel}
              </span>
            </summary>
            <div className="grid gap-2 border-t border-[var(--forge-border)] p-2 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 py-2">
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

              <div className="rounded-lg border border-[var(--forge-border)] bg-[var(--forge-control-bg)] px-3 py-2">
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
            </div>
          </details> : null}
        </div>
      </details>
    </div>
  );
}
