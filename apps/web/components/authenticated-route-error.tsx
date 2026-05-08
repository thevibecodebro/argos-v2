"use client";

import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeButton, ForgeErrorState } from "@/components/forge";
import { PageFrame } from "@/components/page-frame";

type AuthenticatedRouteStateSize = "standard" | "wide";

type AuthenticatedRouteErrorProps = {
  description: string;
  error?: (Error & { digest?: string }) | null;
  eyebrow: string;
  reset: () => void;
  size?: AuthenticatedRouteStateSize;
  title: string;
};

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
