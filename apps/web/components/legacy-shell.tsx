import Link from "next/link";
import { ArgosLogo } from "@/components/argos-logo";
import { LegalFooterLinks } from "@/components/public/legal-links";
import styles from "@/components/public/landing-page.module.css";

type AuthShellProps = {
  children: React.ReactNode;
};

const homepageNavLinks = [
  { label: "Calls", href: "/#features" },
  { label: "Coaching", href: "/#detail" },
  { label: "Team", href: "/#trust" },
  { label: "Pricing", href: "/#access" },
] as const;

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div
      className={cx(
        styles["argos-3d-page"],
        "min-h-screen overflow-x-hidden text-[var(--forge-text)] selection:bg-[rgba(241,191,123,0.24)] selection:text-[var(--forge-text)]",
      )}
      data-auth-shell="forge"
      data-shell-theme="forge"
      style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
    >
      <header className={styles["argos-nav-shell"]} aria-label="Login navigation">
        <nav className={styles["argos-nav"]}>
          <Link aria-label="Argos homepage" className={styles["argos-brand"]} href="/">
            <ArgosLogo
              className={styles["argos-wordmark"]}
              decorative
              imageClassName={styles["argos-wordmark-image"]}
              placement="auth-header"
            />
          </Link>

          <div className={styles["argos-nav-links"]} aria-label="Homepage sections">
            {homepageNavLinks.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className={styles["argos-nav-actions"]}>
            <Link className={styles["argos-login-link"]} href="/">
              Home
            </Link>
            <Link className={styles["argos-mini-cta"]} href="/#access">
              View plans
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-[2] flex min-h-screen items-center justify-center px-5 pb-16 pt-52 sm:px-8 sm:pt-48 md:pb-24 lg:px-14 lg:pt-36 xl:px-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(241,191,123,0.055)] blur-3xl" />
          <div className="absolute inset-x-[12%] top-[18%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,244,230,0.13),transparent)]" />
          <div className="absolute inset-x-[18%] bottom-[20%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,244,230,0.08),transparent)]" />
        </div>

        <section className="flex w-full items-center justify-center">
          <div className="w-full max-w-[32rem] space-y-10 rounded-[1.65rem] border border-[rgba(255,244,230,0.12)] bg-[rgba(5,4,3,0.76)] p-6 shadow-[inset_0_1px_0_rgba(255,244,230,0.08),0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-md sm:p-8">
            {children}
          </div>
        </section>
      </main>

      <footer className="relative z-[3] flex w-full justify-center px-6 pb-6 md:fixed md:bottom-0 md:left-0 md:right-0 md:py-6">
        <LegalFooterLinks className="justify-center text-[10px] text-[var(--forge-faint)]" />
      </footer>
    </div>
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
      <div className="forge-surface mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1500px] items-center justify-center rounded-[2rem] border border-[var(--forge-border)] bg-[var(--forge-surface)] shadow-[inset_0_1px_0_rgba(255,244,230,0.06)] sm:min-h-[calc(100vh-4rem)]">
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
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-[var(--forge-gold)]">
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
