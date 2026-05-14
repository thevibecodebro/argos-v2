import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AuthErrorPage from "../app/auth/error/page";
import PrivacyPolicyPage from "../app/privacy-policy/page";
import SecurityPolicyPage from "../app/security-policy/page";
import TermsOfServicePage from "../app/terms-of-service/page";

describe("legal pages", () => {
  it("renders the privacy policy page", () => {
    const html = renderToStaticMarkup(PrivacyPolicyPage());

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("Last updated April 22, 2026");
    expect(html).toContain("What we collect");
    expect(html).toContain("forge-shell");
    expect(html).toContain("2026 Argos Revenue Command. All rights reserved.");
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain('href="/security-policy"');
    expect(html).not.toContain("#74b1ff");
  });

  it("renders the terms of service page", () => {
    const html = renderToStaticMarkup(TermsOfServicePage());

    expect(html).toContain("Terms of Service");
    expect(html).toContain("Last updated April 22, 2026");
    expect(html).toContain("Permitted use");
    expect(html).toContain("forge-shell");
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/security-policy"');
    expect(html).not.toContain("#74b1ff");
  });

  it("renders the security policy page", () => {
    const html = renderToStaticMarkup(SecurityPolicyPage());

    expect(html).toContain("Security Policy");
    expect(html).toContain("Last updated April 22, 2026");
    expect(html).toContain("Infrastructure safeguards");
    expect(html).toContain("forge-shell");
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).not.toContain("#74b1ff");
  });

  it("renders the auth error page with Forge styling and the same return action", () => {
    const html = renderToStaticMarkup(AuthErrorPage());

    expect(html).toContain("Auth Error");
    expect(html).toContain("The sign-in callback did not complete.");
    expect(html).toContain("Return to login");
    expect(html).toContain('href="/login"');
    expect(html).toContain("forge-shell");
    expect(html).toContain("forge-focus-ring");
    expect(html).not.toContain("bg-slate-950");
    expect(html).not.toContain("#74b1ff");
  });
});
