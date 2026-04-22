import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingPage } from "../components/public/landing-page";

describe("LandingPage", () => {
  it("renders the Argos workflow, capability proof, integration strip, and legal footer", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Capture calls");
    expect(html).toContain("Score performance");
    expect(html).toContain("Coaching Highlights");
    expect(html).toContain("Training Workspace");
    expect(html).toContain("AI Roleplay");
    expect(html).toContain("Rubric Control");
    expect(html).toContain('id="system"');
    expect(html).toContain('id="capabilities"');
    expect(html).toContain("Start with Argos");
    expect(html).toContain("Integrates with");
    expect(html).toContain('aria-label="Zoom"');
    expect(html).toContain('aria-label="GoHighLevel"');
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain('href="/security-policy"');
    expect(html).toContain("© 2026 Argos Intelligence. All rights reserved.");
  });
});
