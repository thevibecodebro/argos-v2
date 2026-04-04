import Link from "next/link";

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
