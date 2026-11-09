import Link from "next/link";
import type { ReactNode } from "react";
import {
  EntryBrand,
  EntryPage,
  EntrySurface,
  entryStyles as styles,
} from "./entry-surface";

export function AccessPendingView({ organizationName }: { organizationName: string }) {
  return (
    <EntryPage>
      <header className={styles.header}>
        <EntryBrand placement="access-pending" />
        <span>Workspace access</span>
      </header>
      <EntrySurface>
        <div className={styles.stack}>
          <header>
            <h1 className={styles.title}>Setup is still in progress</h1>
            <p className={styles.description}>
              {organizationName} exists, but its managed feature access is not active yet.
              No workspace features or customer data are available until a platform operator
              activates the agreement.
            </p>
          </header>
          <div className={styles.actions}>
            <Link className={`${styles.secondary} forge-focus-ring`} href="/access-pending">
              Check again
            </Link>
            <form action="/auth/signout" method="post">
              <button className={`${styles.primary} forge-focus-ring`} type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </EntrySurface>
    </EntryPage>
  );
}

export function AuthErrorView() {
  return (
    <EntryPage>
      <header className={styles.header}>
        <EntryBrand placement="auth-error" />
        <span>Auth Error</span>
      </header>
      <EntrySurface>
        <div className={styles.stack}>
          <header>
            <h1 className={styles.title}>Sign-in did not finish</h1>
            <p className={styles.description}>
              Return to login and try again. If it keeps happening, contact your workspace administrator.
            </p>
          </header>
          <div>
            <Link className={`${styles.primary} forge-focus-ring`} href="/login">
              Return to login
            </Link>
          </div>
        </div>
      </EntrySurface>
    </EntryPage>
  );
}

type PlatformMfaEntryViewProps = {
  children: ReactNode;
  mode: "setup" | "verify";
  qrCode?: string | null;
  secret?: string | null;
};

export function PlatformMfaEntryView({
  children,
  mode,
  qrCode,
  secret,
}: PlatformMfaEntryViewProps) {
  const setup = mode === "setup";

  return (
    <EntryPage>
      <header className={styles.header}>
        <EntryBrand placement="platform-mfa" />
        <span>Agency MFA</span>
      </header>
      <EntrySurface>
        <div className={styles.stack}>
          <header>
            <h1 className={styles.title}>
              {setup ? "Set up multi-factor authentication" : "Verify multi-factor authentication"}
            </h1>
            <p className={styles.description}>
              {setup
                ? "Scan the TOTP QR code in your authenticator app, then enter the current code."
                : "Enter the current code from your authenticator app to continue to Agency tools."}
            </p>
          </header>
          {setup ? (
            <div>
              {qrCode ? (
                <img alt="Agency TOTP enrollment QR code" className={styles.qr} src={qrCode} />
              ) : null}
              {secret ? <p className={styles.secret}>{secret}</p> : null}
            </div>
          ) : null}
          {children}
          <Link
            className={`${styles.textLink} forge-focus-ring`}
            href={setup ? "/platform/mfa/verify" : "/platform/mfa/setup"}
          >
            {setup ? "Already enrolled? Verify instead." : "Need to set up a new factor?"}
          </Link>
        </div>
      </EntrySurface>
    </EntryPage>
  );
}
