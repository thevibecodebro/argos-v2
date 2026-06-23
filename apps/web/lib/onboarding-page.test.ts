import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "../app/onboarding/page";
import * as onboardingPanelModule from "../components/onboarding-panel";

const onboardingPanelSource = readFileSync(new URL("../components/onboarding-panel.tsx", import.meta.url), "utf8");
const loginFormSource = readFileSync(new URL("../components/auth/login-form.tsx", import.meta.url), "utf8");

const {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
  redirect,
} = vi.hoisted(() => ({
  getCachedAuthenticatedSupabaseUser: vi.fn(),
  getCachedCurrentUserProfile: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/request-user", () => ({
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
}));

vi.mock("next/navigation", () => ({
  redirect,
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
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    getCachedCurrentUserProfile.mockResolvedValue({
      id: "user-1",
      email: "rep@example.com",
      role: null,
      fullName: "Rep User",
      org: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders an invite-required state for ordinary orgless users in invite-only mode", async () => {
    const html = renderToStaticMarkup(await OnboardingPage());

    expect(html).toContain("Welcome to Argos");
    expect(html).toContain("Workspace readiness");
    expect(html).toContain("Identity verified");
    expect(html).toContain("Workspace access");
    expect(html).toContain("Team launch");
    expect(html).toContain("Account verified");
    expect(html).toContain("Joining an existing workspace?");
    expect(html).toContain("Ask your admin to send an invite to rep@example.com.");
    expect(html).toContain("Joining a team");
    expect(html).toContain("Start an organization");
    expect(html).toContain("View plans");
    expect(html).toContain('href="/#access"');
    expect(html).toContain('action="/auth/signout"');
    expect(html).toContain('method="post"');
    expect(html).not.toContain('href="/auth/signout"');
    expect(html).not.toContain("Create Organization");
    expect(html).not.toContain("Join Organization");
    expect(html).not.toContain("Revenue Command");
    expect(html).toContain('data-auth-shell="forge"');
    expect(html).toContain("forge-surface");
    expect(html).toContain("forge-focus-ring");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
  });

  it("shows the create flow only for bootstrap admins in invite-only mode", async () => {
    vi.stubEnv("ARGOS_BOOTSTRAP_ADMIN_EMAILS", "owner@example.com");
    getCachedCurrentUserProfile.mockResolvedValueOnce({
      id: "user-1",
      email: "owner@example.com",
      role: null,
      fullName: "Owner User",
      org: null,
    });

    const html = renderToStaticMarkup(await OnboardingPage());

    expect(html).toContain("Create Organization");
    expect(html).toContain("Create workspace");
    expect(html).toContain("Organization Slug");
    expect(html).not.toContain("Join Organization");
    expect(html).toContain("Set up the first Argos workspace for your company.");
  });

  it("keeps organization creation available without exposing slug-only joins when invite-only mode is explicitly disabled", async () => {
    vi.stubEnv("ARGOS_INVITE_ONLY", "false");

    const html = renderToStaticMarkup(await OnboardingPage());

    expect(html).toContain("Create Organization");
    expect(html).toContain("Create a new workspace, then invite your team to unlock the Argos workspace.");
    expect(html).toContain("Invite required for existing organizations");
    expect(html).not.toContain("Join Organization");
  });

  it("announces auth and onboarding async feedback", () => {
    expect(onboardingPanelSource).toContain("ForgeErrorState");
    expect(onboardingPanelSource).toContain("ForgeStatusPanel");
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
