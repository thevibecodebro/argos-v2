import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../app/page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("HomePage", () => {
  it("renders the public landing page without redirecting to login and includes the 3D access content", async () => {
    const html = renderToStaticMarkup(await HomePage());
    const coachingCardCount = Array.from(html.matchAll(/data-scene-key=/g)).length;

    expect(coachingCardCount).toBe(6);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain('data-argos-logo="homepage-nav"');
    expect(html).toContain('data-argos-logo="homepage-footer"');
    expect(html).toContain('src="/argos_logo_background.png"');
    expect(html).toContain("Build a sales team that actually follows the playbook.");
    expect(html).not.toContain("Sales standard installation + Argos platform");
    expect(html).not.toContain("Call review -&gt; Rubrics scored -&gt; Training assigned -&gt; Roleplay tracked -&gt; Manager dashboard");
    expect(html).toContain('aria-label="Argos product coaching walkthrough"');
    expect(html).not.toContain("Every call should become the next coaching move.");
    expect(html).toContain('aria-label="Argos product showcase"');
    expect(html).toContain('data-product-showcase="product-screenshot-carousel"');
    expect(Array.from(html.matchAll(/data-showcase-slide=/g))).toHaveLength(8);
    expect(html).toContain("/homepage-product/argos-dashboard.png");
    expect(html).toContain("/homepage-product/argos-calls.png");
    expect(html).toContain("/homepage-product/argos-scorecard.png");
    expect(html).toContain("/homepage-product/argos-highlights.png");
    expect(html).toContain("/homepage-product/argos-training.png");
    expect(html).toContain("/homepage-product/argos-roleplay.png");
    expect(html).toContain("/homepage-product/argos-team.png");
    expect(html).toContain("/homepage-product/argos-leaderboard.png");
    expect(html).not.toContain("/homepage-product/argos-dashboard-workspace.png");
    expect(html).not.toContain("/homepage-product/argos-dashboard-queue.png");
    expect(html).not.toContain("/homepage-product/argos-dashboard-selected.png");
    expect(html).not.toContain("/homepage-product/argos-dashboard-actions.png");
    expect(html).not.toContain("Argos turns reviewed sales calls into visible coaching moves");
    expect(html).not.toContain("what to practice before the next live call");
    expect(html).toContain("Previous product view");
    expect(html).toContain("Next product view");
    expect(html).not.toContain("Operating feed");
    expect(html).not.toContain("Animated operating feed cards");
    expect(html).not.toContain("Animated operating feed carousel");
    expect(html).not.toContain('data-operating-card="true"');
    expect(html).not.toContain("Sample workflow, not customer data.");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Calls");
    expect(html).toContain("Call review");
    expect(html).toContain("Scorecards");
    expect(html).toContain("Highlights");
    expect(html).toContain("Training");
    expect(html).toContain("Roleplay");
    expect(html).toContain("Team");
    expect(html).toContain("Leaderboard");
    expect(html).toContain("Know where to coach");
    expect(html).toContain("before the week gets away.");
    expect(html).toContain("Start with the conversations");
    expect(html).toContain("your team actually had.");
    expect(html).toContain("Pull out the moment");
    expect(html).toContain("every manager should coach.");
    expect(html).toContain("Practice the pushback");
    expect(html).toContain("before the next live call.");
    expect(html).toContain("See who needs help");
    expect(html).toContain("without hunting through calls.");
    expect(html).toContain("Track whether the standard");
    expect(html).toContain("is spreading across the team.");
    expect(html).not.toContain("Authenticated product screenshot");
    expect(html).not.toContain("Dashboard workspace");
    expect(html).not.toContain("Work queue");
    expect(html).not.toContain("Selected item");
    expect(html).not.toContain("Manager action");
    expect(html).not.toContain("One call becomes five visible handoffs.");
    expect(html).not.toContain("Product in motion");
    expect(html).not.toContain("Argos operating preview");
    expect(html).not.toContain("Live operating loop");
    expect(html).not.toContain("Watch one call become the next coaching action.");
    expect(html).toContain("How The Standard Gets Installed");
    expect(html).toContain("The operating system");
    expect(html).toContain("Coaching only counts if it changes the next call.");
    expect(html).toContain("Most teams leave the meeting nodding.");
    expect(html).toContain("managers are stuck guessing what actually changed.");
    expect(html).not.toContain("Most sales coaching dies between meetings.");
    expect(html).toContain("Teach the playbook. Track the behavior.");
    expect(html).not.toContain("Sales standard system");
    expect(html).not.toContain("Install the standard once. Keep the team honest every week.");
    expect(html).not.toContain("CALL REVIEW // SCORECARDS AND RUBRICS");
    expect(html).not.toContain("argos-metric-row");
    expect(html).toContain("Call review");
    expect(html).toContain("Scorecards and rubrics");
    expect(html).toContain("Training assignments");
    expect(html).toContain("Roleplay practice");
    expect(html).toContain("Manager dashboards");
    expect(html).not.toContain("Zoom and GoHighLevel");
    expect(html).not.toContain('data-scene-key="integrations"');
    expect(html).toContain("Turn real conversations into coaching context.");
    expect(html).toContain("Upload recordings or connect Zoom so real conversations become reviewable records for managers and reps.");
    expect(html).toContain("Make the playbook measurable.");
    expect(html).toContain("Managers see who needs attention");
    expect(html).not.toContain("Transcript highlight:");
    expect(html).not.toContain("Score movement:");
    expect(html).toContain("For Owners");
    expect(html).toContain("For Managers");
    expect(html).toContain("For Reps");
    expect(html).toContain('href="#access"');
    expect(html).toContain("Book Demo");
    expect(html).not.toContain("Book the coaching walkthrough");
    expect(html).not.toContain("Scored evidence");
    expect(html).not.toContain("Coaching moment");
    expect(html).not.toContain("Roleplay drill");
    expect(html).not.toContain("Next call");
    expect(html).not.toContain("Progress signal");
    expect(html).not.toContain("See whether the coaching changed the next call.");
    expect(html).toContain(">Log in</a>");
    expect(html).toContain(">Book Demo</a>");
    const navOrder = [
      'href="#product-in-motion"',
      'href="#coaching-system"',
      'href="#standard-installation"',
      'href="#coaching-loop"',
      'href="#role-outcomes"',
      'href="#access"',
    ];
    let lastNavIndex = -1;
    for (const navHref of navOrder) {
      const navIndex = html.indexOf(navHref);
      expect(navIndex).toBeGreaterThan(lastNavIndex);
      lastNavIndex = navIndex;
    }
    expect(html).not.toContain(">Access</a>");
    expect(html).not.toContain("Launch platform");
    expect(html).not.toContain("Sales teams changed. Coaching should have too.");
    expect(html).not.toContain("Your next coaching session is hiding in your last sales call.");
    expect(html).not.toContain("Founder review");
    expect(html).not.toContain("1:1 founder review");
    expect(html).not.toContain("Founder-led sales coaching + Argos platform");
    expect(html).not.toContain("The founder teaches the standard");
    expect(html).not.toContain("Founder teaches the standard");
    expect(html).not.toContain("For Founders");
    expect(html).not.toContain("Forge a sharper sales force with call intelligence.");
    expect(html).not.toContain("Coaching by memory");
    expect(html).not.toContain("Pipeline goes digital");
    expect(html).not.toContain("Turn every sales call into the next coaching loop.");
    expect(html.toLowerCase()).not.toContain("fathom");
    expect(html).not.toContain("Founder reviews calls");
    expect(html).toContain('id="platform"');
    expect(html).toContain('id="product-in-motion"');
    expect(html).toContain('id="coaching-system"');
    expect(html).toContain('id="standard-installation"');
    expect(html).toContain('id="coaching-loop"');
    expect(html).toContain('id="platform-features"');
    expect(html).toContain('id="role-outcomes"');
    expect(html).not.toContain('id="sales-standard"');
    expect(html).not.toContain('id="progress-signal"');
    expect(html).toContain('href="#access"');
    expect(html).toContain("Want to see how the coaching system works inside Argos?");
    expect(html).toContain("Demo video");
    expect(html).toContain("Book Demo");
    expect(html).not.toContain("Book The Coaching Walkthrough");
    expect(html).not.toContain("Solo");
    expect(html).not.toContain("$79/month");
    expect(html).not.toContain("Enterprise");
    expect(html).not.toContain('action="/billing/checkout"');
  });
});
