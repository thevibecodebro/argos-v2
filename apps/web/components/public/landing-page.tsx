import Link from "next/link";

const workflowSteps = [
  "Capture calls",
  "Score performance",
  "Surface highlights",
  "Assign training",
  "Practice roleplay",
  "Improve team output",
] as const;

const capabilities = [
  {
    eyebrow: "Call Intelligence",
    title: "Review scored conversations with context, not guesswork.",
    body: "Argos turns live sales calls into reviewable scorecards, transcripts, and coaching detail that managers can actually use.",
  },
  {
    eyebrow: "Coaching Highlights",
    title: "Pull the moments that matter into one coaching feed.",
    body: "Star patterns, flag missed opportunities, and build a repeatable coaching library from real conversations.",
  },
  {
    eyebrow: "Training Workspace",
    title: "Assign structured follow-up instead of vague next steps.",
    body: "Move reps from observed gap to targeted training without losing momentum across the team.",
  },
  {
    eyebrow: "AI Roleplay",
    title: "Give reps a place to practice before the next live call.",
    body: "Use roleplay sessions to rehearse objections, sharpen positioning, and reinforce better call behavior.",
  },
  {
    eyebrow: "Team Visibility",
    title: "See performance trends across reps, managers, and teams.",
    body: "Use dashboards, leaderboards, and team views to spot who is improving and where intervention is needed.",
  },
  {
    eyebrow: "Rubric Control",
    title: "Keep coaching standards explicit and controlled.",
    body: "Define the scoring model behind review so managers coach from a shared standard instead of instinct alone.",
  },
] as const;

const outcomes = [
  "Ramp new reps faster",
  "Create clearer coaching loops",
  "Reduce inconsistency across managers",
  "Turn live calls into repeatable training input",
] as const;

export function LandingPage() {
  return (
    <main className="landing-page relative overflow-hidden bg-[#0b0e14] text-[#ecedf6]">
      <LandingBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-8 lg:px-10">
        <LandingHeader />
        <LandingHero />
        <LandingWorkflow />
        <LandingCapabilities />
        <LandingOutcomes />
        <LandingFooterCta />
      </div>
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="landing-header flex items-center justify-between gap-4 py-4">
      <Link
        className="text-2xl font-bold tracking-tight text-[#ecedf6]"
        href="/"
        style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
      >
        Argos
      </Link>

      <div className="flex items-center gap-3">
        <Link className="landing-link text-sm text-[#a9abb3]" href="/login">
          Login
        </Link>
        <Link
          className="landing-button-primary inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold"
          href="/login"
        >
          Start with Argos
        </Link>
      </div>
    </header>
  );
}

function LandingHero() {
  return (
    <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:py-24">
      <div className="landing-hero-copy space-y-8">
        <p className="landing-eyebrow text-[11px] font-black uppercase tracking-[0.32em] text-[#74b1ff]">
          Revenue command platform
        </p>
        <div className="space-y-5">
          <h1
            className="max-w-[12ch] text-[clamp(3.4rem,8vw,6.6rem)] font-bold tracking-[-0.05em] text-[#ecedf6]"
            style={{
              fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
              lineHeight: 0.94,
            }}
          >
            Build a sales team that improves after every call.
          </h1>
          <p className="max-w-[62ch] text-base leading-8 text-[#b7bac6] sm:text-lg">
            Argos captures conversations, scores performance, surfaces coaching
            moments, assigns training, and gives reps a place to practice
            before the next live conversation.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="landing-button-primary inline-flex items-center justify-center rounded-full px-6 py-4 text-sm font-semibold"
            href="/login"
          >
            Start with Argos
          </Link>
          <a
            className="landing-button-secondary inline-flex items-center justify-center rounded-full px-6 py-4 text-sm font-semibold text-[#ecedf6]"
            href="#system"
          >
            See the system
          </a>
        </div>
      </div>

      <section className="landing-panel grid gap-4 rounded-[2rem] border border-white/10 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
          <article className="landing-panel-card rounded-[1.5rem] border border-white/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#74b1ff]">
              Call Review
            </p>
            <p className="mt-4 text-4xl font-bold text-[#ecedf6]">86</p>
            <p className="mt-2 text-sm text-[#a9abb3]">
              Score held against your active rubric with transcript-backed coaching detail.
            </p>
          </article>

          <article className="landing-panel-card rounded-[1.5rem] border border-white/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#6dddff]">
              Readiness
            </p>
            <p className="mt-4 text-sm font-semibold text-[#ecedf6]">Roleplay queued</p>
            <p className="mt-2 text-sm text-[#a9abb3]">
              Rehearse objection handling before the next live conversation.
            </p>
          </article>
        </div>

        <article className="landing-panel-card rounded-[1.5rem] border border-white/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#74b1ff]">
            Coaching Highlight
          </p>
          <h2 className="mt-3 text-xl font-semibold text-[#ecedf6]">
            Discovery held, pricing confidence slipped.
          </h2>
          <p className="mt-3 max-w-[52ch] text-sm leading-7 text-[#a9abb3]">
            Tag the moment, assign the follow-up module, and route the rep into
            deliberate practice while the call is still fresh.
          </p>
        </article>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="landing-panel-card rounded-[1.5rem] border border-white/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
              Training
            </p>
            <p className="mt-3 text-sm font-semibold text-[#ecedf6]">Assigned follow-up</p>
            <p className="mt-2 text-sm text-[#a9abb3]">
              Handle pricing pressure without giving away control.
            </p>
          </article>
          <article className="landing-panel-card rounded-[1.5rem] border border-white/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
              Manager View
            </p>
            <p className="mt-3 text-sm font-semibold text-[#ecedf6]">
              Team trend is stabilizing
            </p>
            <p className="mt-2 text-sm text-[#a9abb3]">
              Use dashboards and leaderboard signals to focus intervention where
              it matters.
            </p>
          </article>
        </div>
      </section>
    </section>
  );
}

function LandingWorkflow() {
  return (
    <section className="space-y-8 py-12" id="system">
      <div className="space-y-3">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#74b1ff]">
          Operating loop
        </p>
        <h2
          className="text-3xl font-bold tracking-tight text-[#ecedf6]"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          One system for review, coaching, training, and practice.
        </h2>
      </div>

      <div className="landing-flow-grid grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {workflowSteps.map((step, index) => (
          <article
            className="landing-flow-card rounded-[1.5rem] border border-white/10 p-5"
            key={step}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
              Step {index + 1}
            </p>
            <h3 className="mt-4 text-lg font-semibold text-[#ecedf6]">{step}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingCapabilities() {
  return (
    <section className="space-y-8 py-12" id="capabilities">
      <div className="space-y-3">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#74b1ff]">
          Capability proof
        </p>
        <h2
          className="text-3xl font-bold tracking-tight text-[#ecedf6]"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          Product surfaces built for sales leaders who need control.
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {capabilities.map((capability, index) => (
          <article
            className={`landing-capability-card rounded-[1.75rem] border border-white/10 p-6 ${
              index === 0 ? "lg:col-span-2" : ""
            }`}
            key={capability.eyebrow}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#74b1ff]">
              {capability.eyebrow}
            </p>
            <h3 className="mt-4 max-w-[24ch] text-2xl font-semibold tracking-tight text-[#ecedf6]">
              {capability.title}
            </h3>
            <p className="mt-4 max-w-[60ch] text-sm leading-7 text-[#a9abb3]">
              {capability.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingOutcomes() {
  return (
    <section className="grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-3">
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#74b1ff]">
          Manager outcomes
        </p>
        <h2
          className="text-3xl font-bold tracking-tight text-[#ecedf6]"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          Built for teams that need consistency, not more coaching sprawl.
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {outcomes.map((outcome) => (
          <article
            className="landing-outcome-card rounded-[1.5rem] border border-white/10 p-5"
            key={outcome}
          >
            <p className="text-base font-semibold text-[#ecedf6]">{outcome}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingFooterCta() {
  return (
    <section className="landing-footer-cta mt-8 rounded-[2rem] border border-white/10 px-6 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#74b1ff]">
            Start the system
          </p>
          <h2
            className="max-w-[18ch] text-3xl font-bold tracking-tight text-[#ecedf6]"
            style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
          >
            Give your sales team one place to improve on purpose.
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="landing-button-primary inline-flex items-center justify-center rounded-full px-6 py-4 text-sm font-semibold"
            href="/login"
          >
            Access platform
          </Link>
          <a
            className="landing-button-secondary inline-flex items-center justify-center rounded-full px-6 py-4 text-sm font-semibold text-[#ecedf6]"
            href="#capabilities"
          >
            Review capabilities
          </a>
        </div>
      </div>
    </section>
  );
}

function LandingBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="landing-field landing-field-a absolute left-[-12%] top-[-10%] h-[32rem] w-[32rem] rounded-full" />
      <div className="landing-field landing-field-b absolute right-[-10%] top-[14%] h-[26rem] w-[26rem] rounded-full" />
      <div className="landing-grid absolute inset-0" />
      <div className="landing-orbit landing-orbit-one absolute left-[8%] top-[18%] h-[28rem] w-[28rem] rounded-full" />
      <div className="landing-orbit landing-orbit-two absolute right-[12%] top-[10%] h-[22rem] w-[22rem] rounded-full" />
      <div className="landing-scan absolute inset-x-0 top-[22%] h-24" />
    </div>
  );
}
