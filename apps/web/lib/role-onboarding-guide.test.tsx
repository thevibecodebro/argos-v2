import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoleOnboardingGuide } from "../components/role-onboarding-guide";

function renderGuide(role: "admin" | "manager" | "rep", currentPath = "/dashboard") {
  return renderToStaticMarkup(createElement(RoleOnboardingGuide, {
    role, currentPath, userId: "guide-user", replaySignal: 0,
  }));
}

describe("role onboarding guide", () => {
  it("keeps the launch title and primary action ahead of collapsed supporting steps", () => {
    const html = renderGuide("admin");
    const disclosure = html.indexOf("<details");
    expect(disclosure).toBeGreaterThan(0);
    expect(html.indexOf("Workspace launch guide")).toBeLessThan(disclosure);
    expect(html.indexOf("Invite team</span>")).toBeLessThan(disclosure);
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
    expect(html).toContain("Explore the guide");
    for (const href of ["/settings/people", "/settings/rubric", "/settings/integrations", "/upload"]) {
      expect(html.slice(disclosure)).toContain(`href="${href}"`);
    }
  });

  it("retains role-specific links without exposing admin setup to reps", () => {
    const rep = renderGuide("rep");
    expect(rep).toContain('href="/roleplay"');
    expect(rep).toContain('href="/training"');
    expect(rep).not.toContain('href="/settings/people"');
    const manager = renderGuide("manager");
    expect(manager).toContain('href="/training/team"');
    expect(manager).toContain('href="/team"');
  });

  it("does not show unsolicited guidance away from the dashboard", () => {
    expect(renderGuide("admin", "/calls")).toBe("");
  });
});
