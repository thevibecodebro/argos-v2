import Link from "next/link";
import { LegalFooterLinks } from "@/components/public/legal-links";
import { EntryBrand, EntryPage, EntrySurface, entryStyles } from "@/components/auth/entry-surface";
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

function formatRoleLabel(role?: string | null) {
  if (!role) return "Workspace access";
  return `${role.charAt(0).toUpperCase()}${role.slice(1)} access`;
}

export function InviteAccessShell({ children, description, heading, note = "Invitation required - no public signup", role, showInviteChips = true }: InviteAccessShellProps) {
  return <EntryPage>
    <header className={entryStyles.header} aria-label="Invite access navigation">
      <EntryBrand placement="invite-nav" />
      <nav className={entryStyles.nav}><Link className={`${entryStyles.navLink} forge-focus-ring`} href="/login">Sign in</Link><Link className={`${entryStyles.secondary} forge-focus-ring`} href="/#access">View plans</Link></nav>
    </header>
    <EntrySurface><div className={entryStyles.stack}>
      <header><h1 className={entryStyles.title}>{heading}</h1><p className={entryStyles.description}>{description}</p></header>
      {showInviteChips ? <ul className={styles.details} aria-label="Invitation details"><li>Admin invite</li><li>{formatRoleLabel(role)}</li><li>Secure magic link</li></ul> : null}
      {children}
      <p className={styles.note}>{note}</p>
      <aside className={styles.support} aria-label="Access options">
        <h2>Which path is yours?</h2>
        <div><h3>Invited teammate · Use the admin invite</h3><p>Join with the work email your manager or workspace admin invited.</p></div>
        <div><h3>Starting Argos · Create an organization</h3><p>Owners and admins can choose a plan before creating a team workspace.</p><Link className={`${entryStyles.textLink} forge-focus-ring`} href="/#access">View plans</Link></div>
      </aside>
    </div></EntrySurface>
    <footer className={entryStyles.footer}><p>2026 Argos Revenue Command. All rights reserved.</p><LegalFooterLinks className="justify-center" /></footer>
  </EntryPage>;
}

export function InviteActionPanel({ children, description, title, tone = "gold" }: InviteActionPanelProps) {
  return <section className={styles.panel} data-tone={tone}><h2>{title}</h2><p>{description}</p>{children ? <div className={`${entryStyles.actions} ${styles.actions}`}>{children}</div> : null}</section>;
}

export function InvitePrimaryLink({ children, href }: { children: React.ReactNode; href: string }) {
  return <Link className={`${entryStyles.primary} forge-focus-ring`} href={href}>{children}</Link>;
}

export function InvitePrimarySignOutButton({ children }: { children: React.ReactNode }) {
  return <form action="/auth/signout" method="post"><button className={`${entryStyles.primary} forge-focus-ring`} type="submit">{children}</button></form>;
}

export function InviteSecondaryLink({ children, href }: { children: React.ReactNode; href: string }) {
  return <Link className={`${entryStyles.secondary} forge-focus-ring`} href={href}>{children}</Link>;
}
