import Image from "next/image";
import Link from "next/link";
import { manropeFont } from "@/lib/manrope-font";
import { LegalFooterLinks } from "./legal-links";

const displayFont = {
  fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
} as const;

const filledSymbol = {
  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
} as const;

const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#solutions" },
  { label: "Resources", href: "#capabilities" },
  { label: "Pricing", href: "#cta" },
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

export function LandingPage() {
  return (
    <div className={`${manropeFont.variable} landing-page overflow-x-hidden bg-[#0b0e14] text-[#ecedf6]`} id="top">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingWorkflow />
        <LandingCapabilities />
        <LandingOutcomes />
        <LandingFooterCta />
      </main>
      <LandingFooter />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-[#10131a] to-transparent backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-4">
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
            className="gradient-bg inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-bold text-black shadow-[0px_8px_32px_0px_rgba(116,177,255,0.2)] transition-all active:scale-95 active:opacity-80"
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
    <section className="relative flex min-h-[921px] items-center overflow-hidden" id="platform">
      <div className="absolute inset-0 z-0">
        <div className="absolute right-0 top-0 h-[600px] w-[600px] translate-x-1/2 -translate-y-1/4 rounded-full bg-[#74b1ff]/10 blur-[150px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/4 rounded-full bg-[#6dddff]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-16 px-8 py-24 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div className="flex flex-col justify-center">
          <div className="space-y-10 md:space-y-12">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#45484f]/20 bg-[#1c2028] px-3 py-1">
              <span className="material-symbols-outlined text-sm text-[#4da0ff]" style={filledSymbol}>
                stars
              </span>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#a9abb3]">
                Intelligent Readiness
              </span>
            </div>

            <div className="space-y-7 md:space-y-8">
              <h1 className="text-glow text-6xl font-bold leading-[1.1] tracking-[-0.07em] text-[#ecedf6] md:text-7xl">
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
                className="gradient-bg inline-flex min-h-16 items-center gap-2 rounded-lg px-12 py-5 text-lg font-bold text-black shadow-[0px_8px_32px_0px_rgba(116,177,255,0.3)] transition-transform hover:scale-[1.02]"
                href="/login"
              >
                Access platform
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>

              <div className="flex min-h-16 items-center gap-4 rounded-lg border border-[#45484f]/30 px-6 py-4 backdrop-blur-sm">
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

            <div className="mt-16 grid grid-cols-3 gap-8">
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
            <div className="absolute inset-0 rounded-full border border-[#74b1ff]/20 motion-safe:animate-pulse" />
            <div className="absolute inset-8 rounded-full border border-[#74b1ff]/10" />
            <div className="absolute inset-20 rounded-full bg-gradient-to-tr from-[#74b1ff]/20 to-transparent blur-2xl" />
            <Image
              alt="Futuristic glowing 3D orb with data streams and blue luminescent patterns on a deep obsidian black background"
              className="rounded-full object-cover opacity-80 mix-blend-screen"
              fill
              priority
              quality={72}
              sizes="(min-width: 1024px) 28rem, (min-width: 768px) 24rem, 80vw"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZYvgLoq8FwwyySPn1bGAcniKj3e-J1UeruPdqjbyuCWl2hxCoIqRhWLYlSbj32tSK2DQVZdytnUQOpN2knCHkTI6X_N9cRCtRV2Um8wSl-UqZ_Vp3CO9i9KSHDSpsgWHSvGE518FwmOQP4cSq1-Bjv8O1qEXGQrkb6HojfKJjl2GjG76v_Uy-iO6KcSnW1vX71VWo0VtipxRh5PhKZfhvTOAJ5n7qjwF80T7LLcRhiMQC5C5WwowopTVl1d2dJXKHrOWbTRF7XaA6"
            />

            <div className="glass-card absolute -right-2 top-1/4 flex items-center gap-3 rounded-xl p-4 sm:-right-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#54a3ff]/20 text-[#74b1ff]">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <div className="text-xs uppercase tracking-tight text-[#a9abb3]">Ready Score</div>
                <div className="text-lg font-bold text-[#ecedf6]">98.4%</div>
              </div>
            </div>

            <div className="glass-card absolute -left-2 bottom-1/4 flex items-center gap-3 rounded-xl p-4 sm:-left-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6dddff]/20 text-[#6dddff]">
                <span className="material-symbols-outlined" style={filledSymbol}>
                  electric_bolt
                </span>
              </div>
              <div>
                <div className="text-xs uppercase tracking-tight text-[#a9abb3]">AI Velocity</div>
                <div className="text-lg font-bold text-[#ecedf6]">+14%</div>
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
    <section className="bg-[#10131a] py-28" id="solutions">
      <div className="mx-auto max-w-7xl px-8">
        <div className="mb-16 text-center md:mb-20">
          <h2 className="mx-auto mb-5 max-w-5xl text-4xl font-bold tracking-tight leading-[1.02] text-[#ecedf6] md:text-[clamp(3rem,5vw,4.75rem)]">
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
              <div className="mb-4 text-[#4da0ff] transition-transform hover:scale-110">
                <span className="material-symbols-outlined text-4xl">{step.icon}</span>
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
    <section className="mx-auto max-w-7xl px-8 py-28" id="capabilities">
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
              <span className="material-symbols-outlined mb-6 text-4xl text-[#74b1ff]">
                analytics
              </span>
              <h3 className="mb-4 text-3xl font-bold text-[#ecedf6]">Call Intelligence</h3>
              <p className="mb-6 leading-relaxed text-[#a9abb3]">
                Deep-dive into conversation dynamics. Understand objection patterns, competitor
                mentions, and pricing sentiment instantly.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-[#a9abb3]">
                  <span className="material-symbols-outlined text-sm text-[#74b1ff]">
                    check_circle
                  </span>
                  Keyword &amp; Topic Extraction
                </li>
                <li className="flex items-center gap-2 text-sm text-[#a9abb3]">
                  <span className="material-symbols-outlined text-sm text-[#74b1ff]">
                    check_circle
                  </span>
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
          <span className="material-symbols-outlined mb-6 text-4xl text-[#74b1ff]">
            auto_awesome
          </span>
          <h3 className="mb-4 text-2xl font-bold text-[#ecedf6]">Coaching Highlights</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#a9abb3]">
            AI-surfaced teachable moments delivered directly to managers for 1-click feedback.
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-[#45484f]/20 pt-6">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
              Optimize Flow
            </span>
            <span className="material-symbols-outlined text-[#74b1ff] transition-transform group-hover:translate-x-2">
              east
            </span>
          </div>
        </article>

        <article className="glass-card group flex flex-col rounded-2xl p-10">
          <span className="material-symbols-outlined mb-6 text-4xl text-[#74b1ff]">
            school
          </span>
          <h3 className="mb-4 text-2xl font-bold text-[#ecedf6]">Training Workspace</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#a9abb3]">
            A centralized hub for sales playbooks and interactive training modules that update as
            the market shifts.
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-[#45484f]/20 pt-6">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
              Learn Mode
            </span>
            <span className="material-symbols-outlined text-[#74b1ff] transition-transform group-hover:translate-x-2">
              east
            </span>
          </div>
        </article>

        <article className="glass-card group overflow-hidden rounded-2xl p-10 md:col-span-2">
          <div className="flex flex-col gap-10 md:flex-row-reverse">
            <div className="flex-1">
              <span className="material-symbols-outlined mb-6 text-4xl text-[#74b1ff]">
                forum
              </span>
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
          <span className="material-symbols-outlined mb-6 text-4xl text-[#74b1ff]">
            visibility
          </span>
          <h3 className="mb-4 text-2xl font-bold text-[#ecedf6]">Team Visibility</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#a9abb3]">
            Birds-eye view of your entire sales organization&apos;s health and readiness at a
            glance.
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-[#45484f]/20 pt-6">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
              Admin View
            </span>
            <span className="material-symbols-outlined text-[#74b1ff] transition-transform group-hover:translate-x-2">
              east
            </span>
          </div>
        </article>

        <article className="glass-card group flex flex-col rounded-2xl p-10">
          <span className="material-symbols-outlined mb-6 text-4xl text-[#74b1ff]">
            settings_suggest
          </span>
          <h3 className="mb-4 text-2xl font-bold text-[#ecedf6]">Rubric Control</h3>
          <p className="mb-8 text-sm leading-relaxed text-[#a9abb3]">
            Define exactly what good looks like. Customize AI scoring rubrics for your specific
            industry.
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-[#45484f]/20 pt-6">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#ecedf6]">
              Setup Logic
            </span>
            <span className="material-symbols-outlined text-[#74b1ff] transition-transform group-hover:translate-x-2">
              east
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}

function LandingOutcomes() {
  return (
    <section className="border-y border-[#45484f]/10 bg-[#10131a] py-28" id="outcomes">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-8 md:flex-row lg:gap-20">
        <div className="flex-1">
          <h2 className="mb-10 text-4xl font-bold leading-tight text-[#ecedf6]">
            Strategic Outcomes for <span className="text-[#74b1ff]">Revenue Leaders</span>
          </h2>

          <div className="space-y-8">
            {outcomeRows.map((row) => (
              <article className="flex gap-6" key={row.title}>
                <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#74b1ff]/10 text-[#74b1ff]">
                  <span className="material-symbols-outlined">{row.icon}</span>
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
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#74b1ff] to-[#6dddff] opacity-20 blur transition duration-1000 group-hover:opacity-40 group-hover:duration-200" />
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
    <section className="relative overflow-hidden py-36" id="cta">
      <div className="absolute left-1/2 top-0 h-full w-full max-w-5xl -translate-x-1/2 rounded-full bg-[#74b1ff]/5 blur-[120px]" />
      <div className="relative z-10 mx-auto max-w-5xl px-8 text-center">
        <div className="space-y-10 md:space-y-12">
          <h2 className="mx-auto max-w-[15ch] text-[clamp(3rem,7vw,5.75rem)] font-bold leading-[0.96] tracking-[-0.065em] text-[#ecedf6]">
            Give your sales team one place to <span className="text-[#4da0ff]">improve on purpose.</span>
          </h2>

          <div className="pt-10 md:pt-12">
            <div className="flex flex-col justify-center gap-5 sm:flex-row sm:items-center sm:justify-center">
              <Link
                className="gradient-bg inline-flex min-h-[4.75rem] items-center justify-center rounded-lg px-12 py-5 text-xl font-bold text-black shadow-[0px_8px_48px_0px_rgba(116,177,255,0.4)] transition-transform hover:scale-105 sm:min-w-[19rem]"
                href="/login"
              >
                Access platform
              </Link>
              <a
                className="inline-flex min-h-[4.75rem] items-center justify-center rounded-lg border border-[#73757d]/30 bg-[#22262f]/20 px-12 py-5 text-xl font-bold text-[#ecedf6] backdrop-blur transition-colors hover:bg-[#22262f]/40 sm:min-w-[19rem]"
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
    <footer className="border-t border-[#45484f]/20 bg-[#0b0e14]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-8 py-12 md:flex-row">
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
          <span className="material-symbols-outlined">arrow_upward</span>
        </a>
      </div>
    </footer>
  );
}
