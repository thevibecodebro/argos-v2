import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../app/page";
import { PRODUCT_DEFINITION } from "./seo/site";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("HomePage", () => {
  it("renders the public landing page without redirecting to login", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain('data-argos-logo="homepage-nav"');
    expect(html).toContain('data-argos-logo="homepage-footer"');
    expect(html).toContain('src="/argos_logo_background.png"');

    // Hero narrative
    expect(html).toContain("The system <em>reveals all.</em>");
    expect(html).toContain("We install the sales standard in your organization");
    expect(html).toContain("Your revenue. Running without you.");
    expect(html).toContain(PRODUCT_DEFINITION);
    expect(html).toContain('aria-label="What Argos makes explicit"');

    // Product showcase carries all eight real product views
    expect(html).toContain("argos-dashboard.png");
    expect(html).toContain("argos-calls.png");
    expect(html).toContain("argos-scorecard.png");
    expect(html).toContain("argos-highlights.png");
    expect(html).toContain("argos-training.png");
    expect(html).toContain("argos-roleplay.png");
    expect(html).toContain("argos-team.png");
    expect(html).toContain("argos-leaderboard.png");
    expect(html).toContain("Previous product view");
    expect(html).toContain("Next product view");

    // System narrative
    expect(html).toContain("Most teams leave the meeting nodding.");
    expect(html).toContain("The coaching sets the standard. Argos reinforces it in the work.");
    expect(html).toContain("Teach the playbook.");
    expect(html).toContain("Track the behavior.");
    expect(Array.from(html.matchAll(/argos-feature-card/g))).toHaveLength(6);
    expect(html).toContain("Install the sales standard");
    expect(html).toContain("Argos scores real calls against it");
    expect(html).toContain("Managers reinforce it every week");
    expect(html).toContain("For Owners");
    expect(html).toContain("For Managers");
    expect(html).toContain("For Reps");

    // Conversion
    expect(html).toContain("Book the demo");
    expect(html).toContain('href="https://calendar.app.google/RSBtSGHYRSxmcs717"');
    expect(html).toContain(">Log in</a>");

    // Anchors used by nav and the auth shell deep links
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
    expect(html).toContain('id="platform"');
    expect(html).toContain('id="product-in-motion"');
    expect(html).toContain('id="coaching-system"');
    expect(html).toContain('id="coaching-loop"');
    expect(html).toContain('id="platform-features"');
    expect(html).toContain('id="standard-installation"');
    expect(html).toContain('id="role-outcomes"');
    expect(html).toContain('id="access"');

    // Retired concepts must not resurface
    expect(html).not.toContain("Founder review");
    expect(html).not.toContain("For Founders");
    expect(html.toLowerCase()).not.toContain("fathom");
    expect(html).not.toContain("$79/month");
    expect(html).not.toContain('action="/billing/checkout"');
  });
});
