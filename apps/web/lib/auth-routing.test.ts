import { describe, expect, it } from "vitest";
import {
  getAuthenticatedEntryHref,
  getLoginHref,
  getSafeNextPath,
  isProtectedPath,
} from "./auth-routing";

describe("isProtectedPath", () => {
  it("protects every authenticated product route", () => {
    const protectedRoutes = [
      "/dashboard",
      "/calls",
      "/calls/call_123",
      "/upload",
      "/leaderboard",
      "/team",
      "/team/user_123",
      "/roleplay",
      "/training",
      "/highlights",
      "/settings",
      "/notifications",
      "/onboarding",
      "/platform",
      "/platform/dashboard",
      "/platform/organizations",
      "/platform/organizations/new",
      "/platform/sessions",
      "/platform/staff",
      "/platform/mfa/setup",
      "/platform/mfa/verify",
    ];

    for (const route of protectedRoutes) {
      expect(isProtectedPath(route)).toBe(true);
    }
  });

  it("does not protect public routes", () => {
    const publicRoutes = ["/", "/login", "/auth/callback", "/auth/error", "/api/health"];

    for (const route of publicRoutes) {
      expect(isProtectedPath(route)).toBe(false);
    }
  });
});

describe("getLoginHref", () => {
  it("preserves the requested path and query string", () => {
    expect(getLoginHref("/dashboard/calls", "?filter=mine")).toBe(
      "/login?next=%2Fdashboard%2Fcalls%3Ffilter%3Dmine",
    );
  });
});

describe("getSafeNextPath", () => {
  it("keeps app-local next paths and rejects external destinations", () => {
    expect(getSafeNextPath("/platform/dashboard")).toBe("/platform/dashboard");
    expect(getSafeNextPath("/platform/dashboard?tab=staff")).toBe(
      "/platform/dashboard?tab=staff",
    );
    expect(getSafeNextPath("https://evil.example/platform")).toBe("/dashboard");
    expect(getSafeNextPath("//evil.example/platform")).toBe("/dashboard");
    expect(getSafeNextPath(null)).toBe("/dashboard");
  });
});

describe("getAuthenticatedEntryHref", () => {
  it("sends authenticated users without an organization to onboarding first", () => {
    expect(getAuthenticatedEntryHref(false)).toBe("/onboarding");
    expect(getAuthenticatedEntryHref(true)).toBe("/dashboard");
  });

  it("sends active platform staff without an organization to the platform entry point", () => {
    expect(getAuthenticatedEntryHref(false, { isActivePlatformStaff: true })).toBe("/platform/dashboard");
    expect(getAuthenticatedEntryHref(false, { isActivePlatformStaff: false })).toBe("/onboarding");
  });
});
