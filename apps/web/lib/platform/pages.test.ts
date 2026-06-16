import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readAppSource(relativePath: string) {
  return readFileSync(new URL(`../../app/${relativePath}`, import.meta.url), "utf8");
}

describe("platform route pages", () => {
  it("guards the platform landing route with platform staff access", () => {
    const source = readAppSource("platform/page.tsx");

    expect(source).toContain("requirePlatformStaffAccess");
    expect(source).toContain('pathname: "/platform"');
    expect(source).toContain("createPlatformRepository");
    expect(source).toContain("getPlatformSessionCookieValue");
    expect(source).toContain("repository.listOrganizations");
    expect(source).toContain("repository.listStaff");
    expect(source).toContain("<PlatformConsole");
    expect(source).not.toContain("AuthenticatedAppChrome");
    expect(source).not.toContain("AuthenticatedAppShell");
    expect(source).not.toContain("@/components/app-shell");
    expect(source).not.toContain("getCachedCurrentUserProfile");
  });

  it("provides a minimal MFA setup page with TOTP enrollment", () => {
    const source = readAppSource("platform/mfa/setup/page.tsx");

    expect(source).toContain("requirePlatformStaffAccess");
    expect(source).toContain('pathname: "/platform/mfa/setup"');
    expect(source).toContain("enrollPlatformTotp");
    expect(source).toContain("/platform/mfa/verify");
    expect(source).toContain("Set up multi-factor authentication");
  });

  it("provides a minimal MFA verification page using challengeAndVerify", () => {
    const source = readAppSource("platform/mfa/verify/page.tsx");

    expect(source).toContain("requirePlatformStaffAccess");
    expect(source).toContain('pathname: "/platform/mfa/verify"');
    expect(source).toContain("verifyPlatformTotpCode");
    expect(source).toContain("Verify multi-factor authentication");
  });
});
