import Link from "next/link";
import type { ReactNode } from "react";
import { ArgosLogo } from "@/components/argos-logo";
import { billingPlans, getBillingCheckoutHref, type BillingPlanId } from "@/lib/billing/plans";
import { LegalFooterLinks } from "./legal-links";
import styles from "./landing-page.module.css";

const navLinks = [
  { label: "Evolution", href: "#sales-evolution-memory" },
  { label: "Command", href: "#sales-evolution-command" },
  { label: "Practice", href: "#sales-evolution-next-call" },
  { label: "Pricing", href: "#access" },
] as const;

const salesEvolutionHero = {
  body: "Argos turns real sales calls into scored evidence, focused coaching, and roleplay practice for the next conversation.",
  headline: "Sales teams changed. Coaching should have too.",
  primaryCta: { href: "/login", label: "Launch platform" },
  secondaryCta: { href: "#sales-evolution-memory", label: "See the evolution" },
} as const;

const salesEvolutionChapters = [
  {
    body: "Early sales floors were physical and immediate: phones, paper call sheets, handwritten notes, and feedback shaped by whoever happened to be listening.",
    eyebrow: "Coaching by memory",
    heading: "The manager could only coach what they heard.",
    id: "sales-evolution-memory",
    sceneKey: "memory",
  },
  {
    body: "CRMs organized accounts, pipeline, activity, and tasks, but call quality still lived in notes, memory, and manager interpretation.",
    eyebrow: "Pipeline goes digital",
    heading: "Sales systems moved online. Conversations stayed hard to coach.",
    id: "sales-evolution-crm",
    sceneKey: "crm",
  },
  {
    body: "Recorded calls created a new problem: too much audio, too many moments, and too little manager bandwidth to turn it into consistent coaching.",
    eyebrow: "Recording overload",
    heading: "Now teams capture everything and review too little.",
    id: "sales-evolution-recording",
    sceneKey: "recording",
  },
  {
    body: "Transcripts, snippets, dashboards, and chat notes make calls easier to inspect, but behavior changes only when evidence, ownership, and practice connect.",
    eyebrow: "AI tool sprawl",
    heading: "Summaries help. Fragmented coaching still breaks.",
    id: "sales-evolution-sprawl",
    sceneKey: "sprawl",
  },
  {
    body: "The scattered pieces resolve into one workspace: call, transcript, scorecard, coachable moment, assignment, and roleplay tied to the next conversation.",
    eyebrow: "Argos Revenue Command",
    heading: "Argos turns calls into coaching evidence and practice.",
    id: "sales-evolution-command",
    sceneKey: "command",
  },
  {
    body: "The rep does not just receive another note. They rehearse the specific moment before the next call.",
    eyebrow: "The next conversation",
    heading: "Better coaching is a loop from evidence to rehearsal.",
    id: "sales-evolution-next-call",
    sceneKey: "next-call",
  },
] as const;

const commandRoomNotes = [
  {
    title: "Transcript",
    body: "The call record stays connected to speaker labels, scorecard evidence, coaching notes, and the exact moment worth reviewing.",
  },
  {
    title: "Assignment",
    body: "Managers can turn a real gap into a clear coaching action instead of another loose comment in a scattered tool.",
  },
  {
    title: "Roleplay",
    body: "Practice is tied to the moment that created it, so the next conversation has a better behavior behind it.",
  },
] as const;

type PlanPriceDisplay = {
  ariaLabel: string;
  cadence: string;
  rate: string;
};

function getPlanPriceDisplay(planId: BillingPlanId, cadence: string): PlanPriceDisplay {
  const unitAmountCents = billingPlans[planId].price.unitAmountCents;
  const dollars = unitAmountCents / 100;
  const formattedDollars =
    unitAmountCents % 100 === 0 ? dollars.toFixed(0) : dollars.toFixed(2);
  const rate = `$${formattedDollars}`;

  return {
    ariaLabel: `${rate}${cadence}`,
    cadence,
    rate,
  };
}

const accessPlans = [
  {
    name: "Solo",
    label: "Individual practice",
    monthlyPrice: getPlanPriceDisplay("solo", "/month"),
    annualPrice: getPlanPriceDisplay("solo-annual", "/year"),
    body: "For individual reps and founders practicing on their own.",
    detail: "120 live voice minutes/month",
    highlights: ["Private practice loop", "Call review workspace", "Annual savings available"],
    monthlyPlanId: "solo",
    note: "Save 10% annually",
    annualPlanId: "solo-annual",
  },
  {
    name: "Team",
    label: "Manager workspace",
    monthlyPrice: getPlanPriceDisplay("team", "/seat/month"),
    annualPrice: getPlanPriceDisplay("team-annual", "/seat/year"),
    body: "For sales teams that need shared call review, coaching visibility, and pooled voice usage.",
    detail: "120 live voice minutes per seat/month",
    featured: true,
    highlights: ["Shared coaching visibility", "Pooled org-level minutes", "Leaderboards and admin controls"],
    monthlyPlanId: "team",
    note: "3-seat minimum. Pooled at the org level.",
    annualPlanId: "team-annual",
    seatMinimum: 3,
  },
] satisfies Array<{
  annualPlanId: BillingPlanId;
  body: string;
  detail: string;
  featured?: boolean;
  highlights: string[];
  label: string;
  monthlyPlanId: BillingPlanId;
  annualPrice: PlanPriceDisplay;
  monthlyPrice: PlanPriceDisplay;
  name: string;
  note: string;
  seatMinimum?: number;
}>;

const enterprisePlan = {
  name: "Enterprise",
  label: "Custom rollout",
  price: "Custom pricing",
  rate: "Custom",
  body: "For revenue organizations that want Argos rolled out across every seller with hands-on coaching support.",
  detail: "Unlimited seats and unlimited live voice minutes",
  highlights: ["Unlimited seats", "Unlimited live voice minutes", "Comprehensive sales team coaching"],
  note: "Built for sales teams that need full rollout support.",
  bookCallHref: "https://calendar.app.google/RSBtSGHYRSxmcs717",
} as const;

const extraVoicePacks = [
  { label: "250 extra minutes", planId: "extra-250", price: "$125" },
  { label: "500 extra minutes", planId: "extra-500", price: "$175" },
  { label: "2,000 extra minutes", planId: "extra-2000", price: "$600" },
] satisfies Array<{ label: string; planId: BillingPlanId; price: string }>;

export function LandingPage() {
  return (
    <div
      className={cx(styles["argos-3d-page"], "min-h-screen overflow-x-hidden text-[var(--forge-text)]")}
      id="top"
    >
      <BackgroundRig />
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingSalesEvolutionStory />
        <SignalStrip />
        <LandingCommandRoom />
        <LandingAccess />
      </main>
      <LandingFooter />
    </div>
  );
}

function BackgroundRig() {
  return (
    <div className={styles["argos-bg-rig"]} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className={styles["argos-nav-shell"]} aria-label="Primary navigation">
      <nav className={styles["argos-nav"]}>
        <Link aria-label="Argos homepage" className={styles["argos-brand"]} href="/">
          <ArgosLogo
            className={styles["argos-wordmark"]}
            decorative
            imageClassName={styles["argos-wordmark-image"]}
            placement="homepage-nav"
          />
        </Link>

        <div
          aria-label="Page sections"
          className={styles["argos-nav-links"]}
          data-landing-nav-links="true"
        >
          {navLinks.map((link) => (
            <a href={link.href} key={link.label}>
              {link.label}
            </a>
          ))}
        </div>

        <div className={styles["argos-nav-actions"]}>
          <Link className={styles["argos-login-link"]} href="/login">
            Log in
          </Link>
          <Link aria-label="View Argos plans" className={styles["argos-mini-cta"]} href="#access">
            Book demo
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LandingHero() {
  return (
    <section className={styles["argos-hero"]} id="platform" aria-labelledby="hero-copy-heading">
      <div className={styles["argos-hero-frame"]}>
        <div className={styles["argos-hero-copy"]}>
          <p className={styles["argos-eyebrow"]}>Argos Revenue Command</p>
          <h1 id="hero-copy-heading">{salesEvolutionHero.headline}</h1>
          <p className={styles["argos-hero-body"]}>{salesEvolutionHero.body}</p>
          <div className={styles["argos-hero-actions"]}>
            <PremiumButton href={salesEvolutionHero.primaryCta.href}>
              {salesEvolutionHero.primaryCta.label}
            </PremiumButton>
            <Link className={styles["argos-secondary-action"]} href={salesEvolutionHero.secondaryCta.href}>
              {salesEvolutionHero.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className={styles["argos-hero-terminal"]} aria-hidden="true">
          <div>
            <span>ARGOS_COMMAND // SALES_EVOLUTION</span>
            <strong>calls become practice</strong>
          </div>
          <dl>
            <div>
              <dt>Evidence</dt>
              <dd>Scored</dd>
            </div>
            <div>
              <dt>Coaching</dt>
              <dd>Assigned</dd>
            </div>
            <div>
              <dt>Roleplay</dt>
              <dd>Ready</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function LandingSalesEvolutionStory() {
  return (
    <section className={styles["argos-section"]} aria-label="Sales coaching evolution">
      <div className={styles["argos-section-copy"]}>
        <p className={styles["argos-eyebrow"]}>Sales coaching evolution</p>
        <h2>Sales systems evolved. Coaching stayed fragmented.</h2>
        <p>
          Argos is the point where recorded calls, scorecards, coaching moments, assignments, and
          roleplay finally become one operating system.
        </p>
      </div>

      <div className={styles["argos-feature-grid"]}>
        {salesEvolutionChapters.map((chapter, index) => (
          <article
            className={styles["argos-feature-card"]}
            data-scene-key={chapter.sceneKey}
            id={chapter.id}
            key={chapter.id}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{chapter.eyebrow}</h3>
            <p>
              <strong>{chapter.heading}</strong>
              <br />
              {chapter.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SignalStrip() {
  return (
    <section className={styles["argos-signal-strip"]} aria-label="Argos workflow">
      <div>
        <span>COACHING BY MEMORY // PIPELINE GOES DIGITAL // RECORDING OVERLOAD // AI TOOL SPRAWL // ARGOS REVENUE COMMAND // THE NEXT CONVERSATION</span>
        <span>COACHING BY MEMORY // PIPELINE GOES DIGITAL // RECORDING OVERLOAD // AI TOOL SPRAWL // ARGOS REVENUE COMMAND // THE NEXT CONVERSATION</span>
      </div>
    </section>
  );
}

function LandingCommandRoom() {
  return (
    <section className={styles["argos-infrastructure-section"]}>
      <div className={styles["argos-infrastructure-inner"]}>
        <div className={styles["argos-infrastructure-copy"]}>
          <p className={styles["argos-eyebrow"]}>Argos Revenue Command</p>
          <h2>Calls become coaching evidence. Coaching becomes rehearsal.</h2>
          <p>
            The modern sales floor does not need more disconnected notes. It needs one loop from
            the conversation to the behavior that should change before the next one.
          </p>
          <div className={styles["argos-infrastructure-list"]}>
            {commandRoomNotes.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles["argos-intel-card"]}>
          <div className={styles["argos-intel-screen"]}>
            <span>Argos Command // v1</span>
            <p>
              A scored call becomes evidence. Evidence becomes coaching. Coaching becomes a
              practice rep before the next conversation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingAccess() {
  return (
    <section
      aria-labelledby="argos-pricing-heading"
      className={cx(styles["argos-section"], styles["argos-access-section"])}
      id="access"
    >
      <div className={styles["argos-access-panel"]}>
        <div className={styles["argos-pricing-head"]}>
          <p className={styles["argos-eyebrow"]}>Pricing</p>
          <h2 id="argos-pricing-heading">Choose the coaching layer.</h2>
          <p>
            Solo gives one seller a private practice loop. Team gives managers shared visibility,
            pooled minutes, leaderboards, admin controls, and training workflows for the whole org.
          </p>
        </div>

        <div className={styles["argos-plan-row"]} aria-label="Argos pricing options">
          {accessPlans.map((plan) => (
            <article
              className={cx(styles["argos-plan"], plan.featured && styles["argos-plan-featured"])}
              key={plan.name}
            >
              <div className={styles["argos-plan-topline"]}>
                <div>
                  <span>{plan.name}</span>
                  <em>{plan.label}</em>
                </div>
                {plan.featured ? <mark>Recommended deployment</mark> : null}
              </div>
              <div aria-live="polite" className={styles["argos-plan-price-wrap"]}>
                <strong
                  aria-label={plan.monthlyPrice.ariaLabel}
                  className={cx(styles["argos-plan-price"], styles["argos-plan-price-monthly"])}
                >
                  <span>{plan.monthlyPrice.rate}</span>
                  <span>{plan.monthlyPrice.cadence}</span>
                </strong>
                <strong
                  aria-label={plan.annualPrice.ariaLabel}
                  className={cx(styles["argos-plan-price"], styles["argos-plan-price-annual"])}
                >
                  <span>{plan.annualPrice.rate}</span>
                  <span>{plan.annualPrice.cadence}</span>
                </strong>
              </div>
              <p className={styles["argos-plan-detail"]}>{plan.detail}</p>
              <small className={styles["argos-muted-copy"]}>{plan.note}</small>
              <ul className={styles["argos-plan-list"]}>
                {plan.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
              <small className={styles["argos-muted-copy"]}>{plan.body}</small>
              <form action="/billing/checkout" className={styles["argos-plan-checkout-form"]} method="get">
                <BillingIntervalFields plan={plan} />
                {plan.seatMinimum ? (
                  <label className={styles["argos-seat-field"]}>
                    <span>Seats</span>
                    <input
                      aria-label={`${plan.name} seats`}
                      defaultValue={plan.seatMinimum}
                      inputMode="numeric"
                      min={plan.seatMinimum}
                      name="seats"
                      type="number"
                    />
                  </label>
                ) : null}
                <div className={styles["argos-plan-actions"]}>
                  <button className={styles["argos-plan-button"]} type="submit">
                    Continue to checkout
                  </button>
                </div>
              </form>
            </article>
          ))}
          <article className={styles["argos-plan"]} id="book-a-call">
            <div className={styles["argos-plan-topline"]}>
              <div>
                <span>{enterprisePlan.name}</span>
                <em>{enterprisePlan.label}</em>
              </div>
            </div>
            <strong
              aria-label={enterprisePlan.price}
              className={cx(styles["argos-plan-price"], styles["argos-plan-custom-price"])}
            >
              <span>{enterprisePlan.rate}</span>
            </strong>
            <p className={styles["argos-plan-detail"]}>{enterprisePlan.detail}</p>
            <small className={styles["argos-muted-copy"]}>{enterprisePlan.note}</small>
            <ul className={styles["argos-plan-list"]}>
              {enterprisePlan.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
            <small className={styles["argos-muted-copy"]}>{enterprisePlan.body}</small>
            <div className={styles["argos-plan-booking"]}>
              <div className={styles["argos-plan-actions"]}>
                <Link className={styles["argos-plan-button"]} href={enterprisePlan.bookCallHref}>
                  Book a call
                </Link>
              </div>
            </div>
          </article>
        </div>

        <div className={styles["argos-credit-strip"]} aria-label="Extra voice packs">
          <div>
            <span>Extra voice packs</span>
            <p>Included minutes are used first. Purchased packs do not expire while subscribed.</p>
          </div>
          <div className={styles["argos-credit-list"]}>
            {extraVoicePacks.map((pack) => (
              <Link href={getBillingCheckoutHref(pack.planId)} key={pack.label}>
                {pack.label} <strong>{pack.price}</strong>
              </Link>
            ))}
          </div>
        </div>

        <div className={styles["argos-access-actions"]}>
          <PremiumButton href={getBillingCheckoutHref("team")}>Start team checkout</PremiumButton>
          <Link className={styles["argos-secondary-action"]} href="/login">
            Book a demo
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className={styles["argos-footer"]}>
      <div className={styles["argos-footer-inner"]}>
        <div>
          <div aria-label="Argos" className={styles["argos-footer-brand"]}>
            ARGOS
          </div>
          <p>2026 Argos Revenue Command. All rights reserved.</p>
        </div>
        <LegalFooterLinks className="justify-center" />
        <a aria-label="Back to top" className={styles["argos-top-link"]} href="#top">
          &uarr;
        </a>
      </div>
    </footer>
  );
}

function BillingIntervalFields({ plan }: { plan: (typeof accessPlans)[number] }) {
  const planSlug = plan.name.toLowerCase();
  const legendId = `${planSlug}-billing-interval`;
  const monthlyId = `${planSlug}-billing-monthly`;
  const annualId = `${planSlug}-billing-annual`;

  return (
    <fieldset aria-labelledby={legendId} className={styles["argos-billing-toggle"]}>
      <legend id={legendId}>Billing cadence</legend>
      <div className={styles["argos-billing-segments"]}>
        <label className={styles["argos-billing-option"]} htmlFor={monthlyId}>
          <input defaultChecked id={monthlyId} name="plan" type="radio" value={plan.monthlyPlanId} />
          <span>Monthly</span>
          <small>Pay month to month</small>
        </label>
        <label className={styles["argos-billing-option"]} htmlFor={annualId}>
          <input id={annualId} name="plan" type="radio" value={plan.annualPlanId} />
          <span>
            Annual <em>Save 10%</em>
          </span>
          <small>Billed yearly</small>
        </label>
      </div>
    </fieldset>
  );
}

function PremiumButton({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link className={cx(styles["argos-primary-action"], "group")} href={href}>
      <span>{children}</span>
      <span className={styles["argos-action-disc"]} aria-hidden="true">
        &rarr;
      </span>
    </Link>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
