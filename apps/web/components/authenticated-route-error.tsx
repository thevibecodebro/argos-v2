"use client";

import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { ForgeButton, ForgeIcon } from "@/components/forge";
import styles from "./authenticated-route-state.module.css";

type AuthenticatedRouteErrorProps = {
  description: string;
  error?: (Error & { digest?: string }) | null;
  eyebrow: string;
  reset: () => void;
  size?: "standard" | "wide";
  title: string;
};

export function AuthenticatedRouteError({ description, error, reset, size = "standard", title }: AuthenticatedRouteErrorProps) {
  const heading = title === "Page error" ? "This page could not be loaded" : `${title} could not be loaded`;
  return (
    <AuthenticatedPageContainer data-authenticated-route-state="error" size={size}>
      <section className={styles.message} data-forge-error-state="true" role="alert">
        <span className={`${styles.icon} ${styles.danger}`}><ForgeIcon name="warning" size={24} /></span>
        <h1>{heading}</h1>
        <p>{description}</p>
        {error?.digest ? <p className={styles.reference}>Error reference: {error.digest}</p> : null}
        <div className={styles.actions}>
          <ForgeButton icon="pending" onClick={reset} type="button" variant="primary">Try again</ForgeButton>
          <ForgeButton href="/dashboard" icon="dashboard" variant="secondary">Back to dashboard</ForgeButton>
        </div>
      </section>
    </AuthenticatedPageContainer>
  );
}
