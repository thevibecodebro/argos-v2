import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readAppSource(relativePath: string) {
  return readFileSync(new URL(`../../app/${relativePath}`, import.meta.url), "utf8");
}

describe("platform route pages", () => {
  it("redirects the platform landing route to the dashboard", () => {
    const source = readAppSource("platform/page.tsx");

    expect(source).toContain("redirect");
    expect(source).toContain('"/platform/dashboard"');
    expect(source).not.toContain("<PlatformConsole");
  });

  it("guards every platform workspace page with platform staff access", () => {
    const routePaths = [
      ["platform/dashboard/page.tsx", "/platform/dashboard", "PlatformDashboardPage"],
      ["platform/organizations/page.tsx", "/platform/organizations", "PlatformOrganizationsPage"],
      ["platform/organizations/new/page.tsx", "/platform/organizations/new", "PlatformCreateOrganizationPage"],
      ["platform/sessions/page.tsx", "/platform/sessions", "PlatformSessionsPage"],
      ["platform/staff/page.tsx", "/platform/staff", "PlatformStaffPage"],
    ] as const;

    for (const [filePath, pathname, componentName] of routePaths) {
      const source = readAppSource(filePath);

      expect(source).toContain("getPlatformPageContext");
      expect(source).toContain(`pathname: "${pathname}"`);
      expect(source).toContain(componentName);
      expect(source).toContain("<PlatformShell");
      expect(source).not.toContain("AuthenticatedAppChrome");
      expect(source).not.toContain("AuthenticatedAppShell");
      expect(source).not.toContain("@/components/app-shell");
      expect(source).not.toContain("getCachedCurrentUserProfile");
    }
  });

  it("keeps organization detail under the platform shell", () => {
    const source = readAppSource("platform/organizations/[slug]/page.tsx");

    expect(source).toContain("getPlatformPageContext");
    expect(source).toContain("getOrganizationDetailSnapshot");
    expect(source).toContain("<PlatformShell");
    expect(source).toContain("PlatformOrganizationDetailPage");
    expect(source).not.toContain("AuthenticatedAppChrome");
    expect(source).not.toContain("AuthenticatedAppShell");
    expect(source).not.toContain("@/components/app-shell");
  });

  it("keeps the shared platform page context behind platform staff access", () => {
    const source = readFileSync(
      new URL("../platform/page-context.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("requirePlatformStaffAccess");
    expect(source).toContain("createPlatformRepository");
    expect(source).toContain("getPlatformSessionCookieValue");
    expect(source).toContain("pathname");
  });

  it("provides a minimal MFA setup page with TOTP enrollment", () => {
    const source = readAppSource("platform/mfa/setup/page.tsx");

    expect(source).toContain("requirePlatformStaffAccess");
    expect(source).toContain('pathname: "/platform/mfa/setup"');
    expect(source).toContain("enrollPlatformTotp");
    expect(source).toContain("/platform/dashboard");
    expect(source).toContain("/platform/mfa/verify");
    expect(source).toContain("Set up multi-factor authentication");
  });

  it("provides a minimal MFA verification page using challengeAndVerify", () => {
    const source = readAppSource("platform/mfa/verify/page.tsx");

    expect(source).toContain("requirePlatformStaffAccess");
    expect(source).toContain('pathname: "/platform/mfa/verify"');
    expect(source).toContain("verifyPlatformTotpCode");
    expect(source).toContain("/platform/dashboard");
    expect(source).toContain("Verify multi-factor authentication");
  });
});
