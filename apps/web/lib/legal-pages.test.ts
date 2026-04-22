import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "../app/privacy-policy/page";
import SecurityPolicyPage from "../app/security-policy/page";
import TermsOfServicePage from "../app/terms-of-service/page";

describe("legal pages", () => {
  it("renders the privacy policy page", () => {
    const html = renderToStaticMarkup(PrivacyPolicyPage());

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("Last updated April 22, 2026");
    expect(html).toContain("What we collect");
  });

  it("renders the terms of service page", () => {
    const html = renderToStaticMarkup(TermsOfServicePage());

    expect(html).toContain("Terms of Service");
    expect(html).toContain("Last updated April 22, 2026");
    expect(html).toContain("Permitted use");
  });

  it("renders the security policy page", () => {
    const html = renderToStaticMarkup(SecurityPolicyPage());

    expect(html).toContain("Security Policy");
    expect(html).toContain("Last updated April 22, 2026");
    expect(html).toContain("Infrastructure safeguards");
  });
});
