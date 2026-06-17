import Link from "next/link";
import type { ReactNode } from "react";
import { ArgosLogo } from "@/components/argos-logo";
import { LegalFooterLinks } from "./legal-links";
import styles from "./landing-page.module.css";
import { LandingProductShowcase } from "./product-showcase";

const navLinks = [
  { label: "Product", href: "#product-in-motion" },
  { label: "Coaching", href: "#coaching-system" },
  { label: "Standard", href: "#standard-installation" },
  { label: "System", href: "#coaching-loop" },
  { label: "Roles", href: "#role-outcomes" },
  { label: "Demo", href: "#access" },
] as const;

const salesSystemHero = {
  body: "We Install The Sales Standard In Your Organization. Argos makes it visible in the work: calls reviewed, reps scored, training assigned, and roleplay tracked.",
  headline: "Build a sales team that actually follows the playbook.",
  primaryCta: { href: "#access", label: "Book Demo" },
  secondaryCta: { href: "#coaching-loop", label: "See how Argos supports the system" },
} as const;

const offerCards = [
  {
    body: "Most teams leave the meeting nodding. Then the next call happens, old habits come back, and managers are stuck guessing what actually changed.",
    title: "Coaching only counts if it changes the next call.",
  },
  {
    body: "The sales standard gets installed with your leadership team. Argos keeps that standard visible in calls, scorecards, training assignments, roleplay practice, and manager dashboards.",
    title: "The coaching sets the standard. Argos reinforces it in the work.",
  },
] as const;

const coachingLoopSteps = [
  {
    body: "Upload recordings or connect Zoom so real conversations become reviewable records for managers and reps.",
    eyebrow: "Call review",
    heading: "Turn real conversations into coaching context.",
    id: "call-review-step",
    sceneKey: "call-review",
  },
  {
    body: "Score calls against the sales standard the organization is being coached on, using custom rubrics instead of loose opinions.",
    eyebrow: "Scorecards and rubrics",
    heading: "Make the playbook measurable.",
    id: "scorecards-and-rubrics",
    sceneKey: "scorecards-and-rubrics",
  },
  {
    body: "Managers see who needs attention, which reps are at risk, and where score movement is changing across the team.",
    eyebrow: "Team coaching flags",
    heading: "Show managers where to focus.",
    id: "team-coaching-flags",
    sceneKey: "team-coaching-flags",
  },
  {
    body: "Assign modules and track completion so the sales training does not live only in a meeting recording.",
    eyebrow: "Training assignments",
    heading: "Turn coaching into follow-through.",
    id: "training-assignments",
    sceneKey: "training-assignments",
  },
  {
    body: "Reps practice sales conversations with roleplay scenarios and score their performance before the next customer call.",
    eyebrow: "Roleplay practice",
    heading: "Give reps a place to rehearse.",
    id: "roleplay-practice",
    sceneKey: "roleplay-practice",
  },
  {
    body: "Dashboard views show average score, call volume, training progress, and coaching flags so leadership can inspect the operating system.",
    eyebrow: "Manager dashboards",
    heading: "Make the sales system inspectable.",
    id: "manager-dashboards",
    sceneKey: "manager-dashboards",
  },
] as const;

const standardInstallSteps = [
  {
    body: "Your team aligns around one way to sell, score, coach, and practice instead of carrying separate opinions into every deal review.",
    title: "Install the sales standard",
  },
  {
    body: "Calls are reviewed against the same rubric through scorecards, coaching flags, and visible rep evidence.",
    title: "Argos scores real calls against it",
  },
  {
    body: "Training, roleplay, and dashboards show who is improving and who still needs attention.",
    title: "Managers reinforce it every week",
  },
] as const;

const demoBookingHref = "https://calendar.app.google/RSBtSGHYRSxmcs717";

const demoProofPoints = [
  "Call review",
  "Custom scorecards",
  "Training workflow",
  "Roleplay practice",
] as const;

const roleCards = [
  {
    body: "Install the sales standard once, then use Argos to keep it visible between coaching sessions.",
    title: "For Owners",
  },
  {
    body: "See which reps need coaching, what changed, and what follow-up work was assigned.",
    title: "For Managers",
  },
  {
    body: "Know what good looks like, practice the next conversation, and see progress against the rubric.",
    title: "For Reps",
  },
] as const;

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
        <LandingProductShowcase />
        <LandingCallReviewOffer />
        <LandingStandardInstall />
        <LandingCoachingLoop />
        <LandingRoleCards />
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
          <Link aria-label="Book an Argos demo" className={styles["argos-mini-cta"]} href="#access">
            Book Demo
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
          <h1 id="hero-copy-heading">{salesSystemHero.headline}</h1>
          <p className={styles["argos-hero-body"]}>{salesSystemHero.body}</p>
          <div className={styles["argos-hero-actions"]}>
            <PremiumButton href={salesSystemHero.primaryCta.href}>
              {salesSystemHero.primaryCta.label}
            </PremiumButton>
            <Link className={styles["argos-secondary-action"]} href={salesSystemHero.secondaryCta.href}>
              {salesSystemHero.secondaryCta.label}
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

function LandingCallReviewOffer() {
  return (
    <section className={cx(styles["argos-section"], styles["argos-offer-section"])} id="coaching-system">
      <div className={styles["argos-offer-grid"]}>
        {offerCards.map((item) => (
          <article className={styles["argos-offer-card"]} key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingStandardInstall() {
  return (
    <section
      aria-labelledby="argos-standard-heading"
      className={cx(styles["argos-section"], styles["argos-standard-section"])}
      id="standard-installation"
    >
      <div className={styles["argos-section-copy"]}>
        <p className={styles["argos-eyebrow"]}>How The Standard Gets Installed</p>
        <h2 id="argos-standard-heading">Coaching becomes visible when the team has to use it.</h2>
        <p>
          The sales standard gets installed across the organization. Argos puts that same standard into the call
          review workflow, then managers reinforce it every week.
        </p>
      </div>

      <div className={styles["argos-standard-grid"]}>
        {standardInstallSteps.map((step, index) => (
          <article className={styles["argos-standard-card"]} key={step.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingCoachingLoop() {
  return (
    <section className={styles["argos-section"]} aria-label="Argos coaching loop" id="coaching-loop">
      <div className={styles["argos-section-copy"]}>
        <p className={styles["argos-eyebrow"]}>The operating system</p>
        <h2>Teach the playbook. Track the behavior.</h2>
        <p>
          Coaching gives the team the standard. Argos turns that standard into the
          daily work managers and reps can see, score, assign, and practice.
        </p>
      </div>

      <div className={styles["argos-feature-grid"]} id="platform-features">
        {coachingLoopSteps.map((step, index) => (
          <article
            className={styles["argos-feature-card"]}
            data-scene-key={step.sceneKey}
            id={step.id}
            key={step.id}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.eyebrow}</h3>
            <p>
              <strong>{step.heading}</strong>
              {step.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingRoleCards() {
  return (
    <section
      className={cx(styles["argos-section"], styles["argos-role-section"])}
      aria-label="Argos role outcomes"
      id="role-outcomes"
    >
      <div className={styles["argos-role-grid"]}>
        {roleCards.map((role) => (
          <article className={styles["argos-role-card"]} key={role.title}>
            <span>{role.title}</span>
            <p>{role.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingAccess() {
  return (
    <section
      aria-labelledby="argos-demo-heading"
      className={cx(styles["argos-section"], styles["argos-access-section"])}
      id="access"
    >
      <div className={styles["argos-access-panel"]}>
        <div className={styles["argos-demo-head"]}>
          <p className={styles["argos-eyebrow"]}>Coaching walkthrough</p>
          <h2 id="argos-demo-heading">Want to see how the coaching system works inside Argos?</h2>
          <p>
            Walk through the sales coaching model, the scorecards, the manager dashboard,
            the training workflow, and the roleplay practice loop.
          </p>
        </div>

        <div className={styles["argos-demo-grid"]}>
          <div
            aria-label="Argos product demo video placeholder"
            className={styles["argos-demo-video"]}
            data-demo-video-placeholder="true"
          >
            <div className={styles["argos-demo-video-frame"]}>
              <span className={styles["argos-demo-label"]}>Demo video</span>
              <div className={styles["argos-demo-play"]} aria-hidden="true">
                <span />
              </div>
              <p>Video placeholder</p>
            </div>
          </div>

          <aside className={styles["argos-demo-proof"]}>
            <span>What the walkthrough covers</span>
            <ul>
              {demoProofPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <Link className={styles["argos-demo-button"]} href={demoBookingHref}>
              Book Demo
            </Link>
          </aside>
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
            <ArgosLogo
              className={cx(styles["argos-wordmark"], styles["argos-footer-wordmark"])}
              decorative
              imageClassName={styles["argos-wordmark-image"]}
              placement="homepage-footer"
            />
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
