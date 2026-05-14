import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getBillingCheckoutHref, type BillingPlanId } from "@/lib/billing/plans";
import { ArgosSceneLoader } from "./argos-scene-loader";
import { LegalFooterLinks } from "./legal-links";
import { LandingMotionController } from "./landing-motion-controller";
import styles from "./landing-page.module.css";

const ARGOS_WORDMARK_SRC = "/brand/argos-main-logo.jpg";

const navLinks = [
  { label: "Calls", href: "#features" },
  { label: "Coaching", href: "#detail" },
  { label: "Team", href: "#trust" },
  { label: "Pricing", href: "#access" },
] as const;

const valueProps = [
  {
    title: "Bring calls into one record",
    body: "Upload a recording or connect Zoom. Argos keeps the transcript, speaker labels, scorecard, moments, notes, and follow-up work attached to the call.",
  },
  {
    title: "Score the way your team sells",
    body: "Use the active rubric your managers set: category weights, scoring criteria, call stage, confidence, strengths, gaps, and recommended drills.",
  },
  {
    title: "Show the moments worth coaching",
    body: "Argos marks the timestamp, category, severity, observation, and recommendation so managers can review the exact part of the call that matters.",
  },
  {
    title: "Turn gaps into practice",
    body: "Generate roleplay from a real call, pick the focus area, and give the rep a practice session tied back to what actually happened.",
  },
] as const;

const signalSteps = [
  "Call source",
  "Transcript",
  "Scorecard",
  "Highlights",
  "Training",
  "Roleplay",
] as const;

const trustPoints = [
  "Team views and leaderboards show call volume, average score, coaching flags, focus areas, and recent call history by rep.",
  "Admins can manage rubrics, team access, roles, recording consent, Zoom ingest, and GoHighLevel workflow automation from the workspace.",
  "Every score, note, training assignment, and roleplay session points back to the original call so feedback stays specific.",
] as const;

const accessPlans = [
  {
    name: "Solo",
    label: "Individual practice",
    price: "$79/month",
    rate: "$79",
    cadence: "/month",
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
    price: "$50/seat/month",
    rate: "$50",
    cadence: "/seat/month",
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
  cadence: string;
  name: string;
  note: string;
  price: string;
  rate: string;
  seatMinimum?: number;
}>;

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
      <ArgosSceneLoader />
      <LandingMotionController />
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingProductDetail />
        <LandingTrust />
        <LandingAccess />
      </main>
      <LandingFooter />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className={styles["argos-nav-shell"]} aria-label="Primary navigation">
      <nav className={styles["argos-nav"]}>
        <Link aria-label="Argos homepage" className={styles["argos-brand"]} href="/">
          <ArgosWordmark priority />
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
            Login
          </Link>
          <Link aria-label="Access Argos" className={styles["argos-mini-cta"]} href="/login">
            Access
          </Link>
        </div>
      </nav>
    </header>
  );
}

function LandingHero() {
  return (
    <section className={styles["argos-hero"]} id="platform">
      <div className={styles["argos-hero-copy"]} data-reveal>
        <p className={styles["argos-eyebrow"]}>Sales call review, coaching, and roleplay</p>
        <h1>Argos</h1>
        <p className={styles["argos-hero-line"]}>Turn every sales call into the next practice plan.</p>
        <p className={styles["argos-hero-body"]}>
          Argos pulls in a call from Zoom or a manual upload, transcribes the conversation, scores
          it against your rubric, and shows the few moments worth coaching. Managers can assign
          training, launch roleplay, and see where the team needs work.
        </p>
        <div className={styles["argos-hero-actions"]}>
          <PremiumButton href="/login">Access platform</PremiumButton>
          <a className={styles["argos-secondary-action"]} href="#features">
            See the call flow
          </a>
        </div>
      </div>

      <div className={styles["argos-hero-meter"]} aria-hidden="true" data-reveal>
        <span>Revenue Command</span>
        <strong>call in, next drill out</strong>
      </div>
    </section>
  );
}

function LandingFeatures() {
  return (
    <section className={cx(styles["argos-section"], styles["argos-feature-section"])} id="features">
      <div className={styles["argos-section-copy"]} data-reveal>
        <p className={styles["argos-eyebrow"]}>How Argos works</p>
        <h2>The call becomes the coaching plan.</h2>
        <p>
          A manager should not have to replay an hour of audio to find one teachable moment. Argos
          keeps the call, score, notes, training, and roleplay loop in one place.
        </p>
      </div>

      <div className={styles["argos-feature-grid"]}>
        {valueProps.map((item, index) => (
          <article className={styles["argos-feature-shell"]} data-reveal key={item.title}>
            <div className={styles["argos-feature-card"]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingProductDetail() {
  return (
    <section className={cx(styles["argos-section"], styles["argos-detail-section"])} id="detail">
      <div className={styles["argos-detail-copy"]} data-reveal>
        <p className={styles["argos-eyebrow"]}>Product detail</p>
        <h2>One thread from call review to practice.</h2>
        <p>
          A recorded call becomes a transcript, a rubric score, a short list of coaching moments,
          and the next action. Managers can save highlights, add notes, assign modules, or generate
          roleplay from the exact gap they want the rep to practice.
        </p>
      </div>

      <div className={styles["argos-signal-track"]} data-reveal>
        {signalSteps.map((step, index) => (
          <div className={styles["argos-signal-step"]} key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingTrust() {
  return (
    <section className={cx(styles["argos-section"], styles["argos-trust-section"])} id="trust">
      <div className={cx(styles["argos-section-copy"], styles["argos-trust-copy"])} data-reveal>
        <p className={styles["argos-eyebrow"]}>For managers</p>
        <h2>Coach from what happened, not from memory.</h2>
      </div>

      <div className={styles["argos-trust-list"]}>
        {trustPoints.map((point) => (
          <article className={styles["argos-trust-item"]} data-reveal key={point}>
            <p>{point}</p>
          </article>
        ))}
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
      <div className={styles["argos-access-panel"]} data-reveal>
        <div className={styles["argos-pricing-head"]}>
          <p className={styles["argos-eyebrow"]}>Pricing</p>
          <h2 id="argos-pricing-heading">Start with one rep. Add the team later.</h2>
          <p>
            Solo gives one seller a private practice loop. Team gives managers shared visibility,
            pooled minutes, leaderboards, admin controls, and training workflows for the whole org.
          </p>
        </div>

        <div className={styles["argos-plan-row"]} aria-label="Argos pricing options">
          {accessPlans.map((plan) => (
            <article
              className={cx(styles["argos-plan"], plan.featured && styles["argos-plan-featured"])}
              data-reveal
              key={plan.name}
            >
              <div className={styles["argos-plan-topline"]}>
                <div>
                  <span>{plan.name}</span>
                  <em>{plan.label}</em>
                </div>
                {plan.featured ? <mark>Team scale</mark> : null}
              </div>
              <strong aria-label={plan.price}>
                <span>{plan.rate}</span>
                <span>{plan.cadence}</span>
              </strong>
              <p className={styles["argos-plan-detail"]}>{plan.detail}</p>
              <small>{plan.note}</small>
              <ul className={styles["argos-plan-list"]}>
                {plan.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
              <small>{plan.body}</small>
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
        </div>

        <div className={styles["argos-credit-strip"]} aria-label="Extra voice packs" data-reveal>
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
          <PremiumButton href={getBillingCheckoutHref("team")}>Access platform</PremiumButton>
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
            <ArgosWordmark className={styles["argos-footer-wordmark"]} />
          </div>
          <p>© 2026 Argos Intelligence. All rights reserved.</p>
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
  const legendId = `${plan.name.toLowerCase()}-billing-interval`;

  return (
    <fieldset aria-labelledby={legendId} className={styles["argos-billing-toggle"]}>
      <legend id={legendId}>Billing</legend>
      <label className={styles["argos-billing-option"]}>
        <input defaultChecked name="plan" type="radio" value={plan.monthlyPlanId} />
        <span>Start monthly</span>
        <small>{plan.price}</small>
      </label>
      <label className={styles["argos-billing-option"]}>
        <input name="plan" type="radio" value={plan.annualPlanId} />
        <span>Save 10% annually</span>
        <small>Billed yearly</small>
      </label>
    </fieldset>
  );
}

function ArgosWordmark({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span aria-hidden="true" className={cx(styles["argos-wordmark"], className)}>
      <Image
        alt=""
        className={styles["argos-wordmark-image"]}
        height={540}
        priority={priority}
        sizes="(max-width: 700px) 8rem, 11rem"
        src={ARGOS_WORDMARK_SRC}
        width={960}
      />
    </span>
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
