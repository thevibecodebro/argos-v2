import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  LOGO_PATH,
  PRODUCT_DEFINITION,
  SITE_NAME,
  absoluteUrl,
} from "./site";

type JsonLdNode = Record<string, unknown>;

type LegalPageSchemaInput = {
  path: string;
  title: string;
  description: string;
};

export function buildHomeJsonLd(): JsonLdNode[] {
  const homeUrl = absoluteUrl("/");
  const organizationId = `${homeUrl}#organization`;
  const websiteId = `${homeUrl}#website`;
  const webpageId = `${homeUrl}#webpage`;
  const productId = `${homeUrl}#software`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": organizationId,
      name: SITE_NAME,
      url: homeUrl,
      logo: absoluteUrl(LOGO_PATH),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": websiteId,
      name: SITE_NAME,
      url: homeUrl,
      publisher: { "@id": organizationId },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": webpageId,
      name: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: homeUrl,
      isPartOf: { "@id": websiteId },
      about: { "@id": productId },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": productId,
      name: SITE_NAME,
      description: PRODUCT_DEFINITION,
      url: homeUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: { "@id": organizationId },
    },
  ];
}

export function buildLegalPageJsonLd(input: LegalPageSchemaInput): JsonLdNode[] {
  const pageUrl = absoluteUrl(input.path);

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      name: input.title,
      description: input.description,
      url: pageUrl,
      isPartOf: { "@id": `${absoluteUrl("/")}#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: input.title, item: pageUrl },
      ],
    },
  ];
}
