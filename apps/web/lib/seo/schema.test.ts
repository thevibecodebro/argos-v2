import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "../../components/public/json-ld";
import { HOME_DESCRIPTION, PRODUCT_DEFINITION, absoluteUrl } from "./site";
import { buildHomeJsonLd, buildLegalPageJsonLd } from "./schema";

describe("public JSON-LD schema", () => {
  it("builds homepage structured data without unsupported rich-result claims", () => {
    const jsonLd = buildHomeJsonLd();

    expect(jsonLd).toHaveLength(4);
    expect(jsonLd.map((node) => node["@type"])).toEqual([
      "Organization",
      "WebSite",
      "WebPage",
      "SoftwareApplication",
    ]);

    expect(jsonLd[0]).toMatchObject({
      "@type": "Organization",
      name: "Argos",
      url: absoluteUrl("/"),
    });
    expect(jsonLd[1]).toMatchObject({
      "@type": "WebSite",
      name: "Argos",
      url: absoluteUrl("/"),
    });
    expect(jsonLd[2]).toMatchObject({
      "@type": "WebPage",
      description: HOME_DESCRIPTION,
    });
    expect(jsonLd[3]).toMatchObject({
      "@type": "SoftwareApplication",
      applicationCategory: "BusinessApplication",
      description: PRODUCT_DEFINITION,
      name: "Argos",
      operatingSystem: "Web",
    });

    const serializedJsonLd = JSON.stringify(jsonLd);

    expect(serializedJsonLd).not.toContain("FAQPage");
    expect(serializedJsonLd).not.toContain("AggregateRating");
  });

  it("builds legal page structured data with breadcrumbs", () => {
    const jsonLd = buildLegalPageJsonLd({
      description: "Security safeguards for Argos.",
      path: "/security-policy",
      title: "Security Policy",
    });

    expect(jsonLd).toHaveLength(2);
    expect(jsonLd[0]).toMatchObject({
      "@type": "WebPage",
      description: "Security safeguards for Argos.",
      name: "Security Policy",
      url: absoluteUrl("/security-policy"),
    });
    expect(jsonLd[1]).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", item: absoluteUrl("/"), name: "Home", position: 1 },
        {
          "@type": "ListItem",
          item: absoluteUrl("/security-policy"),
          name: "Security Policy",
          position: 2,
        },
      ],
    });
  });

  it("renders JSON-LD script tags with escaped markup characters", () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: { name: "<Argos>" } }));

    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("\\u003cArgos>");
    expect(html).not.toContain("<Argos>");
  });
});
