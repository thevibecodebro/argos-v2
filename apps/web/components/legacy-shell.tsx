import Link from "next/link";

// ─── Auth shell: split-screen design ─────────────────────────────────────────

type AuthShellProps = {
  children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div
      className="auth-page selection:text-[#74b1ff] min-h-screen overflow-hidden"
      style={{ background: "#0b0e14", color: "#ecedf6", fontFamily: "var(--font-manrope, Manrope, sans-serif)" }}
    >
      {/* ── Fixed header ── */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-6">
        <div
          className="tracking-tighter text-2xl font-bold text-[#ecedf6]"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          Argos
        </div>
        <div className="flex items-center space-x-6">
          <LanguageIcon />
          <HelpIcon />
        </div>
      </header>

      <main className="flex min-h-screen">
        {/* ── Left section: Luminous Visuals ── */}
        <section className="auth-globe-gradient hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
          {/* Background art */}
          <div className="absolute inset-0 opacity-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="high-tech globe with data lines"
              className="w-full h-full object-cover mix-blend-screen"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrlEfPdTn6nBT7qNhHh5S6M2-5aMemMqWRS0zKEHEfFvx08UiCZu4zt_e-PK0NcYwuUNeycywPWGWwICaO8VrnLtDT1h5GOcNBIdezwjyI8SrfTDnq32qsxKfcWtvQaZ3ZXBCVrFq9pMOtKYTm9cvPQHTA5MIWKBEGXHRSSKkOU4_3drNq8FlE4p2NMKDLn55EWes-oNE08o71JukVsSmXc3sNM_w3DGESVPWgC-tDHcHrDEkrFX-T3Qpzf-ASRqqZNlcvSBqHsSk9"
            />
          </div>

          <div className="relative z-10 w-full max-w-xl p-12 space-y-12">
            {/* Bar chart + headline */}
            <div className="space-y-4">
              {/* Abstract bar chart */}
              <div className="flex items-end space-x-2 h-48 px-8">
                <div className="w-4 rounded-t-full h-1/4 opacity-40" style={{ background: "#74b1ff" }} />
                <div className="w-4 rounded-t-full h-1/2 opacity-60" style={{ background: "#2695ff" }} />
                <div className="w-4 rounded-t-full h-2/3 opacity-80" style={{ background: "#74b1ff" }} />
                <div
                  className="w-4 rounded-t-full h-full"
                  style={{
                    background: "#6dddff",
                    boxShadow: "0px 4px 20px 0px rgba(116, 177, 255, 0.4)",
                  }}
                />
                <div className="w-4 rounded-t-full h-3/4" style={{ background: "#54a3ff" }} />
                <div className="w-4 rounded-t-full h-1/2 opacity-50" style={{ background: "#74b1ff" }} />
              </div>

              <div className="px-8">
                <h2
                  className="text-4xl font-bold tracking-tight leading-tight text-[#ecedf6]"
                  style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
                >
                  Intelligence <br />
                  <span style={{ color: "#74b1ff" }}>Defined by Precision.</span>
                </h2>
                <p className="mt-4 text-lg max-w-md" style={{ color: "#a9abb3" }}>
                  Access the command center of your global logistics operations with encrypted, luminescent clarity.
                </p>
              </div>
            </div>
          </div>

          {/* Right-edge tonal fade */}
          <div
            className="absolute right-0 top-0 h-full w-24"
            style={{ background: "linear-gradient(to left, #0b0e14, transparent)" }}
          />
        </section>

        {/* ── Right section: Interaction Zone ── */}
        <section
          className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-12"
          style={{ background: "#0b0e14" }}
        >
          <div className="w-full max-w-md space-y-10">
            {children}
          </div>
        </section>
      </main>

      {/* ── Fixed footer ── */}
      <footer className="fixed bottom-0 right-0 w-full lg:w-1/2 flex justify-center space-x-8 py-8 px-12 pointer-events-none">
        <div className="flex space-x-8 pointer-events-auto">
          <a
            href="#"
            className="auth-footer-link text-[10px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-manrope, sans-serif)" }}
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="auth-footer-link text-[10px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-manrope, sans-serif)" }}
          >
            Terms of Service
          </a>
          <a
            href="#"
            className="auth-footer-link text-[10px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-manrope, sans-serif)" }}
          >
            Security
          </a>
        </div>
        <div
          className="hidden lg:block absolute bottom-8 left-[-100%] text-[10px] uppercase tracking-[0.2em] px-8"
          style={{ color: "rgba(236,237,246,0.2)" }}
        >
          © 2026 Argos Intelligence. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function LanguageIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6 cursor-pointer transition-colors duration-300 text-[rgba(236,237,246,0.6)] hover:text-[#74b1ff]"
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
      className="w-6 h-6 cursor-pointer transition-colors duration-300 text-[rgba(236,237,246,0.6)] hover:text-[#74b1ff]"
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
    description: "7-category analysis",
    title: "AI Scorecards",
  },
  {
    description: "Auto-flagged reps",
    title: "Coaching Flags",
  },
  {
    description: "Real-time feedback",
    title: "Instant Insights",
  },
] as const;

export function LegacyAuthShell({ children, note }: LegacyAuthShellProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#040b18_0%,#07101f_100%)] px-5 py-5 text-[#f6f9ff] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1500px] items-center justify-center rounded-[2rem] border border-[#172543] bg-[#050d1c] shadow-[inset_0_1px_0_rgba(142,172,255,0.06)] sm:min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-4xl px-6 py-12 sm:px-10 md:px-16 md:py-16">
          <div className="flex flex-col items-center text-center">
            <BrandMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />

            <h1 className="mt-10 text-5xl font-semibold tracking-tight text-white sm:text-7xl">
              Argos
            </h1>
            <p className="mt-4 text-xl text-[#8696ba] sm:text-[2rem]">
              Revenue Command Platform
            </p>

            <div className="mt-12 grid w-full gap-4 md:grid-cols-3">
              {authHighlights.map(({ description, title }) => (
                <article
                  className="rounded-[1.75rem] border border-[#182748] bg-[#101a30] px-6 py-7 shadow-[0_18px_50px_rgba(2,8,23,0.35)]"
                  key={title}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1f335d] bg-[#0b1428] text-[#4c93ff]">
                    <HighlightIcon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold text-[#e5eeff]">{title}</h2>
                  <p className="mt-2 text-lg text-[#7283a9]">{description}</p>
                </article>
              ))}
            </div>

            <div className="mt-12 w-full max-w-3xl">{children}</div>
            <p className="mt-6 text-lg text-[#5f6f93]">
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
      className="inline-flex min-h-16 w-full items-center justify-center rounded-[1.3rem] bg-[#2c63f6] px-6 text-xl font-semibold text-white transition hover:bg-[#4476ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4b7dff]/35"
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
          fill="#0f2351"
          height="72"
          rx="18"
          width="72"
        />
        <rect
          height="70"
          rx="17"
          stroke="#2857cc"
          strokeWidth="2"
          width="70"
          x="1"
          y="1"
        />
        <circle cx="36" cy="36" r="14" stroke="#4f96ff" strokeWidth="3" />
        <circle cx="36" cy="36" fill="#4f96ff" r="4.5" />
        <path
          d="M36 12v6M36 54v6M60 36h-6M18 36h-6"
          stroke="#4f96ff"
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
