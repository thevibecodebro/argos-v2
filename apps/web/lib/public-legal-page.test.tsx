import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalPage } from "../components/public/legal-page";

describe("LegalPage", () => {
  it("keeps the supplied legal copy, headings, and navigation in reading order", () => {
    const html = renderToStaticMarkup(createElement(LegalPage, {
      eyebrow: "Legal information",
      title: "Example policy",
      lastUpdated: "November 2026",
      intro: "Introduction text.",
      sections: [{ title: "First section", body: ["First paragraph.", "Second paragraph."] }],
    }));

    expect(html).toContain("Legal information");
    expect(html).toContain("Last updated November 2026");
    expect(html).toContain("<h1 class=");
    expect(html).toContain("Example policy</h1>");
    expect(html).toContain("<h2>First section</h2>");
    expect(html.indexOf("Introduction text.")).toBeLessThan(html.indexOf("First paragraph."));
    expect(html.indexOf("First paragraph.")).toBeLessThan(html.indexOf("Second paragraph."));
    for (const href of ["/", "/privacy-policy", "/terms-of-service", "/security-policy"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
