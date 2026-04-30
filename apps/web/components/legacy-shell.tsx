import Link from "next/link";
import { LegalFooterLinks } from "@/components/public/legal-links";

type AuthShellProps = {
  children: React.ReactNode;
};

const workflowHighlights = [
  "Call review",
  "Scorecards",
  "Highlights",
  "Training",
  "Roleplay",
  "Team coaching",
] as const;

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div
      className="forge-shell min-h-screen overflow-hidden text-[var(--forge-text)] selection:bg-[rgba(241,191,123,0.24)] selection:text-[var(--forge-text)]"
      data-auth-shell="forge"
      data-shell-theme="forge"
      style={{ fontFamily: "var(--font-body, 'Source Sans 3', sans-serif)" }}
    >
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-6">
        <Link
          className="forge-focus-ring rounded-lg font-[var(--font-display)] text-2xl font-bold tracking-tight text-[var(--forge-text)]"
          href="/"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          Argos
        </Link>
        <div className="flex items-center space-x-4">
          <LanguageIcon />
          <HelpIcon />
        </div>
      </header>

      <main className="flex min-h-screen">
        <section className="relative hidden items-center justify-center overflow-hidden border-r border-[var(--forge-border)] bg-[linear-gradient(135deg,rgba(16,9,7,0.92),rgba(5,4,3,0.98))] lg:flex lg:w-1/2">
          <div className="absolute inset-0 opacity-80">
            <AuthShellIllustration />
          </div>

          <div className="relative z-10 w-full max-w-xl p-12">
            <div className="forge-surface rounded-[2rem] p-8">
              <p className="forge-page-eyebrow">Coaching Forge</p>
              <h2
                className="mt-5 font-[var(--font-display)] text-5xl font-bold leading-[0.96] tracking-tight text-[var(--forge-text)]"
                style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
              >
                Sales coaching from the calls reps actually run.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-[var(--forge-muted)]">
                Review calls, score performance, surface highlights, assign training, practice roleplay, and coach the team.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {workflowHighlights.map((item) => (
                  <div
                    className="rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] px-4 py-3 text-sm font-semibold text-[var(--forge-text)]"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex w-full items-center justify-center px-6 py-28 md:px-12 lg:w-1/2">
          <div className="w-full max-w-md space-y-10 rounded-[1.75rem] border border-[var(--forge-border)] bg-[rgba(16,9,7,0.72)] p-6 shadow-[0_24px_80px_rgba(5,3,2,0.34)] sm:p-8">
            {children}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 right-0 flex w-full justify-center px-6 py-6 lg:w-1/2">
        <LegalFooterLinks className="justify-center text-[10px] text-[var(--forge-faint)]" />
      </footer>
    </div>
  );
}

function LanguageIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="forge-focus-ring h-6 w-6 cursor-pointer rounded-full text-[var(--forge-muted)] transition-colors duration-300 hover:text-[var(--forge-gold)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="forge-focus-ring h-6 w-6 cursor-pointer rounded-full text-[var(--forge-muted)] transition-colors duration-300 hover:text-[var(--forge-gold)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AuthShellIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 720 960"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="url(#auth-bg)" height="960" width="720" />
      <circle cx="522" cy="264" fill="var(--forge-gold)" opacity="0.16" r="182" />
      <circle cx="282" cy="612" fill="var(--forge-ember)" opacity="0.11" r="214" />
      <path d="M132 650c89-149 204-225 346-229 90 74 145 165 164 272-60 113-164 179-310 198-101-28-168-109-200-241Z" stroke="var(--forge-gold)" strokeOpacity="0.28" strokeWidth="18" />
      <path d="M176 697c71-103 156-155 256-155 104 0 187 52 249 155" stroke="var(--forge-ember)" strokeLinecap="round" strokeOpacity="0.22" strokeWidth="14" />
      <path d="M200 302c82 63 172 95 272 95 100 0 191-32 272-95" stroke="var(--forge-gold)" strokeLinecap="round" strokeOpacity="0.22" strokeWidth="14" />
      <path d="M357 192v533" stroke="url(#auth-axis)" strokeLinecap="round" strokeOpacity="0.55" strokeWidth="12" />
      <circle cx="287" cy="332" fill="var(--forge-ember)" opacity="0.72" r="16" />
      <circle cx="470" cy="332" fill="var(--forge-gold)" opacity="0.82" r="18" />
      <circle cx="532" cy="524" fill="var(--forge-ember)" opacity="0.58" r="13" />
      <circle cx="240" cy="572" fill="var(--forge-gold)" opacity="0.52" r="11" />
      <defs>
        <linearGradient id="auth-bg" x1="360" x2="360" y1="0" y2="960" gradientUnits="userSpaceOnUse">
          <stop stopColor="#20150f" />
          <stop offset="0.55" stopColor="#100907" />
          <stop offset="1" stopColor="#050403" />
        </linearGradient>
        <linearGradient id="auth-axis" x1="357" x2="357" y1="192" y2="725" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--forge-gold)" />
          <stop offset="1" stopColor="var(--forge-ember)" stopOpacity="0.18" />
        </linearGradient>
      </defs>
    </svg>
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
            <BrandMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />

            <h1 className="mt-10 font-[var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--forge-text)] sm:text-7xl">
              Argos
            </h1>
            <p className="mt-4 text-xl text-[var(--forge-muted)] sm:text-[2rem]">
              Sales Coaching Forge
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

function BrandMark({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg aria-hidden="true" className="h-full w-full" fill="none" viewBox="0 0 72 72">
        <rect
          fill="var(--forge-surface-3)"
          height="72"
          rx="18"
          width="72"
        />
        <rect
          height="70"
          rx="17"
          stroke="var(--forge-border-strong)"
          strokeWidth="2"
          width="70"
          x="1"
          y="1"
        />
        <circle cx="36" cy="36" r="14" stroke="var(--forge-gold)" strokeWidth="3" />
        <circle cx="36" cy="36" fill="var(--forge-gold)" r="4.5" />
        <path
          d="M36 12v6M36 54v6M60 36h-6M18 36h-6"
          stroke="var(--forge-ember)"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
    </div>
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
