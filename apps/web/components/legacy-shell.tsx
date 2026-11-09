import Link from "next/link";
import { EntryBrand, EntryPage, EntrySurface, entryStyles } from "@/components/auth/entry-surface";
import { ArgosLogo } from "@/components/argos-logo";
import { LegalFooterLinks } from "@/components/public/legal-links";
import styles from "@/components/public/landing-page.module.css";

type AuthShellProps = {
  children: React.ReactNode;
};

const homepageNavLinks = [
  { label: "Product", href: "/#product-in-motion" },
  { label: "System", href: "/#coaching-system" },
] as const;

export function AuthShell({ children }: AuthShellProps) {
  return (
    <EntryPage>
      <header className={entryStyles.header} aria-label="Login navigation">
        <EntryBrand placement="auth-header" />
        <nav className={entryStyles.nav} aria-label="Homepage sections">
          {homepageNavLinks.map((link) => <Link className={entryStyles.navLink} href={link.href} key={link.href}>{link.label}</Link>)}
          <Link className={entryStyles.navLink} href="/login">Log in</Link>
          <Link aria-label="Book an Argos demo" className={`${entryStyles.secondary} forge-focus-ring`} href="/#access">Book Demo</Link>
        </nav>
      </header>
      <EntrySurface><div className={entryStyles.stack}>{children}</div></EntrySurface>
      <footer className={entryStyles.footer}><LegalFooterLinks className="justify-center" /></footer>
    </EntryPage>
  );
}

type LegacyAuthShellProps = {
  children: React.ReactNode;
  note?: string;
};

type LegacyPrimaryLinkProps = {
  children: React.ReactNode;
  href: string;
};

const authHighlights = [
  {
    description: "Scored from real conversations",
    title: "Call Review",
  },
  {
    description: "Rubric-backed performance views",
    title: "Scorecards",
  },
  {
    description: "Practice built from call gaps",
    title: "Roleplay",
  },
] as const;

export function LegacyAuthShell({ children, note }: LegacyAuthShellProps) {
  return (
    <main
      className="forge-shell min-h-screen px-5 py-5 text-[var(--forge-text)] sm:px-8 sm:py-8"
      data-auth-shell="forge"
      data-shell-theme="forge"
      style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
    >
      <div className="forge-surface mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1500px] items-center justify-center rounded-[2rem] border border-[var(--forge-border)] bg-[var(--forge-surface)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--forge-text)_6%,transparent)] sm:min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-4xl px-6 py-12 sm:px-10 md:px-16 md:py-16">
          <div className="flex flex-col items-center text-center">
            <ArgosLogo
              className="block w-44 sm:w-56"
              decorative
              imageClassName="block h-auto w-full"
              placement="legacy-auth-hero"
            />

            <h1 className="sr-only">
              Argos
            </h1>
            <p className="mt-6 text-xl text-[var(--forge-muted)] sm:text-[2rem]">
              Revenue Command
            </p>

            <div className="mt-12 grid w-full gap-4 md:grid-cols-3">
              {authHighlights.map(({ description, title }) => (
                <article
                  className="forge-surface forge-surface--inset rounded-[1.75rem] px-6 py-7"
                  key={title}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] text-[var(--forge-gold)]">
                    <HighlightIcon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold text-[var(--forge-text)]">{title}</h2>
                  <p className="mt-2 text-lg text-[var(--forge-muted)]">{description}</p>
                </article>
              ))}
            </div>

            <div className="mt-12 w-full max-w-3xl">{children}</div>
            <p className="mt-6 text-lg text-[var(--forge-muted)]">
              {note ?? "Secure login via Google or magic link."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export function LegacyPrimaryLink({
  children,
  href,
}: LegacyPrimaryLinkProps) {
  return (
    <Link
      className="forge-button forge-button-primary forge-focus-ring inline-flex min-h-16 w-full items-center justify-center px-6 text-xl font-semibold"
      href={href}
    >
      {children}
    </Link>
  );
}

function HighlightIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M5 18.5V12m4 6.5V6m4 12.5V9m4 9.5V3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
