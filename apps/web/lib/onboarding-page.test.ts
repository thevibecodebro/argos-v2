import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import OnboardingPage from "../app/onboarding/page";

const onboardingPanelSource = readFileSync(
  new URL("../components/onboarding-panel.tsx", import.meta.url),
  "utf8",
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/font/google", () => ({
  Manrope: () => ({
    className: "",
    style: { fontFamily: "Manrope" },
    variable: "--font-manrope",
  }),
}));

describe("OnboardingPage", () => {
  it("renders the create-or-join organization flow in the Forge auth shell", async () => {
    const html = renderToStaticMarkup(await OnboardingPage());

    expect(html).toContain("Welcome to Argos");
    expect(html).toContain("Create Organization");
    expect(html).toContain("Join Organization");
    expect(html).toContain('data-auth-shell="forge"');
    expect(html).toContain("forge-surface");
    expect(html).toContain("forge-focus-ring");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
  });

  it("preserves onboarding endpoints, invite roles, team picker, and dashboard routing", () => {
    expect(onboardingPanelSource).toContain('submit("/api/organizations"');
    expect(onboardingPanelSource).toContain('submit("/api/organizations/join"');
    expect(onboardingPanelSource).toContain('fetch("/api/teams")');
    expect(onboardingPanelSource).toContain('fetch("/api/invites"');
    expect(onboardingPanelSource).toContain('router.push("/dashboard")');
    expect(onboardingPanelSource).toContain('value="rep"');
    expect(onboardingPanelSource).toContain('value="manager"');
    expect(onboardingPanelSource).toContain('value="executive"');
    expect(onboardingPanelSource).toContain('value="admin"');
    expect(onboardingPanelSource).toContain("inviteTeamIds");
    expect(onboardingPanelSource).toContain("forge-form-control");
  });
});
