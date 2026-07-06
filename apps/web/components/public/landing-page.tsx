import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArgosLogo } from "@/components/argos-logo";
import { PRODUCT_DEFINITION } from "@/lib/seo/site";
import { LegalFooterLinks } from "./legal-links";
import styles from "./landing-page.module.css";
import { PointerSheen } from "./pointer-sheen";
import { LandingProductShowcase } from "./product-showcase";

// Two anchors only: the product and the story. Everything else on the
// page is reachable by scroll; the CTA covers the demo.
const navLinks = [
  { label: "Product", href: "#product-in-motion" },
  { label: "System", href: "#coaching-system" },
] as const;

const hero = {
  eyebrow: "Argos Revenue Command",
  body: "We install the sales standard in your organization — then Argos keeps it visible in the work. Every call reviewed. Every rep scored. Every coaching action tracked to the next conversation.",
  signature: "Your revenue. Running without you.",
  primaryCta: { href: "#access", label: "Book the demo" },
  secondaryCta: { href: "#product-in-motion", label: "See the system" },
} as const;

const ceilingColumns = [
  {
    body: "Most teams leave the meeting nodding. Then the next call happens, old habits come back, and managers are stuck guessing what actually changed.",
    title: "The meeting ends. The standard evaporates.",
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
  },
  {
    body: "Score calls against the sales standard the organization is being coached on, using custom rubrics instead of loose opinions.",
    eyebrow: "Scorecards and rubrics",
    heading: "Make the playbook measurable.",
    id: "scorecards-and-rubrics",
  },
  {
    body: "Managers see who needs attention, which reps are at risk, and where score movement is changing across the team.",
    eyebrow: "Team coaching flags",
    heading: "Show managers where to focus.",
    id: "team-coaching-flags",
  },
  {
    body: "Assign modules and track completion so the sales training does not live only in a meeting recording.",
    eyebrow: "Training assignments",
    heading: "Turn coaching into follow-through.",
    id: "training-assignments",
  },
  {
    body: "Reps practice sales conversations with roleplay scenarios and score their performance before the next customer call.",
    eyebrow: "Roleplay practice",
    heading: "Give reps a place to rehearse.",
    id: "roleplay-practice",
  },
  {
    body: "Dashboard views show average score, call volume, training progress, and coaching flags so leadership can inspect the operating system.",
    eyebrow: "Manager dashboards",
    heading: "Make the sales system inspectable.",
    id: "manager-dashboards",
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

const answerPoints = [
  {
    title: "Who it is for",
    body: "Sales managers and leaders who need coaching tied to real calls.",
  },
  {
    title: "How the loop works",
    body: "A call becomes scored evidence, a coaching action, a roleplay drill, and a next-call progress signal.",
  },
  {
    title: "What managers see",
    body: "The transcript, scorecard evidence, training assignment, and behavior trend stay connected.",
  },
] as const;

export function LandingPage() {
  return (
    <div className={styles["argos-3d-page"]} id="top">
      <div className={styles["argos-atmosphere"]} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <PointerSheen />
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingCeiling />
        <LandingCommandSurface />
        <LandingCoachingLoop />
        <LandingInstallation />
        <LandingRoles />
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
            Book the demo
          </Link>
        </div>
      </nav>
      <span className={styles["argos-progress"]} aria-hidden="true" />
    </header>
  );
}

function LandingHero() {
  return (
    <section className={styles["argos-hero"]} id="platform" aria-labelledby="hero-copy-heading">
      <div className={styles["argos-hero-frame"]}>
        <div className={styles["argos-hero-copy"]}>
          <p className={styles["argos-eyebrow"]}>
            <StarMark />
            {hero.eyebrow}
          </p>
          <h1 id="hero-copy-heading">
            The system <em>reveals all.</em>
          </h1>
          <p className={styles["argos-hero-body"]}>{hero.body}</p>
          <div className={styles["argos-hero-actions"]}>
            <PremiumButton href={hero.primaryCta.href}>{hero.primaryCta.label}</PremiumButton>
            <Link className={styles["argos-secondary-action"]} href={hero.secondaryCta.href}>
              {hero.secondaryCta.label}
            </Link>
          </div>
          <p className={styles["argos-hero-signature"]}>{hero.signature}</p>
        </div>

        <div className={styles["argos-hero-stage"]}>
          <figure className={styles["argos-hero-product"]} data-sheen>
            <div className={styles["argos-hero-product-chrome"]} aria-hidden="true">
              <span className={styles["argos-hero-product-status"]} />
              <span>Command view — live</span>
              <span>argosrevenuecommand.com</span>
            </div>
            <Image
              alt="Argos command dashboard showing the coaching attention queue for a sales team."
              className={styles["argos-hero-product-image"]}
              height={800}
              priority
              sizes="(max-width: 1024px) 94vw, 1024px"
              src="/homepage-product/argos-dashboard.png"
              width={1280}
            />
            <figcaption className="sr-only">
              The Argos manager dashboard with coaching flags, scores, and next moves.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function LandingCeiling() {
  return (
    <section
      aria-labelledby="argos-ceiling-heading"
      className={cx(styles["argos-section"], styles["argos-ceiling-section"])}
      id="coaching-system"
    >
      <SectionIntro index="01" label="The ceiling" />
      <blockquote className={styles["argos-pullquote"]}>
        <p>
          Founders who are still the primary closer have the same problem with different revenue
          numbers. The ceiling isn&rsquo;t effort — <em>it&rsquo;s architecture.</em>
        </p>
      </blockquote>

      <h2 className="sr-only" id="argos-ceiling-heading">
        Why coaching alone doesn&rsquo;t change the next call
      </h2>

      <div className={styles["argos-offer-grid"]}>
        {ceilingColumns.map((item) => (
          <article className={styles["argos-offer-card"]} data-sheen key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <p className={styles["argos-resolution"]}>
        The fix isn&rsquo;t another meeting. It&rsquo;s a sales team that actually follows the
        playbook — because the playbook lives in the work.
      </p>
    </section>
  );
}

function LandingCommandSurface() {
  return (
    <section
      aria-labelledby="argos-surface-heading"
      className={cx(styles["argos-section"], styles["argos-surface-section"])}
      id="product-in-motion"
    >
      <SectionIntro index="02" label="The command surface" />
      <div className={styles["argos-section-copy"]}>
        <h2 id="argos-surface-heading">
          Every revenue function. <em>One field of view.</em>
        </h2>
        <p>
          Separate tools create blind spots. Argos holds the whole revenue operation on one
          surface, so nothing important stays invisible.
        </p>
      </div>
      <LandingProductShowcase />
    </section>
  );
}

function LandingCoachingLoop() {
  return (
    <section
      aria-labelledby="argos-loop-heading"
      className={cx(styles["argos-section"], styles["argos-loop-section"])}
      id="coaching-loop"
    >
      <SectionIntro index="03" label="The operating loop" />
      <div className={styles["argos-section-copy"]}>
        <h2 id="argos-loop-heading">
          Teach the playbook. <em>Track the behavior.</em>
        </h2>
        <p>
          Coaching gives the team the standard. Argos turns that standard into the daily work
          managers and reps can see, score, assign, and practice.
        </p>
      </div>

      <ol className={styles["argos-feature-grid"]} id="platform-features">
        {coachingLoopSteps.map((step, index) => (
          <li className={styles["argos-feature-card"]} id={step.id} key={step.id}>
            <span className={styles["argos-feature-index"]} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className={styles["argos-feature-eyebrow"]}>{step.eyebrow}</p>
              <h3>{step.heading}</h3>
              <p className={styles["argos-feature-body"]}>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LandingInstallation() {
  return (
    <section
      aria-labelledby="argos-standard-heading"
      className={cx(styles["argos-section"], styles["argos-standard-section"])}
      id="standard-installation"
    >
      <SectionIntro index="04" label="The installation" />
      <div className={styles["argos-section-copy"]}>
        <h2 id="argos-standard-heading">
          Coaching becomes visible <em>when the team has to use it.</em>
        </h2>
      </div>

      <div className={styles["argos-standard-grid"]}>
        {standardInstallSteps.map((step, index) => (
          <article className={styles["argos-standard-card"]} data-sheen key={step.title}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LandingRoles() {
  return (
    <section
      aria-labelledby="argos-roles-heading"
      className={cx(styles["argos-section"], styles["argos-role-section"])}
      id="role-outcomes"
    >
      <SectionIntro index="05" label="Command, shared" />
      <div className={styles["argos-section-copy"]}>
        <h2 id="argos-roles-heading">
          Built for everyone <em>who carries the number.</em>
        </h2>
      </div>

      <div className={styles["argos-role-grid"]}>
        {roleCards.map((role) => (
          <article className={styles["argos-role-card"]} data-sheen key={role.title}>
            <span>{role.title}</span>
            <p>{role.body}</p>
          </article>
        ))}
      </div>

      <div className={styles["argos-answer-block"]}>
        <p className={styles["argos-answer-kicker"]}>Argos, in plain terms</p>
        <p className={styles["argos-answer-definition"]}>{PRODUCT_DEFINITION}</p>
        <dl aria-label="What Argos makes explicit">
          {answerPoints.map((point) => (
            <div key={point.title}>
              <dt>{point.title}</dt>
              <dd>{point.body}</dd>
            </div>
          ))}
        </dl>
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
      <div className={styles["argos-access-panel"]} data-sheen>
        <div className={styles["argos-demo-head"]}>
          <SectionIntro index="06" label="Access" />
          <h2 id="argos-demo-heading">
            See the system <em>running.</em>
          </h2>
          <p>The live product, walked through the way your team would use it every week.</p>
        </div>

        <div className={styles["argos-demo-grid"]}>
          <div className={styles["argos-demo-proof"]}>
            <span>The walkthrough covers</span>
            <ul>
              {demoProofPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <aside aria-label="Book an Argos demo" className={styles["argos-demo-booking"]}>
            <p>Thirty minutes. No deck — the live system and your questions.</p>
            <Link className={styles["argos-demo-button"]} href={demoBookingHref}>
              Book the demo
            </Link>
            <p className={styles["argos-demo-note"]}>Booked directly with the founding team.</p>
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
        <div className={styles["argos-footer-identity"]}>
          <div aria-label="Argos" className={styles["argos-footer-brand"]}>
            <ArgosLogo
              className={cx(styles["argos-wordmark"], styles["argos-footer-wordmark"])}
              decorative
              imageClassName={styles["argos-wordmark-image"]}
              placement="homepage-footer"
            />
          </div>
          <p className={styles["argos-footer-mission"]}>
            From founder-dependent to founder-free.
          </p>
          <p className={styles["argos-footer-legal"]}>
            Argos Revenue Command · Est. 2024 · All rights reserved.
          </p>
        </div>
        <LegalFooterLinks className="justify-center" />
        <a aria-label="Back to top" className={styles["argos-top-link"]} href="#top">
          &uarr;
        </a>
      </div>
    </footer>
  );
}

function SectionIntro({ index, label }: { index: string; label: string }) {
  return (
    <p className={styles["argos-section-marker"]}>
      <span>{index}</span>
      <span className={styles["argos-section-marker-line"]} aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}

function PremiumButton({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link className={styles["argos-primary-action"]} href={href}>
      <span>{children}</span>
      <span className={styles["argos-action-disc"]} aria-hidden="true">
        &rarr;
      </span>
    </Link>
  );
}

function StarMark() {
  return (
    <svg
      aria-hidden="true"
      className={styles["argos-star-mark"]}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M8 1.5C8 5 9.8 6.9 14.5 8 9.8 9.1 8 11 8 14.5 8 11 6.2 9.1 1.5 8 6.2 6.9 8 5 8 1.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1"
      />
    </svg>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
