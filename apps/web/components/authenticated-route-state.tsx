import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeButton, ForgeIcon } from "@/components/forge";
import { WorkspacePageHeader } from "@/components/workspace-page-header";
import styles from "./authenticated-route-state.module.css";

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
  variant?: "list" | "form" | "detail" | "practice";
  contained?: boolean;
};
type AuthenticatedRouteNotFoundProps = AuthenticatedRouteStateCopy & {
  actionHref?: string;
  actionLabel?: string;
  icon?: string;
};

export function AuthenticatedRouteLoading({
  description, lines = 4, size = "standard", skeletonLabel, title,
  variant = "list", contained = false,
}: AuthenticatedRouteLoadingProps) {
  const loadingLabel = skeletonLabel ?? `Loading ${title.toLowerCase()}`;
  return (
    <AuthenticatedPageContainer
      aria-busy="true" aria-label={loadingLabel} aria-live="polite"
      className={contained ? styles.contained : undefined}
      data-authenticated-route-state="loading" role="status" size={size}
    >
      <div data-authenticated-route-loading-header="true">
        <WorkspacePageHeader title={title} description={description} />
      </div>
      <div aria-hidden="true" className={styles.skeleton} data-authenticated-route-skeletons="compact" data-skeleton-variant={variant}>
        {variant === "practice" ? <div className={styles.practiceTabs}><span className="forge-skeleton-line" /><span className="forge-skeleton-line" /></div> : null}
        <div className={styles.rows}>
          {Array.from({ length: lines }).map((_, index) => (
            <div className={styles.row} key={index}>
              <div className={styles.subject}><span className="forge-skeleton-line" /><span className="forge-skeleton-line" /></div>
              {variant === "list" ? <div className={styles.metadata}><span className="forge-skeleton-line" /><span className="forge-skeleton-line" /></div> : null}
            </div>
          ))}
        </div>
      </div>
    </AuthenticatedPageContainer>
  );
}

export function AuthenticatedRouteNotFound({
  actionHref = "/dashboard", actionLabel = "Back to dashboard", description,
  icon = "search", size = "standard", title,
}: AuthenticatedRouteNotFoundProps) {
  const heading = /not found$/i.test(title) ? title : `${title} not found`;
  return (
    <AuthenticatedPageContainer data-authenticated-route-state="not-found" size={size}>
      <section className={styles.message} data-forge-empty-state="true">
        <span className={styles.icon}><ForgeIcon name={icon} size={24} /></span>
        <h1>{heading}</h1>
        <p>{description}</p>
        <div className={styles.actions}>
          <ForgeButton href={actionHref} icon="arrow_back" variant="secondary">{actionLabel}</ForgeButton>
        </div>
      </section>
    </AuthenticatedPageContainer>
  );
}
