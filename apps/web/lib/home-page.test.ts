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
    expect(html).toContain("Sales standard installation + Argos platform");
    expect(html).toContain("Call review -&gt; Rubrics scored -&gt; Training assigned -&gt; Roleplay tracked -&gt; Manager dashboard");
    expect(html).toContain("Product in motion");
    expect(html).toContain("Operating feed");
    expect(html).toContain("Argos operating preview");
    expect(html).toContain("How The Standard Gets Installed");
    expect(html).toContain("The operating system");
    expect(html).toContain("Most sales coaching dies between meetings.");
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
    expect(html).toContain("For Owners");
    expect(html).toContain("For Managers");
    expect(html).toContain("For Reps");
    expect(html).toContain('href="#access"');
    expect(html).toContain("Book the coaching walkthrough");
    expect(html).not.toContain("Scored evidence");
    expect(html).not.toContain("Coaching moment");
    expect(html).not.toContain("Roleplay drill");
    expect(html).not.toContain("Next call");
    expect(html).not.toContain("Progress signal");
    expect(html).not.toContain("See whether the coaching changed the next call.");
    expect(html).toContain(">Log in</a>");
    expect(html).toContain(">Book demo</a>");
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
    expect(html).toContain("Book The Coaching Walkthrough");
    expect(html).not.toContain("Solo");
    expect(html).not.toContain("$79/month");
    expect(html).not.toContain("Enterprise");
    expect(html).not.toContain('action="/billing/checkout"');
  });
});
