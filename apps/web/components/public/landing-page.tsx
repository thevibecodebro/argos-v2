import Link from "next/link";
import type { ReactNode } from "react";
import { ArgosLogo } from "@/components/argos-logo";
import { LegalFooterLinks } from "./legal-links";
import styles from "./landing-page.module.css";

const navLinks = [
  { label: "Loop", href: "#coaching-loop" },
  { label: "Command", href: "#argos-command" },
  { label: "Practice", href: "#next-call" },
  { label: "Demo", href: "#access" },
] as const;

const salesEvolutionHero = {
  body: "Argos turns real sales calls into scored evidence, focused coaching, and roleplay practice for the next conversation.",
  headline: "Sales teams changed. Coaching should have too.",
  primaryCta: { href: "/login", label: "Launch platform" },
  secondaryCta: { href: "#coaching-loop", label: "See the loop" },
} as const;

const coachingLoopSteps = [
  {
    body: "Upload a Zoom call or recording. Argos keeps the transcript, speaker labels, notes, and key moments in one review workspace.",
    eyebrow: "Call review",
    heading: "Bring the real conversation into one record.",
    id: "coaching-loop",
    sceneKey: "call-review",
  },
  {
    body: "Score the conversation against the team's rubric so feedback starts from evidence, not memory or loose interpretation.",
    eyebrow: "Scored evidence",
    heading: "Make the coaching standard repeatable.",
    id: "scored-evidence",
    sceneKey: "scored-evidence",
  },
  {
    body: "Managers see the timestamp, category, observation, and recommended action without replaying an hour of audio.",
    eyebrow: "Coaching moment",
    heading: "Find the few moments worth coaching.",
    id: "coaching-moment",
    sceneKey: "coaching-moment",
  },
  {
    body: "Turn the gap into a focused practice drill tied to the actual call, not a generic training prompt.",
    eyebrow: "Roleplay drill",
    heading: "Practice the exact behavior that needs to change.",
    id: "roleplay-drill",
    sceneKey: "roleplay-drill",
  },
  {
    body: "The rep rehearses the fix before the next conversation, then the next real call starts the loop again.",
    eyebrow: "Next call",
    heading: "Coaching becomes behavior before it matters.",
    id: "next-call",
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

const demoBookingHref = "https://calendar.app.google/RSBtSGHYRSxmcs717";

const demoProofPoints = [
  "Call review",
  "Scorecard",
  "Roleplay drill",
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
        <LandingCoachingLoop />
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
          <Link aria-label="Book an Argos demo" className={styles["argos-mini-cta"]} href="#access">
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
            <span>ARGOS_COMMAND // COACHING_LOOP</span>
            <strong>call in, drill out</strong>
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

function LandingCoachingLoop() {
  return (
    <section className={styles["argos-section"]} aria-label="Argos coaching loop">
      <div className={styles["argos-section-copy"]}>
        <p className={styles["argos-eyebrow"]}>The coaching loop</p>
        <h2>One real call should create the next useful coaching rep.</h2>
        <p>
          Keep the opener broad, then make the product obvious: call review, scored evidence,
          coaching moment, roleplay drill, next call.
        </p>
      </div>

      <div className={styles["argos-feature-grid"]}>
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
              <br />
              {step.body}
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
        <span>CALL REVIEW // SCORED EVIDENCE // COACHING MOMENT // ROLEPLAY DRILL // NEXT CALL</span>
        <span>CALL REVIEW // SCORED EVIDENCE // COACHING MOMENT // ROLEPLAY DRILL // NEXT CALL</span>
      </div>
    </section>
  );
}

function LandingCommandRoom() {
  return (
    <section className={styles["argos-infrastructure-section"]} id="argos-command">
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
      aria-labelledby="argos-demo-heading"
      className={cx(styles["argos-section"], styles["argos-access-section"])}
      id="access"
    >
      <div className={styles["argos-access-panel"]}>
        <div className={styles["argos-demo-head"]}>
          <p className={styles["argos-eyebrow"]}>Product demo</p>
          <h2 id="argos-demo-heading">See Argos in action.</h2>
          <p>
            Watch a real call move from review to scorecard to roleplay, then book a guided
            walkthrough for your team.
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
              Book A Demo
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
