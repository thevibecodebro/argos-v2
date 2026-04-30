import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import OnboardingPage from "../app/onboarding/page";
import * as onboardingPanelModule from "../components/onboarding-panel";

const onboardingPanelSource = readFileSync(new URL("../components/onboarding-panel.tsx", import.meta.url), "utf8");
const loginFormSource = readFileSync(new URL("../components/auth/login-form.tsx", import.meta.url), "utf8");

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

  it("announces auth and onboarding async feedback", () => {
    expect(onboardingPanelSource).toContain('role="alert"');
    expect(onboardingPanelSource).toContain('role="status"');
    expect(onboardingPanelSource).toContain('aria-live="polite"');
    expect(onboardingPanelSource).toContain("Creating organization.");
    expect(onboardingPanelSource).toContain("Joining organization.");
    expect(onboardingPanelSource).toContain("Sending invite.");
    expect(onboardingPanelSource).toContain("setIsMutating(false);");
    expect(loginFormSource).toContain('role="status"');
    expect(loginFormSource).toContain('Sending sign-in link.');
    expect(loginFormSource).toContain('Sign-in link sent.');
  });

  it("exports onboarding workflow constants used by the client flow", () => {
    const { ONBOARDING_ENDPOINTS, ONBOARDING_INVITE_ROLES } = onboardingPanelModule as {
      ONBOARDING_ENDPOINTS?: unknown;
      ONBOARDING_INVITE_ROLES?: unknown;
    };

    expect(ONBOARDING_ENDPOINTS).toEqual({
      createOrganization: "/api/organizations",
      dashboard: "/dashboard",
      invites: "/api/invites",
      joinOrganization: "/api/organizations/join",
      teams: "/api/teams",
    });
    expect(ONBOARDING_INVITE_ROLES).toEqual([
      { label: "Rep", teamAssignable: true, value: "rep" },
      { label: "Manager", teamAssignable: true, value: "manager" },
      { label: "Executive", teamAssignable: false, value: "executive" },
      { label: "Admin", teamAssignable: false, value: "admin" },
    ]);
  });
});
