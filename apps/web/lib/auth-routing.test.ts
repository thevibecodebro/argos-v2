import { describe, expect, it } from "vitest";
import {
  getAuthenticatedEntryHref,
  getLoginHref,
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

describe("getAuthenticatedEntryHref", () => {
  it("sends authenticated users without an organization to onboarding first", () => {
    expect(getAuthenticatedEntryHref(false)).toBe("/onboarding");
    expect(getAuthenticatedEntryHref(true)).toBe("/dashboard");
  });
});
