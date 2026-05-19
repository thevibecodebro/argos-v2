import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  ForgeEmptyState,
} from "@/components/forge";
import { PageFrame } from "@/components/page-frame";

type AuthenticatedRouteStateSize = "standard" | "wide";

type AuthenticatedRouteStateCopy = {
  description: string;
  eyebrow: string;
  size?: AuthenticatedRouteStateSize;
  title: string;
};

type AuthenticatedRouteLoadingProps = AuthenticatedRouteStateCopy & {
  lines?: number;
  skeletonLabel?: string;
};

type AuthenticatedRouteNotFoundProps = AuthenticatedRouteStateCopy & {
  actionHref?: string;
  actionLabel?: string;
  icon?: string;
};

export function AuthenticatedRouteLoading({
  description,
  eyebrow,
  lines = 4,
  size = "standard",
  skeletonLabel,
  title,
}: AuthenticatedRouteLoadingProps) {
  const loadingLabel = skeletonLabel ?? `Loading ${title.toLowerCase()}`;

  return (
    <AuthenticatedPageContainer
      aria-busy="true"
      aria-label={loadingLabel}
      aria-live="polite"
      className="py-4 sm:py-5"
      data-authenticated-route-state="loading"
      role="status"
      size={size}
    >
      <section
        className="rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.026)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.04)] sm:px-4"
        data-authenticated-route-loading-header="true"
      >
        <p className="sr-only">{description}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-[var(--forge-gold)]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="truncate text-xl font-semibold tracking-normal text-[var(--forge-text)]">
              {title}
            </h1>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-[rgba(241,191,123,0.24)] bg-[rgba(241,191,123,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--forge-gold)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--forge-gold)]" aria-hidden="true" />
            Loading
          </span>
        </div>
      </section>

      <div
        className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]"
        data-authenticated-route-skeletons="compact"
      >
        <section className="rounded-xl border border-[var(--forge-border)] bg-[rgba(8,6,5,0.78)] p-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.035)]">
          <div className="mb-3 grid gap-px overflow-hidden rounded-lg border border-[var(--forge-border)] bg-[var(--forge-border)] sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="bg-[rgba(12,9,7,0.96)] px-3 py-2" key={index}>
                <div className="forge-skeleton-line h-3 w-20" />
                <div className="forge-skeleton-line mt-2 h-4 w-24" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, index) => (
              <div
                className="grid min-h-14 gap-3 rounded-lg border border-[var(--forge-border)] bg-[rgba(255,244,230,0.024)] px-3 py-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(7rem,0.6fr)_minmax(7rem,0.6fr)_2.5rem] sm:items-center"
                key={index}
              >
                <div className="min-w-0">
                  <div className="forge-skeleton-line h-4 w-3/5" />
                  <div className="forge-skeleton-line mt-2 h-3 w-2/5" />
                </div>
                <div className="forge-skeleton-line h-4 w-24" />
                <div className="forge-skeleton-line h-4 w-20" />
                <div className="forge-skeleton-line hidden h-8 w-8 sm:block" />
              </div>
            ))}
          </div>
        </section>

        <aside className="hidden rounded-xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.026)] p-3 shadow-[inset_0_1px_0_rgba(255,244,230,0.035)] xl:block">
          <div className="forge-skeleton-line h-3 w-20" />
          <div className="forge-skeleton-line mt-3 h-6 w-3/4" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: Math.max(2, lines - 1) }).map((_, index) => (
              <div className="forge-skeleton-line h-10" key={index} />
            ))}
          </div>
        </aside>
      </div>
    </AuthenticatedPageContainer>
  );
}

export function AuthenticatedRouteNotFound({
  actionHref = "/dashboard",
  actionLabel = "Back to dashboard",
  description,
  eyebrow,
  icon = "search",
  size = "standard",
  title,
}: AuthenticatedRouteNotFoundProps) {
  return (
    <AuthenticatedPageContainer data-authenticated-route-state="not-found" size={size}>
      <PageFrame
        actions={[{ href: actionHref, label: actionLabel }]}
        description={description}
        eyebrow={eyebrow}
        title={title}
        tone="warning"
      >
        <ForgeEmptyState
          action={{ href: actionHref, icon: "arrow_back", label: actionLabel }}
          description={description}
          icon={icon}
          title={`${title} not found`}
        />
      </PageFrame>
    </AuthenticatedPageContainer>
  );
}
