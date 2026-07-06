import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingPage } from "../components/public/landing-page";
import { PRODUCT_DEFINITION } from "./seo/site";

describe("LandingPage", () => {
  it("renders the public landing page narrative, access model, and legal footer", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    // Brand shell
    expect(html).toContain("argos-3d-page");
    expect(html).toContain('data-argos-logo="homepage-nav"');
    expect(html).toContain('data-argos-logo="homepage-footer"');
    expect(html).toContain('src="/argos_logo_background.png"');

    // Hero — commanding, editorial, conversion-focused
    expect(html).toContain("Argos Revenue Command");
    expect(html).toContain("The system <em>reveals all.</em>");
    expect(html).toContain("We install the sales standard in your organization");
    expect(html).toContain("Every call reviewed. Every rep scored.");
    expect(html).toContain("Your revenue. Running without you.");
    expect(html).toContain("Book the demo");
    expect(html).toContain("See the system");

    // SEO answer block stays intact for crawlers and AI assistants
    expect(html).toContain(PRODUCT_DEFINITION);
    expect(html).toContain('aria-label="What Argos makes explicit"');
    expect(html).toContain("Who it is for");
    expect(html).toContain("Sales managers and leaders who need coaching tied to real calls.");
    expect(html).toContain("How the loop works");
    expect(html).toContain(
      "A call becomes scored evidence, a coaching action, a roleplay drill, and a next-call progress signal.",
    );
    expect(html).toContain("What managers see");
    expect(html).toContain(
      "The transcript, scorecard evidence, training assignment, and behavior trend stay connected.",
    );

    // 01 — the ceiling
    expect(html).toContain("The ceiling isn’t effort");
    expect(html).toContain("it’s architecture.");
    expect(html).toContain("Most teams leave the meeting nodding.");
    expect(html).toContain("managers are stuck guessing what actually changed.");
    expect(html).toContain("The coaching sets the standard. Argos reinforces it in the work.");
    expect(html).toContain("a sales team that actually follows the");
    expect(html).toContain("playbook");

    // 02 — command surface: all eight real product views
    expect(html).toContain("Every revenue function.");
    expect(html).toContain('aria-label="Argos product areas"');
    expect(html).toContain("argos-dashboard.png");
    expect(html).toContain("argos-calls.png");
    expect(html).toContain("argos-scorecard.png");
    expect(html).toContain("argos-highlights.png");
    expect(html).toContain("argos-training.png");
    expect(html).toContain("argos-roleplay.png");
    expect(html).toContain("argos-team.png");
    expect(html).toContain("argos-leaderboard.png");
    expect(html).toContain('aria-label="Show Dashboard"');
    expect(html).toContain('aria-label="Show Calls"');
    expect(html).toContain('aria-label="Show Scorecards"');
    expect(html).toContain('aria-label="Show Highlights"');
    expect(html).toContain('aria-label="Show Training"');
    expect(html).toContain('aria-label="Show Roleplay"');
    expect(html).toContain('aria-label="Show Team"');
    expect(html).toContain('aria-label="Show Leaderboard"');
    expect(html).toContain("Previous product view");
    expect(html).toContain("Next product view");
    expect(html).toContain("Know where to coach");

    // 03 — the operating loop: six steps, verbatim system copy
    expect(Array.from(html.matchAll(/argos-feature-card/g))).toHaveLength(6);
    expect(html).toContain("Teach the playbook.");
    expect(html).toContain("Track the behavior.");
    expect(html).toContain("Call review");
    expect(html).toContain("Scorecards and rubrics");
    expect(html).toContain("Team coaching flags");
    expect(html).toContain("Training assignments");
    expect(html).toContain("Roleplay practice");
    expect(html).toContain("Manager dashboards");
    expect(html).toContain("Turn real conversations into coaching context.");
    expect(html).toContain(
      "Upload recordings or connect Zoom so real conversations become reviewable records for managers and reps.",
    );
    expect(html).toContain("Make the playbook measurable.");
    expect(html).toContain("Score calls against the sales standard");
    expect(html).toContain("Show managers where to focus.");
    expect(html).toContain("Managers see who needs attention");

    // 04 — the installation
    expect(html).toContain("Coaching becomes visible");
    expect(html).toContain("Install the sales standard");
    expect(html).toContain("Argos scores real calls against it");
    expect(html).toContain("Managers reinforce it every week");

    // 05 — roles
    expect(html).toContain("For Owners");
    expect(html).toContain("For Managers");
    expect(html).toContain("For Reps");

    // 06 — access
    expect(html).toContain("See the system <em>running.</em>");
    expect(html).toContain("The live product, walked through the way your team would use it every week.");
    expect(html).toContain("The walkthrough covers");
    expect(html).toContain("Custom scorecards");
    expect(html).toContain("Training workflow");
    expect(html).toContain('href="https://calendar.app.google/RSBtSGHYRSxmcs717"');

    // Navigation — anchor order mirrors the page narrative
    expect(html).toContain(">Log in</a>");
    const navOrder = [
      'href="#product-in-motion"',
      'href="#coaching-system"',
      'href="#access"',
    ];
    let lastNavIndex = -1;
    for (const navHref of navOrder) {
      const navIndex = html.indexOf(navHref);
      expect(navIndex).toBeGreaterThan(lastNavIndex);
      lastNavIndex = navIndex;
    }
    expect(html).toContain(">Product</a>");
    expect(html).toContain(">System</a>");
    // The nav stays minimal: no jargon anchors, no duplicate demo link.
    expect(html).not.toContain(">Loop</a>");
    expect(html).not.toContain(">Installation</a>");
    expect(html).not.toContain(">Roles</a>");
    expect(html).not.toContain(">Demo</a>");

    // Section anchors used by nav and by the auth shell deep links
    expect(html).toContain('id="platform"');
    expect(html).toContain('id="product-in-motion"');
    expect(html).toContain('id="coaching-system"');
    expect(html).toContain('id="coaching-loop"');
    expect(html).toContain('id="platform-features"');
    expect(html).toContain('id="standard-installation"');
    expect(html).toContain('id="role-outcomes"');
    expect(html).toContain('id="access"');

    // Footer + legal
    expect(html).toContain("From founder-dependent to founder-free.");
    expect(html).toContain("Est. 2024");
    expect(html).toContain("Privacy Policy");
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain('href="/security-policy"');

    // Guardrails — retired concepts must not resurface
    expect(html).not.toContain("Founder review");
    expect(html).not.toContain("1:1 founder review");
    expect(html).not.toContain("For Founders");
    expect(html.toLowerCase()).not.toContain("fathom");
    expect(html).not.toContain("AI notetaking");
    expect(html).not.toContain("AI note-taking");
    expect(html).not.toContain("$79/month");
    expect(html).not.toContain("$50/seat/month");
    expect(html).not.toContain("Custom pricing");
    expect(html).not.toContain('action="/billing/checkout"');
    expect(html).not.toContain("Billing cadence");
    expect(html).not.toContain("Continue to checkout");
    expect(html).not.toContain(">Trial<");
    expect(html).not.toContain("Ready Score");
    expect(html).not.toContain("Video placeholder");
    expect(html).not.toContain("hustle");
  });
});
