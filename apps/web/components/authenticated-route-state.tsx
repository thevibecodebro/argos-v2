"use client";

import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import {
  ForgeButton,
  ForgeEmptyState,
  ForgeErrorState,
  ForgeSkeleton,
  ForgeStatusPanel,
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

type AuthenticatedRouteErrorProps = AuthenticatedRouteStateCopy & {
  error?: (Error & { digest?: string }) | null;
  reset: () => void;
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
      data-authenticated-route-state="loading"
      size={size}
    >
      <PageFrame
        description={description}
        eyebrow={eyebrow}
        statusChips={[{ icon: "pending", label: "Loading", tone: "gold" }]}
        title={title}
      >
        <ForgeStatusPanel
          announce="polite"
          description="Argos is preparing this workspace. Content will appear here when loading finishes."
          icon="pending"
          title={loadingLabel}
          tone="gold"
        />
        <div className="grid gap-4 lg:grid-cols-2" data-authenticated-route-skeletons="true">
          <ForgeSkeleton label={loadingLabel} lines={lines} />
          <ForgeSkeleton label={`${loadingLabel} supporting panels`} lines={Math.max(2, lines - 1)} />
        </div>
      </PageFrame>
    </AuthenticatedPageContainer>
  );
}

export function AuthenticatedRouteError({
  description,
  error,
  eyebrow,
  reset,
  size = "standard",
  title,
}: AuthenticatedRouteErrorProps) {
  return (
    <AuthenticatedPageContainer data-authenticated-route-state="error" size={size}>
      <PageFrame
        description={description}
        eyebrow={eyebrow}
        statusChips={[{ icon: "warning", label: "Needs retry", tone: "danger" }]}
        title={title}
        tone="warning"
      >
        <ForgeErrorState
          description="Something interrupted this view before the data finished loading. Try again, or return to the dashboard."
          title={`${title} could not be loaded`}
        >
          {error?.digest ? (
            <p className="text-xs leading-5 text-[var(--forge-muted)]">
              Error reference: {error.digest}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <ForgeButton icon="pending" onClick={reset} type="button" variant="primary">
              Try again
            </ForgeButton>
            <ForgeButton href="/dashboard" icon="dashboard" variant="secondary">
              Back to dashboard
            </ForgeButton>
          </div>
        </ForgeErrorState>
      </PageFrame>
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
