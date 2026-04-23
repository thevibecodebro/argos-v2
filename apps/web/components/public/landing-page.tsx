import Link from "next/link";
import { LegalFooterLinks } from "./legal-links";

const displayFont = {
  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
} as const;

const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#solutions" },
  { label: "Resources", href: "#capabilities" },
  { label: "Pricing", href: "#pricing" },
] as const;

const workflowSteps = [
  {
    icon: "record_voice_over",
    number: "01",
    title: "Capture calls",
    body: "Sync seamlessly with Zoom, Meet, and dialers.",
  },
  {
    icon: "psychology",
    number: "02",
    title: "Extract insights",
    body: "AI dissects sentiment and key moments.",
  },
  {
    icon: "rule",
    number: "03",
    title: "Score output",
    body: "Grade performance against your rubrics.",
  },
  {
    icon: "auto_fix_high",
    number: "04",
    title: "Identify gaps",
    body: "Pinpoint exactly where coaching is needed.",
  },
  {
    icon: "model_training",
    number: "05",
    title: "Guided practice",
    body: "Interactive AI roleplay for focused training.",
  },
  {
    icon: "trending_up",
    number: "06",
    title: "Improve output",
    body: "Measure team-wide growth over time.",
  },
] as const;

const outcomeRows = [
  {
    icon: "rocket_launch",
    title: "Ramp new reps faster",
    body: "Reduce onboarding time by up to 60% with automated feedback loops and immersive AI training paths.",
  },
  {
    icon: "precision_manufacturing",
    title: "Operationalize best practices",
    body: "Don't let your best rep's secrets stay secrets. Package their top-performing patterns into playbooks for the whole team.",
  },
  {
    icon: "security",
    title: "Ensure compliance at scale",
    body: "Monitor 100% of calls for regulatory requirements and internal policy adherence without manual checking.",
  },
] as const;

const pricingPlans = [
  {
    name: "Solo",
    price: "$79",
    cadence: "/month",
    usage: "120 live voice minutes/month",
    note: "For individual reps and founders practicing on their own.",
    access: [
      "Individual workspace only",
      "Calls, highlights, uploads, training, and AI roleplay",
      "Save 10% annually",
    ],
    badge: "Individual focus",
    accentClass: "from-[#74b1ff]/18 via-[#10131a] to-transparent",
  },
  {
    name: "Team",
    price: "$50",
    cadence: "/seat/month",
    usage: "120 live voice minutes per seat/month",
    note: "For coaching teams that need shared visibility and pooled voice usage.",
    access: [
      "3-seat minimum",
      "Pooled at the org level",
      "Team analytics, leaderboards, and admin controls",
      "Save 10% annually",
    ],
    badge: "Org coaching",
    accentClass: "from-[#6dddff]/14 via-[#10131a] to-transparent",
  },
] as const;

const extraVoicePacks = [
  { audience: "Solo", label: "250 extra minutes for $125" },
  { audience: "Team", label: "500 for $175" },
  { audience: "Team", label: "2,000 for $600" },
] as const;

type LandingIconName =
  | "analytics"
  | "arrow_forward"
  | "arrow_upward"
  | "auto_awesome"
  | "auto_fix_high"
  | "check_circle"
  | "east"
  | "electric_bolt"
  | "forum"
  | "model_training"
  | "precision_manufacturing"
  | "psychology"
  | "record_voice_over"
  | "rocket_launch"
  | "rule"
  | "school"
  | "security"
  | "settings_suggest"
  | "stars"
  | "trending_up"
  | "visibility";

export function LandingPage() {
  return (
    <div className="landing-page overflow-x-hidden bg-[#0b0e14] text-[#ecedf6]" id="top">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingWorkflow />
        <LandingCapabilities />
        <LandingPricing />
        <LandingOutcomes />
        <LandingFooterCta />
      </main>
      <LandingFooter />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-[#10131a]/92">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
        <Link
          className="text-2xl font-bold tracking-[-0.08em] text-[#ecedf6]"
          href="/"
          style={displayFont}
        >
          ARGOS
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <a
              className="text-sm tracking-tight text-[#ecedf6]/70 transition-colors duration-300 hover:text-[#74b1ff]"
              href={link.href}
              key={link.label}
              style={displayFont}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            className="hidden text-sm font-medium text-[#ecedf6]/70 transition-colors hover:text-[#74b1ff] sm:block"
            href="/login"
          >
            Login
          </Link>
          <Link
            className="gradient-bg inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(116,177,255,0.18)] transition-all active:scale-95 active:opacity-80"
            href="/login"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LandingHero() {
  return (
    <section className="relative flex min-h-[clamp(42rem,88vh,56rem)] items-center overflow-hidden" id="platform">
      <div className="absolute inset-0 z-0">
        <div className="absolute right-0 top-0 h-[24rem] w-[24rem] translate-x-1/3 -translate-y-1/5 rounded-full bg-[#74b1ff]/8 blur-[88px]" />
        <div className="absolute bottom-0 left-0 h-[18rem] w-[18rem] -translate-x-1/5 translate-y-1/5 rounded-full bg-[#6dddff]/5 blur-[72px]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-16 px-6 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div className="flex flex-col justify-center">
          <div className="space-y-10 md:space-y-12">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#45484f]/20 bg-[#1c2028] px-3 py-1">
              <LandingIcon className="h-4 w-4 text-[#4da0ff]" name="stars" />
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a9abb3]">
                Intelligent Readiness
              </span>
            </div>

            <div className="space-y-7 md:space-y-8">
              <h1 className="text-glow text-5xl font-bold leading-[1.04] tracking-[-0.07em] text-[#ecedf6] sm:text-6xl md:text-7xl">
                Build a sales team that <span className="text-[#4da0ff]">improves</span> after every
                call.
              </h1>

              <p className="max-w-lg text-xl font-light leading-relaxed text-[#a9abb3]">
                Capture, analyze, and automate coaching across every conversation. Turn raw data into
                team-wide excellence with Argos Intelligence.
              </p>
            </div>
          </div>

          <div className="pt-12 md:pt-14">
            <div className="flex flex-wrap items-center gap-5">
              <Link
                className="gradient-bg inline-flex min-h-16 items-center gap-2 rounded-lg px-10 py-5 text-lg font-bold text-black shadow-[0_8px_28px_rgba(116,177,255,0.24)] transition-transform hover:scale-[1.02]"
                href="/login"
              >
                Access platform
                <LandingIcon className="h-5 w-5" name="arrow_forward" />
              </Link>

              <div className="flex min-h-16 items-center gap-4 rounded-lg border border-[#45484f]/30 bg-white/[0.02] px-6 py-4">
                <span className="text-sm text-[#ecedf6]/50">Integrates with</span>
                <div className="flex gap-3 text-[#ecedf6]/60">
                  <IntegrationBadge label="Zoom">
                    <ZoomGlyph />
                  </IntegrationBadge>
                  <IntegrationBadge label="GoHighLevel">
                    <HighLevelGlyph />
                  </IntegrationBadge>
                </div>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8">
              <div>
                <div className="text-3xl font-bold text-[#ecedf6]">94%</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#a9abb3]">
                  Rep Readiness
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#ecedf6]">3.2x</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#a9abb3]">
                  Faster Ramp
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#ecedf6]">12k+</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#a9abb3]">
                  Calls Analyzed
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="relative aspect-square w-full max-w-md">
            <div className="absolute inset-0 rounded-full border border-[#74b1ff]/14" />
            <div className="absolute inset-8 rounded-full border border-[#74b1ff]/8" />
            <div className="absolute inset-16 rounded-full bg-gradient-to-tr from-[#74b1ff]/12 to-transparent blur-xl" />
            <div className="landing-hero-orb absolute inset-0">
              <HeroOrbIllustration />
            </div>

            <div className="glass-card absolute -right-2 top-1/4 min-w-[10.5rem] rounded-xl p-4 sm:-right-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#54a3ff]/16 text-[#74b1ff]">
                  <LandingIcon className="h-5 w-5" name="check_circle" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-tight text-[#a9abb3]">Ready Score</div>
                  <div className="text-lg font-bold text-[#ecedf6]">98.4%</div>
                </div>
              </div>
            </div>

            <div className="glass-card absolute -left-2 bottom-1/4 min-w-[10.5rem] rounded-xl p-4 sm:-left-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6dddff]/16 text-[#6dddff]">
                  <LandingIcon className="h-5 w-5" name="electric_bolt" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-tight text-[#a9abb3]">AI Velocity</div>
                  <div className="text-lg font-bold text-[#ecedf6]">+14%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingWorkflow() {
  return (
    <section className="landing-deferred bg-[#10131a] py-28" id="solutions">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mb-16 text-center md:mb-20">
          <h2 className="mx-auto mb-5 max-w-5xl text-4xl font-bold leading-[1.02] tracking-tight text-[#ecedf6] md:text-[clamp(3rem,5vw,4.75rem)]">
            The Argos Operating Loop
          </h2>
          <p className="mx-auto max-w-4xl text-lg font-light leading-8 text-[#a9abb3]">
            A seamless architectural flow designed to turn every interaction into a scalable
            learning opportunity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {workflowSteps.map((step) => (
            <article
              className="rounded-xl border-t border-[#74b1ff]/20 bg-[#161a21] p-6 transition-all hover:bg-[#1c2028]"
              key={step.number}
            >
              <div className="mb-4 text-[#4da0ff]">
                <LandingIcon className="h-9 w-9" name={step.icon} />
              </div>
              <div className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-bold text-[#ecedf6]">{step.title}</h3>
              <p className="text-xs text-[#a9abb3]">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingCapabilities() {
  return (
    <section className="landing-deferred mx-auto max-w-7xl px-6 py-28 sm:px-8" id="capabilities">
      <div className="mb-16 flex flex-col items-start gap-8 lg:mb-20 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="mb-6 text-5xl font-bold tracking-tight text-[#ecedf6]">
            Engineered for <span className="text-[#74b1ff]">Performance Control</span>
          </h2>
          <p className="text-lg text-[#a9abb3]">
            Stop guessing what happens on calls. Start orchestrating the exact outcomes you want.
          </p>
        </div>
        <div className="hidden h-px flex-1 bg-[#45484f]/30 lg:block" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="glass-card group overflow-hidden rounded-2xl p-10 md:col-span-2">
          <div className="flex flex-col gap-10 md:flex-row">
            <div className="flex-1">
              <LandingIcon className="mb-6 h-10 w-10 text-[#74b1ff]" name="analytics" />
              <h3 className="mb-4 text-3xl font-bold text-[#ecedf6]">Call Intelligence</h3>
              <p className="mb-6 leading-relaxed text-[#a9abb3]">
                Deep-dive into conversation dynamics. Understand objection patterns, competitor
                mentions, and pricing sentiment instantly.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-[#a9abb3]">
                  <LandingIcon className="h-4 w-4 text-[#74b1ff]" name="check_circle" />
                  Keyword &amp; Topic Extraction
                </li>
                <li className="flex items-center gap-2 text-sm text-[#a9abb3]">
                  <LandingIcon className="h-4 w-4 text-[#74b1ff]" name="check_circle" />
                  Sentiment Waveform Analysis
                </li>
              </ul>
            </div>

            <div className="flex-1 overflow-hidden rounded-xl border border-[#45484f]/20 bg-[#22262f] p-4 transition-colors group-hover:border-[#74b1ff]/30">
              <div className="rounded-lg border border-[#45484f]/25 bg-[#10131a] p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#a9abb3]">
                      Call analysis
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[#ecedf6]">
                      Sentiment waveform
                    </div>
                  </div>
                  <div className="rounded-full bg-[#74b1ff]/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#74b1ff]">
                    Live
                  </div>
                </div>
                <div className="flex h-36 items-end gap-2">
                  {[36, 52, 48, 72, 60, 82, 68, 42, 74, 58, 80, 50].map((height, index) => (
                    <span
                      className="flex-1 rounded-full bg-gradient-to-t from-[#74b1ff] to-[#6dddff]"
                      key={`${height}-${index}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Competitor mention", "Pricing push", "Next-step clarity"].map((tag) => (
                    <span
                      className="rounded-full bg-white/5 px-3 py-1 text-[0.68rem] font-semibold text-[#d4dae5]"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="glass-card group flex flex-col rounded-2xl p-10">
          <LandingIcon className="mb-6 h-10 w-10 text-[#74b1ff]" name="auto_awesome" />
          <h3 className="mb-4 text-2xl font-bold text-[#ecedf6]">Coaching Highlights</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#a9abb3]">
            AI-surfaced teachable moments delivered directly to managers for 1-click feedback.
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-[#45484f]/20 pt-6">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
              Optimize Flow
            </span>
            <LandingIcon className="h-5 w-5 text-[#74b1ff]" name="east" />
          </div>
        </article>

        <article className="glass-card group flex flex-col rounded-2xl p-10">
          <LandingIcon className="mb-6 h-10 w-10 text-[#74b1ff]" name="school" />
          <h3 className="mb-4 text-2xl font-bold text-[#ecedf6]">Training Workspace</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#a9abb3]">
            A centralized hub for sales playbooks and interactive training modules that update as
            the market shifts.
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-[#45484f]/20 pt-6">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
              Learn Mode
            </span>
            <LandingIcon className="h-5 w-5 text-[#74b1ff]" name="east" />
          </div>
        </article>

        <article className="glass-card group overflow-hidden rounded-2xl p-10 md:col-span-2">
          <div className="flex flex-col gap-10 md:flex-row-reverse">
            <div className="flex-1">
              <LandingIcon className="mb-6 h-10 w-10 text-[#74b1ff]" name="forum" />
              <h3 className="mb-4 text-3xl font-bold text-[#ecedf6]">AI Roleplay</h3>
              <p className="mb-6 leading-relaxed text-[#a9abb3]">
                Let reps practice tough conversations with an AI that mimics your ideal or most
                difficult customers.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="rounded-lg border border-[#45484f]/20 bg-[#161a21] px-4 py-2 text-xs font-mono text-[#ecedf6]">
                  Realistic Objections
                </div>
                <div className="rounded-lg border border-[#45484f]/20 bg-[#161a21] px-4 py-2 text-xs font-mono text-[#ecedf6]">
                  Instant Grading
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-xl border border-[#45484f]/20 bg-[#22262f] p-6 transition-colors group-hover:border-[#74b1ff]/30">
              <div className="space-y-4 rounded-lg border border-[#45484f]/25 bg-[#10131a] p-5">
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#a9abb3]">
                  AI customer simulation
                </div>
                <div className="max-w-[18rem] rounded-2xl bg-white/5 px-4 py-3 text-sm font-medium leading-6 text-[#d8dde7]">
                  Your price is 18% above our current vendor.
                </div>
                <div className="ml-auto max-w-[18rem] rounded-2xl bg-gradient-to-r from-[#74b1ff]/20 to-[#54a3ff]/30 px-4 py-3 text-sm font-medium leading-6 text-[#ecedf6]">
                  Then let&apos;s measure the cost of staying with them for one more quarter.
                </div>
                <div className="max-w-[18rem] rounded-2xl bg-white/5 px-4 py-3 text-sm font-medium leading-6 text-[#d8dde7]">
                  Show me how you prove that in the room.
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="glass-card group flex flex-col rounded-2xl p-10">
          <LandingIcon className="mb-6 h-10 w-10 text-[#74b1ff]" name="visibility" />
          <h3 className="mb-4 text-2xl font-bold text-[#ecedf6]">Team Visibility</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#a9abb3]">
            Birds-eye view of your entire sales organization&apos;s health and readiness at a
            glance.
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-[#45484f]/20 pt-6">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
              Admin View
            </span>
            <LandingIcon className="h-5 w-5 text-[#74b1ff]" name="east" />
          </div>
        </article>

        <article className="glass-card group flex flex-col rounded-2xl p-10">
          <LandingIcon className="mb-6 h-10 w-10 text-[#74b1ff]" name="settings_suggest" />
          <h3 className="mb-4 text-2xl font-bold text-[#ecedf6]">Rubric Control</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#a9abb3]">
            Define exactly what good looks like. Customize AI scoring rubrics for your specific
            industry.
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-[#45484f]/20 pt-6">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
              Setup Logic
            </span>
            <LandingIcon className="h-5 w-5 text-[#74b1ff]" name="east" />
          </div>
        </article>
      </div>
    </section>
  );
}

function LandingPricing() {
  return (
    <section className="landing-deferred mx-auto max-w-7xl px-6 py-28 sm:px-8" id="pricing">
      <div className="mb-16 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-[#74b1ff]">
            Pricing
          </div>
          <h2 className="text-5xl font-bold tracking-tight text-[#ecedf6]">
            Voice coaching access for{" "}
            <span className="text-[#74b1ff]">solo reps and team operators</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#a9abb3]">
            Keep the same operating loop, choose the workspace shape that matches how you coach,
            and scale live practice with prepaid minutes only when your included pool is exhausted.
          </p>
        </div>
        <div className="rounded-2xl border border-[#45484f]/25 bg-[#10131a] px-5 py-4 text-sm leading-7 text-[#a9abb3]">
          Annual billing available.
          <div className="font-semibold text-[#ecedf6]">Save 10% annually</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {pricingPlans.map((plan) => (
          <article
            className="glass-card relative overflow-hidden rounded-[1.75rem] p-8 sm:p-10"
            key={plan.name}
          >
            <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${plan.accentClass}`} />
            <div className="relative">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#a9abb3]">
                    {plan.name}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-bold tracking-[-0.06em] text-[#ecedf6]">
                      {plan.price}
                    </span>
                    <span className="pb-1 text-lg text-[#a9abb3]">{plan.cadence}</span>
                  </div>
                  <span className="sr-only">{`${plan.price}${plan.cadence}`}</span>
                </div>
                <div className="rounded-full border border-[#74b1ff]/20 bg-[#74b1ff]/10 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#74b1ff]">
                  {plan.badge}
                </div>
              </div>

              <div className="mb-8 rounded-2xl border border-[#45484f]/25 bg-[#0b0e14] px-5 py-4">
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#a9abb3]">
                  Included voice
                </div>
                <div className="mt-2 text-lg font-semibold text-[#ecedf6]">{plan.usage}</div>
              </div>

              <p className="mb-8 max-w-[38ch] text-base leading-7 text-[#a9abb3]">{plan.note}</p>

              <ul className="space-y-4">
                {plan.access.map((item) => (
                  <li className="flex items-start gap-3 text-sm leading-6 text-[#d8dde7]" key={item}>
                    <LandingIcon
                      className="mt-1 h-4 w-4 flex-shrink-0 text-[#74b1ff]"
                      name="check_circle"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-[1.75rem] border border-[#45484f]/25 bg-[#10131a] p-8 sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-[#74b1ff]">
              Extra voice
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-[#ecedf6]">
              Top up minutes without changing your plan structure
            </h3>
            <div className="mt-4 space-y-2 text-sm leading-7 text-[#a9abb3]">
              <p>Included minutes are used first</p>
              <p>Purchased packs do not expire while subscribed</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[34rem]">
            {extraVoicePacks.map((pack) => (
              <article
                className="rounded-2xl border border-[#45484f]/25 bg-[#0b0e14] px-5 py-5"
                key={`${pack.audience}-${pack.label}`}
              >
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#a9abb3]">
                  {pack.audience}
                </div>
                <div className="mt-3 text-lg font-semibold text-[#ecedf6]">{pack.label}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingOutcomes() {
  return (
    <section className="landing-deferred border-y border-[#45484f]/10 bg-[#10131a] py-28" id="outcomes">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 sm:px-8 md:flex-row lg:gap-20">
        <div className="flex-1">
          <h2 className="mb-10 text-4xl font-bold leading-tight text-[#ecedf6]">
            Strategic Outcomes for <span className="text-[#74b1ff]">Revenue Leaders</span>
          </h2>

          <div className="space-y-8">
            {outcomeRows.map((row) => (
              <article className="flex gap-6" key={row.title}>
                <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#74b1ff]/10 text-[#74b1ff]">
                  <LandingIcon className="h-6 w-6" name={row.icon} />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-[#ecedf6]">{row.title}</h3>
                  <p className="text-[#a9abb3]">{row.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="group relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#74b1ff] to-[#6dddff] opacity-16 blur-lg transition duration-700 group-hover:opacity-28" />
            <div className="relative overflow-hidden rounded-2xl border border-[#45484f]/30 bg-[#0b0e14] p-4">
              <div className="rounded-xl border border-[#45484f]/25 bg-[#10131a] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#a9abb3]">
                      Growth dashboard
                    </div>
                    <div className="mt-2 text-xl font-bold text-[#ecedf6]">Performance trend</div>
                  </div>
                  <div className="rounded-full bg-[#74b1ff]/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#74b1ff]">
                    Weekly
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/5 p-4">
                    <span className="block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#a9abb3]">
                      Readiness lift
                    </span>
                    <strong className="mt-2 block text-3xl font-bold text-[#ecedf6]">+18%</strong>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <span className="block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#a9abb3]">
                      Coaching loops
                    </span>
                    <strong className="mt-2 block text-3xl font-bold text-[#ecedf6]">312</strong>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <span className="block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#a9abb3]">
                      Compliance
                    </span>
                    <strong className="mt-2 block text-3xl font-bold text-[#ecedf6]">100%</strong>
                  </div>
                </div>
                <div className="mt-5 flex h-40 items-end gap-3 rounded-xl bg-white/5 p-4">
                  {[32, 38, 52, 58, 66, 74, 82, 94].map((height, index) => (
                    <span
                      className="flex-1 rounded-full bg-gradient-to-t from-[#74b1ff] to-[#6dddff]"
                      key={`${height}-${index}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooterCta() {
  return (
    <section className="landing-deferred relative overflow-hidden py-36" id="cta">
      <div className="absolute left-1/2 top-0 h-full w-full max-w-5xl -translate-x-1/2 rounded-full bg-[#74b1ff]/5 blur-[80px]" />
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center sm:px-8">
        <div className="space-y-10 md:space-y-12">
          <h2 className="mx-auto max-w-[15ch] text-[clamp(3rem,7vw,5.75rem)] font-bold leading-[0.96] tracking-[-0.065em] text-[#ecedf6]">
            Give your sales team one place to <span className="text-[#4da0ff]">improve on purpose.</span>
          </h2>

          <div className="pt-10 md:pt-12">
            <div className="flex flex-col justify-center gap-5 sm:flex-row sm:items-center sm:justify-center">
              <Link
                className="gradient-bg inline-flex min-h-[4.75rem] items-center justify-center rounded-lg px-12 py-5 text-xl font-bold text-black shadow-[0_8px_38px_rgba(116,177,255,0.28)] transition-transform hover:scale-105 sm:min-w-[19rem]"
                href="/login"
              >
                Access platform
              </Link>
              <a
                className="inline-flex min-h-[4.75rem] items-center justify-center rounded-lg border border-[#73757d]/30 bg-[#22262f]/20 px-12 py-5 text-xl font-bold text-[#ecedf6] transition-colors hover:bg-[#22262f]/40 sm:min-w-[19rem]"
                href="/login"
              >
                Book a Demo
              </a>
            </div>
          </div>
        </div>

        <p className="mt-12 text-sm font-medium uppercase tracking-[0.24em] text-[#a9abb3] sm:mt-14">
          Join 500+ high-growth revenue teams
        </p>
      </div>
    </section>
  );
}

function IntegrationBadge({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#45484f]/30 bg-white/5 text-[#ecedf6] transition-colors duration-300 hover:border-[#74b1ff]/40 hover:bg-[#74b1ff]/10"
    >
      {children}
    </div>
  );
}

function ZoomGlyph() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2d8cff]">
      <svg aria-hidden="true" className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5.75 7.25A2.75 2.75 0 0 0 3 10v4a2.75 2.75 0 0 0 2.75 2.75h6.5A2.75 2.75 0 0 0 15 14v-1.12l3.85 2.56A1 1 0 0 0 20.5 14.6V9.4a1 1 0 0 0-1.65-.76L15 11.2V10a2.75 2.75 0 0 0-2.75-2.75h-6.5Z" />
      </svg>
    </span>
  );
}

function HighLevelGlyph() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <rect fill="#ff5a4e" height="16" rx="3" width="4" x="2.5" y="5" />
      <rect fill="#ff8a4e" height="12" rx="3" width="4" x="10" y="9" />
      <rect fill="#ffb14e" height="8" rx="3" width="4" x="17.5" y="13" />
    </svg>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-deferred border-t border-[#45484f]/20 bg-[#0b0e14]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-12 sm:px-8 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <div className="text-xl font-bold text-[#ecedf6]" style={displayFont}>
            ARGOS
          </div>
          <p className="text-center text-xs uppercase tracking-[0.24em] text-[#ecedf6]/50 md:text-left">
            © 2026 Argos Intelligence. All rights reserved.
          </p>
        </div>

        <LegalFooterLinks className="justify-center" />

        <a
          aria-label="Back to top"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#45484f]/30 text-[#74b1ff] transition-colors hover:bg-[#74b1ff]/10"
          href="#top"
        >
          <LandingIcon className="h-5 w-5" name="arrow_upward" />
        </a>
      </div>
    </footer>
  );
}

function HeroOrbIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 560 560"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="280" cy="280" fill="url(#orb-surface)" r="226" />
      <circle cx="280" cy="280" fill="url(#orb-core)" opacity="0.92" r="174" />
      <circle cx="280" cy="280" r="226" stroke="rgba(116,177,255,0.18)" strokeWidth="3" />
      <circle cx="280" cy="280" r="176" stroke="rgba(109,221,255,0.14)" strokeWidth="2" />
      <path
        d="M146 284c40-80 104-126 191-138 46 39 77 89 92 149-26 80-81 134-166 160-63-19-108-57-136-114 7-21 13-40 19-57Z"
        stroke="#74B1FF"
        strokeOpacity="0.42"
        strokeWidth="12"
      />
      <path
        d="M169 314c31-53 71-87 120-101 57 18 99 57 126 118-31 46-73 77-126 93-50-14-91-51-120-110Z"
        stroke="#6DDDFF"
        strokeOpacity="0.34"
        strokeWidth="10"
      />
      <path
        d="M208 195c34 26 73 39 118 39 45 0 85-13 119-39"
        stroke="#6DDDFF"
        strokeLinecap="round"
        strokeOpacity="0.5"
        strokeWidth="9"
      />
      <path
        d="M193 370c32-24 64-36 96-36 32 0 70 12 114 36"
        stroke="#74B1FF"
        strokeLinecap="round"
        strokeOpacity="0.5"
        strokeWidth="9"
      />
      <path
        d="M278 119v321"
        stroke="url(#orb-axis)"
        strokeLinecap="round"
        strokeOpacity="0.72"
        strokeWidth="8"
      />
      <circle cx="208" cy="221" fill="#6DDDFF" opacity="0.82" r="10" />
      <circle cx="356" cy="215" fill="#74B1FF" opacity="0.9" r="11" />
      <circle cx="390" cy="318" fill="#6DDDFF" opacity="0.64" r="8" />
      <circle cx="193" cy="346" fill="#74B1FF" opacity="0.58" r="7" />
      <defs>
        <radialGradient id="orb-surface" cx="0" cy="0" gradientTransform="translate(252 188) rotate(54.285) scale(280)" gradientUnits="userSpaceOnUse" r="1">
          <stop stopColor="#1F4C8B" />
          <stop offset="0.55" stopColor="#10223D" />
          <stop offset="1" stopColor="#050A14" />
        </radialGradient>
        <radialGradient id="orb-core" cx="0" cy="0" gradientTransform="translate(281 260) rotate(90) scale(194)" gradientUnits="userSpaceOnUse" r="1">
          <stop stopColor="#6DDDFF" stopOpacity="0.95" />
          <stop offset="0.48" stopColor="#1B3E78" stopOpacity="0.6" />
          <stop offset="1" stopColor="#07101E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="orb-axis" x1="278" x2="278" y1="119" y2="440" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6DDDFF" />
          <stop offset="1" stopColor="#74B1FF" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LandingIcon({
  className,
  name,
}: {
  className?: string;
  name: LandingIconName;
}) {
  switch (name) {
    case "analytics":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M4 20V9m6 11V4m6 16v-7m4 7H2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "arrow_forward":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M5 12h12m-4-4 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "arrow_upward":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M12 18V6m0 0-4 4m4-4 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "auto_awesome":
      return (
        <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="m12 2 1.4 4.2L17.5 8l-4.1 1.8L12 14l-1.4-4.2L6.5 8l4.1-1.8L12 2Zm7 9 .8 2.2L22 14l-2.2.8L19 17l-.8-2.2L16 14l2.2-.8L19 11ZM5 14l1.1 3L9 18l-2.9 1L5 22l-1.1-3L1 18l2.9-1L5 14Z" />
        </svg>
      );
    case "auto_fix_high":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="m5 19 4.5-4.5m0 0L14 10m-4.5 4.5L7 12m2.5 2.5L12 17m5.5-9.5-1.3-1.3a1.8 1.8 0 0 0-2.5 0L12 7.9l4.1 4.1 1.4-1.4a1.8 1.8 0 0 0 0-2.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "check_circle":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m8.6 12.2 2.3 2.3 4.6-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "east":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M4 12h14m-4-4 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "electric_bolt":
      return (
        <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M13.6 2 6 13.1h4.6L9.7 22 18 10.9h-4.7L13.6 2Z" />
        </svg>
      );
    case "forum":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v5A2.5 2.5 0 0 1 13.5 14H9l-3.5 3v-3H6.5A2.5 2.5 0 0 1 4 11.5v-5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M16 9h1.5A2.5 2.5 0 0 1 20 11.5v4A2.5 2.5 0 0 1 17.5 18H16v2l-2.8-2H11" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "model_training":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M12 5.5 5 9l7 3.5L19 9 12 5.5Zm0 7L5 9v6l7 3.5m0-6L19 9v6l-7 3.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "precision_manufacturing":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M7 6h10v4l-2 2v6H9v-6L7 10V6Zm3-3h4m-7 7H4m16 0h-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "psychology":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M12 4.5c-4.1 0-7 2.8-7 6.6 0 2.7 1.5 4.8 3.8 5.9v2.5l2.6-1.6c.2 0 .4.1.6.1 4.1 0 7-2.8 7-6.6 0-3.8-2.9-6.9-7-6.9Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M10 10.5c.7-1 1.5-1.5 2.5-1.5 1.3 0 2.3 1 2.3 2.2 0 1.5-1.5 2.1-2.4 2.8-.5.4-.8.9-.8 1.5m.1 2h.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "record_voice_over":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 18a5.5 5.5 0 0 1 9 0m6-8a4 4 0 0 1 0 6m-1.5-9a7 7 0 0 1 0 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "rocket_launch":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M14.5 4.5c2.8.5 4.5 2.2 5 5l-6.2 6.2-4.4-4.4L14.5 4.5ZM8.8 11.3 6 12l-2 4 4-2 .7-2.7Zm4.5 4.5L12 18l-2 4 4-2 2.2-1.3" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <circle cx="15.2" cy="8.8" fill="currentColor" r="1.1" />
        </svg>
      );
    case "rule":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M6 7.5h12M6 12h8m-8 4.5h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="m18 10 1.8 1.8L22 9.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "school":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="m3 9 9-4 9 4-9 4-9-4Zm3 2.5v4l6 3 6-3v-4" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "security":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M12 3.5 5.5 6v5.8c0 4 2.7 7.2 6.5 8.7 3.8-1.5 6.5-4.7 6.5-8.7V6L12 3.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="m9.2 12.3 1.9 1.9 3.7-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "settings_suggest":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="m12 6 .9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2L9 8.1l2-.3L12 6Zm6 8 .6 1.2 1.4.2-1 .9.2 1.4-1.2-.6-1.2.6.2-1.4-1-.9 1.4-.2.6-1.2ZM7 14l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2L7 14Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
        </svg>
      );
    case "stars":
      return (
        <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="m12 2 1.6 4.6L18 8.2l-4.4 1.6L12 14.4l-1.6-4.6L6 8.2l4.4-1.6L12 2Zm6.5 9.5.8 2.1 2.2.8-2.2.8-.8 2.1-.8-2.1-2.2-.8 2.2-.8.8-2.1ZM5.5 13l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1 1-2.7Z" />
        </svg>
      );
    case "trending_up":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="m5 15 4-4 3 3 6-6m0 0H14m4 0v4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "visibility":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M2.8 12c1.8-3.4 5-5.5 9.2-5.5s7.4 2.1 9.2 5.5c-1.8 3.4-5 5.5-9.2 5.5S4.6 15.4 2.8 12Z" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    default:
      return null;
  }
}
