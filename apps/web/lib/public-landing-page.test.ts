import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingPage } from "../components/public/landing-page";

describe("LandingPage", () => {
  it("renders the public homepage sections, updated integrations, and legal footer", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Intelligent Readiness");
    expect(html).toContain("Integrates with");
    expect(html).toContain("Ready Score");
    expect(html).toContain("AI Velocity");
    expect(html).toContain("Capture calls");
    expect(html).toContain("The Argos Operating Loop");
    expect(html).toContain("Engineered for");
    expect(html).toContain("Coaching Highlights");
    expect(html).toContain("Training Workspace");
    expect(html).toContain("AI Roleplay");
    expect(html).toContain("Rubric Control");
    expect(html).toContain("Strategic Outcomes for");
    expect(html).toContain("Give your sales team one place to");
    expect(html).toContain("Access platform");
    expect(html).toContain("Book a Demo");
    expect(html).toContain("Join 500+ high-growth revenue teams");
    expect(html).toContain("Privacy Policy");
    expect(html).toContain('id="platform"');
    expect(html).toContain('id="solutions"');
    expect(html).toContain('id="capabilities"');
    expect(html).toContain('aria-label="Zoom"');
    expect(html).toContain('aria-label="GoHighLevel"');
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain('href="/security-policy"');
    expect(html).toContain("© 2026 Argos Intelligence. All rights reserved.");
    expect(html).toContain('id="outcomes"');
    expect(html).toContain("glass-card");
    expect(html).toContain("text-glow");
    expect(html).toContain("gradient-bg");
  });
});
