import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingPage } from "../components/public/landing-page";

describe("LandingPage", () => {
  it("renders the Argos workflow, capability proof, and closing CTA sections", () => {
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
  });
});
