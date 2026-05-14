import Image from "next/image";
import Link from "next/link";
import { LegalFooterLinks } from "@/components/public/legal-links";
import { ArgosSceneLoader } from "@/components/public/argos-scene-loader";
import landingStyles from "@/components/public/landing-page.module.css";
import styles from "./invite-access-shell.module.css";

type InviteAccessShellProps = {
  children: React.ReactNode;
  description: string;
  heading: string;
  note?: string;
  role?: string | null;
  showInviteChips?: boolean;
};

type InviteActionPanelProps = {
  children?: React.ReactNode;
  description: string;
  title: string;
  tone?: "gold" | "danger" | "muted";
};

const argosWordmark = {
  alt: "Argos",
  height: 147,
  src: "/brand/argos-wordmark.png",
  width: 818,
} as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatRoleLabel(role?: string | null) {
  if (!role) return "Workspace access";
  return `${role.charAt(0).toUpperCase()}${role.slice(1)} access`;
}

export function InviteAccessShell({
  children,
  description,
  heading,
  note = "Invitation required - no public signup",
  role,
  showInviteChips = true,
}: InviteAccessShellProps) {
  return (
    <div
      className={cx(
        landingStyles["argos-3d-page"],
        styles.invitePage,
        "min-h-screen overflow-x-hidden text-[var(--forge-text)]",
      )}
      data-auth-shell="forge"
      data-shell-theme="forge"
    >
      <ArgosSceneLoader />
      <header className={styles.inviteHeader} aria-label="Invite access navigation">
        <nav className={styles.inviteNav}>
          <Link aria-label="Argos homepage" className={styles.inviteNavBrand} href="/">
            <Image
              alt=""
              aria-hidden="true"
              className={styles.inviteNavLogo}
              height={argosWordmark.height}
              priority
              src={argosWordmark.src}
              width={argosWordmark.width}
            />
          </Link>

          <div className={styles.inviteNavActions}>
            <Link
              className={cx(styles.inviteNavLink, "forge-focus-ring")}
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className={cx(styles.inviteNavCta, "forge-focus-ring")}
              href="/#access"
            >
              View plans
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className={cx(landingStyles["argos-hero"], styles.inviteHero)}>
          <div className={cx(landingStyles["argos-hero-copy"], styles.inviteCopy)} data-reveal>
            <p className={landingStyles["argos-eyebrow"]}>Workspace invitation</p>
            <div className={styles.inviteLogoLockup}>
              <Image
                alt={argosWordmark.alt}
                className={styles.inviteLogo}
                height={argosWordmark.height}
                priority
                src={argosWordmark.src}
                width={argosWordmark.width}
              />
            </div>
            <h1 className={styles.inviteHeading}>{heading}</h1>
            <p className={landingStyles["argos-hero-body"]}>{description}</p>
            {showInviteChips ? (
              <div className={styles.inviteChips}>
                <InviteChip>Admin invite</InviteChip>
                <InviteChip>{formatRoleLabel(role)}</InviteChip>
                <InviteChip>Secure magic link</InviteChip>
              </div>
            ) : null}
            <div className={styles.inviteActionSlot}>{children}</div>
            <p className={styles.inviteNote}>{note}</p>
          </div>

          <div className={styles.inviteStack} data-reveal>
            <InviteAudiencePanel />
          </div>

          <div className={landingStyles["argos-hero-meter"]} aria-hidden="true">
            <span>Revenue Command</span>
            <strong>secure workspace access</strong>
          </div>
        </section>
      </main>

      <footer className={landingStyles["argos-footer"]}>
        <div className={styles.inviteFooterInner}>
          <div>
            <div className={landingStyles["argos-footer-brand"]}>ARGOS</div>
            <p>2026 Argos Revenue Command. All rights reserved.</p>
          </div>
          <LegalFooterLinks className="justify-center text-[10px] tracking-[0.12em] text-[var(--forge-faint)]" />
        </div>
      </footer>
    </div>
  );
}

function InviteAudiencePanel() {
  return (
    <aside className={styles.inviteAudiencePanel} aria-label="Access options">
      <p className={styles.inviteAudienceKicker}>Which path is yours?</p>
      <div className={styles.inviteAudienceRows}>
        <div className={styles.inviteAudienceRow} data-state="primary">
          <span>Invited teammate</span>
          <h2>Use the admin invite</h2>
          <p>Join with the work email your manager or workspace admin invited.</p>
        </div>
        <div className={styles.inviteAudienceRow}>
          <span>Starting Argos</span>
          <h2>Create an organization</h2>
          <p>Owners and admins can choose a plan before creating a team workspace.</p>
          <Link className={styles.inviteAudienceLink} href="/#access">
            View plans
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function InviteActionPanel({
  children,
  description,
  title,
  tone = "gold",
}: InviteActionPanelProps) {
  return (
    <section className={styles.invitePanel}>
      <div className={styles.invitePanelInner}>
        <span className={styles.inviteIcon} data-tone={tone}>
          <MailIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children ? <div className={styles.inviteActions}>{children}</div> : null}
    </section>
  );
}

export function InvitePrimaryLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className={cx(landingStyles["argos-primary-action"], "forge-focus-ring")}
      href={href}
    >
      <span>{children}</span>
      <span className={landingStyles["argos-action-disc"]} aria-hidden="true">
        →
      </span>
    </Link>
  );
}

export function InvitePrimarySignOutButton({ children }: { children: React.ReactNode }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        className={cx(landingStyles["argos-primary-action"], "forge-focus-ring cursor-pointer")}
        type="submit"
      >
        <span>{children}</span>
        <span className={landingStyles["argos-action-disc"]} aria-hidden="true">
          →
        </span>
      </button>
    </form>
  );
}

export function InviteSecondaryLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className={cx(landingStyles["argos-secondary-action"], "forge-focus-ring")}
      href={href}
    >
      {children}
    </Link>
  );
}

function InviteChip({ children }: { children: React.ReactNode }) {
  return <span className={styles.inviteChip}>{children}</span>;
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M4.75 7.75h14.5v10.5H4.75z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m5.25 8.25 6.75 5 6.75-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
