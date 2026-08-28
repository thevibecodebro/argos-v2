# SEO AI SEO Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the public Argos site to a coherent SEO and AI-search baseline with canonical metadata, robots, sitemap, schema, `llms.txt`, answer-ready homepage copy, security headers, and live verification.

**Architecture:** Centralize public-site constants in `apps/web/lib/seo/site.ts`, then reuse them from metadata exports, metadata routes, schema builders, `llms.txt`, and tests. Align the repo source-of-truth with the current public product narrative and remove the stale public-pricing requirement from the source-of-truth doc for this pass.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest server-rendered markup tests, Next metadata routes, JSON-LD.

---

## Locked Assumptions

- Canonical homepage headline for this pass: `Build a sales team that actually follows the playbook.`
- Superseded homepage headline to remove from public-source assertions: `Sales teams changed. Coaching them should have too.`
- Canonical product definition: `Argos is a web platform for sales teams that turns real sales calls into scored evidence, coaching actions, roleplay practice, and progress signals managers can track across the team.`
- Canonical domain source: `NEXT_PUBLIC_SITE_URL`, falling back to `https://argos-v2-nine.vercel.app` until the final Argos domain resolves.
- Pricing: public pricing is not restored in this pass. The stale pricing instruction in `docs/public-homepage-source-of-truth.md` is removed so docs match the current local homepage and tests.
- Schema: add Organization, WebSite, WebPage, SoftwareApplication, and BreadcrumbList. Do not add Offer schema until public pricing is restored.
- Crawler posture: allow public search and user-triggered AI crawlers; disallow private authenticated paths for all crawlers.

## File Structure

Create:

- `apps/web/lib/seo/site.ts`: canonical URL, titles, descriptions, public routes, crawler user agents, product definition, llms text builder.
- `apps/web/lib/seo/schema.ts`: JSON-LD builders for homepage and legal pages.
- `apps/web/components/public/json-ld.tsx`: safe JSON-LD `<script>` renderer.
- `apps/web/app/robots.ts`: Next metadata route for robots.
- `apps/web/app/sitemap.ts`: Next metadata route for sitemap.
- `apps/web/app/llms.txt/route.ts`: static plain-text AI-agent summary.
- `apps/web/app/opengraph-image.tsx`: generated social preview image.
- `apps/web/lib/seo/site.test.ts`: tests for URL helpers and canonical text.
- `apps/web/lib/seo/schema.test.ts`: tests for JSON-LD builders.
- `apps/web/lib/public-metadata.test.ts`: tests page metadata exports.
- `apps/web/lib/public-seo-routes.test.ts`: tests robots, sitemap, and `llms.txt`.
- `apps/web/lib/security-headers.test.ts`: tests Next security headers.

Modify:

- `apps/web/app/layout.tsx`: root metadata defaults, `metadataBase`.
- `apps/web/app/page.tsx`: homepage metadata and homepage JSON-LD.
- `apps/web/app/privacy-policy/page.tsx`: route metadata and legal JSON-LD.
- `apps/web/app/terms-of-service/page.tsx`: route metadata and legal JSON-LD.
- `apps/web/app/security-policy/page.tsx`: route metadata and legal JSON-LD.
- `apps/web/components/public/landing-page.tsx`: corrected canonical headline, visible answer block, and demo placeholder copy cleanup.
- `apps/web/components/public/landing-page.module.css`: answer block styles and demo copy style adjustments.
- `apps/web/lib/public-landing-page.test.ts`: assert answer-ready copy and no placeholder wording.
- `apps/web/lib/public-homepage-source-of-truth.test.ts`: assert pricing language is no longer mandated.
- `docs/public-homepage-source-of-truth.md`: remove stale public-pricing instruction and clarify demo-led access model.
- `apps/web/next.config.ts`: security headers.

## Task 1: Centralize Public SEO Constants

**Files:**

- Create: `apps/web/lib/seo/site.ts`
- Create: `apps/web/lib/seo/site.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/seo/site.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AI_CRAWLER_USER_AGENTS,
  DEFAULT_PUBLIC_SITE_URL,
  HOME_DESCRIPTION,
  HOME_TITLE,
  PRODUCT_DEFINITION,
  PUBLIC_ROUTES,
  absoluteUrl,
  buildLlmsText,
  getPublicSiteUrl,
} from "./site";

describe("public SEO site config", () => {
  it("normalizes the public site URL from the environment", () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";

    expect(getPublicSiteUrl()).toBe("https://example.com");
    expect(absoluteUrl("/privacy-policy")).toBe("https://example.com/privacy-policy");
    expect(absoluteUrl("security-policy")).toBe("https://example.com/security-policy");

    process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("falls back to the audited public Vercel URL", () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(getPublicSiteUrl()).toBe(DEFAULT_PUBLIC_SITE_URL);
    expect(absoluteUrl("/")).toBe(`${DEFAULT_PUBLIC_SITE_URL}/`);

    process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("keeps the public narrative consistent across SEO surfaces", () => {
    expect(HOME_TITLE).toBe("Argos | Sales Coaching From Real Call Evidence");
    expect(HOME_DESCRIPTION).toContain("real sales calls");
    expect(PRODUCT_DEFINITION).toContain("scored evidence");
    expect(PUBLIC_ROUTES.map((route) => route.path)).toEqual([
      "/",
      "/privacy-policy",
      "/terms-of-service",
      "/security-policy",
    ]);
    expect(AI_CRAWLER_USER_AGENTS).toEqual([
      "OAI-SearchBot",
      "ChatGPT-User",
      "Claude-SearchBot",
      "PerplexityBot",
      "Perplexity-User",
    ]);
  });

  it("builds an llms.txt body with canonical public facts", () => {
    const text = buildLlmsText();

    expect(text).toContain("# Argos");
    expect(text).toContain(PRODUCT_DEFINITION);
    expect(text).toContain(`${DEFAULT_PUBLIC_SITE_URL}/privacy-policy`);
    expect(text).toContain("Public pricing is not currently published on the homepage.");
    expect(text).toContain("OAI-SearchBot");
    expect(text).not.toContain("Solo, Team, Enterprise");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/seo/site.test.ts
```

Expected: fail because `apps/web/lib/seo/site.ts` does not exist.

- [ ] **Step 3: Implement the SEO constants**

Create `apps/web/lib/seo/site.ts`:

```ts
export const DEFAULT_PUBLIC_SITE_URL = "https://argos-v2-nine.vercel.app";
export const SITE_NAME = "Argos";
export const HOME_TITLE = "Argos | Sales Coaching From Real Call Evidence";
export const HOME_PAGE_TITLE = "Sales Coaching From Real Call Evidence";
export const HOME_DESCRIPTION =
  "Argos turns real sales calls into scored evidence, manager coaching actions, roleplay practice, and progress signals for sales teams.";
export const PRODUCT_DEFINITION =
  "Argos is a web platform for sales teams that turns real sales calls into scored evidence, coaching actions, roleplay practice, and progress signals managers can track across the team.";
export const SOCIAL_IMAGE_PATH = "/opengraph-image";
export const LOGO_PATH = "/argos_logo_background.png";

export const PRIVATE_CRAWL_PATHS = [
  "/calls",
  "/dashboard",
  "/highlights",
  "/invite",
  "/leaderboard",
  "/notifications",
  "/onboarding",
  "/roleplay",
  "/settings",
  "/team",
  "/training",
  "/upload",
] as const;

export const AI_CRAWLER_USER_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
] as const;

export const PUBLIC_ROUTES = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/privacy-policy",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/terms-of-service",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/security-policy",
    changeFrequency: "yearly",
    priority: 0.4,
  },
] as const;

export function getPublicSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_PUBLIC_SITE_URL;

  return configuredUrl.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return new URL(normalizedPath, `${getPublicSiteUrl()}/`).toString();
}

export function buildLlmsText() {
  const publicPages = PUBLIC_ROUTES.map((route) => `- ${absoluteUrl(route.path)}`).join("\n");
  const aiCrawlers = AI_CRAWLER_USER_AGENTS.map((agent) => `- ${agent}`).join("\n");

  return [
    "# Argos",
    "",
    PRODUCT_DEFINITION,
    "",
    "## Canonical URLs",
    "",
    publicPages,
    "",
    "## Product Summary",
    "",
    "- Category: sales coaching platform for sales teams and managers.",
    "- Core workflow: call review -> scored evidence -> coaching action -> roleplay practice -> next-call progress signal.",
    "- Main users: sales managers, sales leaders, and reps who need coaching tied to real conversations.",
    "- Public pricing is not currently published on the homepage.",
    "- Demo path: book a guided walkthrough from the public homepage.",
    "",
    "## Public Policies",
    "",
    `- Privacy Policy: ${absoluteUrl("/privacy-policy")}`,
    `- Terms of Service: ${absoluteUrl("/terms-of-service")}`,
    `- Security Policy: ${absoluteUrl("/security-policy")}`,
    "",
    "## AI Crawler Posture",
    "",
    "Argos allows public search and user-triggered AI crawlers to access public marketing and policy pages. Authenticated application paths are not public crawl targets.",
    "",
    aiCrawlers,
    "",
  ].join("\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm run test -w @argos-v2/web -- lib/seo/site.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/seo/site.ts apps/web/lib/seo/site.test.ts
git commit -m "feat: centralize public SEO config"
```

## Task 2: Add Metadata, Canonicals, And Social Preview

**Files:**

- Create: `apps/web/lib/public-metadata.test.ts`
- Create: `apps/web/app/opengraph-image.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/privacy-policy/page.tsx`
- Modify: `apps/web/app/terms-of-service/page.tsx`
- Modify: `apps/web/app/security-policy/page.tsx`

- [ ] **Step 1: Write the failing metadata test**

Create `apps/web/lib/public-metadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { metadata as homeMetadata } from "../app/page";
import { metadata as privacyMetadata } from "../app/privacy-policy/page";
import { metadata as securityMetadata } from "../app/security-policy/page";
import { metadata as termsMetadata } from "../app/terms-of-service/page";
import { HOME_DESCRIPTION, HOME_TITLE, SOCIAL_IMAGE_PATH } from "./seo/site";

describe("public page metadata", () => {
  it("exports canonical homepage metadata", () => {
    expect(homeMetadata.title).toEqual({ absolute: HOME_TITLE });
    expect(homeMetadata.description).toBe(HOME_DESCRIPTION);
    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(homeMetadata.openGraph?.title).toBe(HOME_TITLE);
    expect(homeMetadata.openGraph?.description).toBe(HOME_DESCRIPTION);
    expect(homeMetadata.openGraph?.url).toBe("/");
    expect(homeMetadata.openGraph?.type).toBe("website");
    expect(homeMetadata.openGraph?.images).toEqual([
      {
        url: SOCIAL_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Argos sales coaching platform",
      },
    ]);
    expect(homeMetadata.twitter?.card).toBe("summary_large_image");
  });

  it("exports unique legal page metadata", () => {
    expect(privacyMetadata.title).toBe("Privacy Policy");
    expect(privacyMetadata.description).toContain("information Argos uses");
    expect(privacyMetadata.alternates?.canonical).toBe("/privacy-policy");

    expect(termsMetadata.title).toBe("Terms of Service");
    expect(termsMetadata.description).toContain("responsibilities");
    expect(termsMetadata.alternates?.canonical).toBe("/terms-of-service");

    expect(securityMetadata.title).toBe("Security Policy");
    expect(securityMetadata.description).toContain("safeguards");
    expect(securityMetadata.alternates?.canonical).toBe("/security-policy");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/public-metadata.test.ts
```

Expected: fail because page metadata exports do not exist yet.

- [ ] **Step 3: Update root layout metadata**

Modify `apps/web/app/layout.tsx`:

```ts
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Grotesk, Space_Mono, Source_Sans_3 } from "next/font/google";
import { getDevelopmentStartupEnvError } from "@/lib/env";
import { getPublicSiteUrl, HOME_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
import "./globals.css";
```

Replace the existing `metadata` export with:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: HOME_DESCRIPTION,
};
```

- [ ] **Step 4: Add homepage metadata and social preview image**

Modify `apps/web/app/page.tsx`:

```ts
import type { Metadata } from "next";
import { LandingPage } from "@/components/public/landing-page";
import { HOME_DESCRIPTION, HOME_TITLE, SOCIAL_IMAGE_PATH } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    siteName: "Argos",
    type: "website",
    images: [
      {
        url: SOCIAL_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Argos sales coaching platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SOCIAL_IMAGE_PATH],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
```

Create `apps/web/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { HOME_PAGE_TITLE, PRODUCT_DEFINITION } from "@/lib/seo/site";

export const alt = "Argos sales coaching platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000",
          color: "#f1bf7b",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
          Argos
        </div>
        <div>
          <div style={{ maxWidth: 900, color: "#e9e4dd", fontSize: 78, fontWeight: 900, lineHeight: 0.95 }}>
            {HOME_PAGE_TITLE}
          </div>
          <div style={{ maxWidth: 880, marginTop: 32, color: "#d6cab9", fontSize: 30, fontWeight: 700, lineHeight: 1.3 }}>
            {PRODUCT_DEFINITION}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 5: Add legal page metadata**

Add this export to `apps/web/app/privacy-policy/page.tsx`:

```ts
import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "This Privacy Policy explains what information Argos uses to deliver call review, coaching, training, and platform operations for sales organizations.",
  alternates: {
    canonical: "/privacy-policy",
  },
};
```

Add this export to `apps/web/app/terms-of-service/page.tsx`:

```ts
import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "These Terms of Service govern access to Argos and describe the responsibilities that apply when customer organizations use the platform.",
  alternates: {
    canonical: "/terms-of-service",
  },
};
```

Add this export to `apps/web/app/security-policy/page.tsx`:

```ts
import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal-page";

export const metadata: Metadata = {
  title: "Security Policy",
  description:
    "This Security Policy summarizes the operational safeguards Argos applies to protect customer workspaces, application access, and infrastructure.",
  alternates: {
    canonical: "/security-policy",
  },
};
```

Preserve each page's existing `LegalPage` JSX after adding the metadata export.

- [ ] **Step 6: Run the metadata test**

Run:

```bash
npm run test -w @argos-v2/web -- lib/public-metadata.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/app/page.tsx apps/web/app/privacy-policy/page.tsx apps/web/app/terms-of-service/page.tsx apps/web/app/security-policy/page.tsx apps/web/app/opengraph-image.tsx apps/web/lib/public-metadata.test.ts
git commit -m "feat: add public metadata and social previews"
```

## Task 3: Add Robots, Sitemap, And llms.txt

**Files:**

- Create: `apps/web/app/robots.ts`
- Create: `apps/web/app/sitemap.ts`
- Create: `apps/web/app/llms.txt/route.ts`
- Create: `apps/web/lib/public-seo-routes.test.ts`

- [ ] **Step 1: Write the failing route test**

Create `apps/web/lib/public-seo-routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import llmsRoute from "../app/llms.txt/route";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { AI_CRAWLER_USER_AGENTS, DEFAULT_PUBLIC_SITE_URL, PRIVATE_CRAWL_PATHS, PRODUCT_DEFINITION } from "./seo/site";

describe("public SEO metadata routes", () => {
  it("emits robots rules for public and private paths", () => {
    const result = robots();

    expect(result.sitemap).toBe(`${DEFAULT_PUBLIC_SITE_URL}/sitemap.xml`);
    expect(result.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userAgent: "*",
          allow: ["/"],
          disallow: [...PRIVATE_CRAWL_PATHS],
        }),
      ]),
    );

    for (const agent of AI_CRAWLER_USER_AGENTS) {
      expect(result.rules).toContainEqual({
        userAgent: agent,
        allow: ["/"],
        disallow: [...PRIVATE_CRAWL_PATHS],
      });
    }
  });

  it("emits a sitemap for crawlable public pages", () => {
    const result = sitemap();

    expect(result.map((entry) => entry.url)).toEqual([
      `${DEFAULT_PUBLIC_SITE_URL}/`,
      `${DEFAULT_PUBLIC_SITE_URL}/privacy-policy`,
      `${DEFAULT_PUBLIC_SITE_URL}/terms-of-service`,
      `${DEFAULT_PUBLIC_SITE_URL}/security-policy`,
    ]);
    expect(result[0]).toMatchObject({ changeFrequency: "weekly", priority: 1 });
  });

  it("serves llms.txt as plain text", async () => {
    const response = await llmsRoute.GET();
    const text = await response.text();

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(text).toContain(PRODUCT_DEFINITION);
    expect(text).toContain(`${DEFAULT_PUBLIC_SITE_URL}/security-policy`);
    expect(text).toContain("Public pricing is not currently published on the homepage.");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/public-seo-routes.test.ts
```

Expected: fail because the route files do not exist.

- [ ] **Step 3: Create `robots.ts`**

Create `apps/web/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { AI_CRAWLER_USER_AGENTS, PRIVATE_CRAWL_PATHS, absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const publicRules = {
    allow: ["/"],
    disallow: [...PRIVATE_CRAWL_PATHS],
  };

  return {
    rules: [
      {
        userAgent: "*",
        ...publicRules,
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        ...publicRules,
      })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
```

- [ ] **Step 4: Create `sitemap.ts`**

Create `apps/web/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, absoluteUrl } from "@/lib/seo/site";

const lastModified = new Date("2026-06-17");

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
```

- [ ] **Step 5: Create `llms.txt` route**

Create `apps/web/app/llms.txt/route.ts`:

```ts
import { buildLlmsText } from "@/lib/seo/site";

export const dynamic = "force-static";

export async function GET() {
  return new Response(buildLlmsText(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export default { GET };
```

- [ ] **Step 6: Run the route test**

Run:

```bash
npm run test -w @argos-v2/web -- lib/public-seo-routes.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/robots.ts apps/web/app/sitemap.ts apps/web/app/llms.txt/route.ts apps/web/lib/public-seo-routes.test.ts
git commit -m "feat: add public crawl metadata routes"
```

## Task 4: Add JSON-LD Schema

**Files:**

- Create: `apps/web/lib/seo/schema.ts`
- Create: `apps/web/lib/seo/schema.test.ts`
- Create: `apps/web/components/public/json-ld.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/privacy-policy/page.tsx`
- Modify: `apps/web/app/terms-of-service/page.tsx`
- Modify: `apps/web/app/security-policy/page.tsx`

- [ ] **Step 1: Write the failing schema tests**

Create `apps/web/lib/seo/schema.test.ts`:

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "../../components/public/json-ld";
import { HOME_DESCRIPTION, PRODUCT_DEFINITION, absoluteUrl } from "./site";
import { buildHomeJsonLd, buildLegalPageJsonLd } from "./schema";

describe("public JSON-LD schema", () => {
  it("builds homepage organization, website, webpage, and software schema", () => {
    const graph = buildHomeJsonLd();

    expect(graph).toHaveLength(4);
    expect(graph[0]).toMatchObject({
      "@type": "Organization",
      name: "Argos",
      url: absoluteUrl("/"),
    });
    expect(graph[1]).toMatchObject({
      "@type": "WebSite",
      name: "Argos",
      url: absoluteUrl("/"),
    });
    expect(graph[2]).toMatchObject({
      "@type": "WebPage",
      description: HOME_DESCRIPTION,
    });
    expect(graph[3]).toMatchObject({
      "@type": "SoftwareApplication",
      name: "Argos",
      description: PRODUCT_DEFINITION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
    });
    expect(JSON.stringify(graph)).not.toContain("FAQPage");
    expect(JSON.stringify(graph)).not.toContain("AggregateRating");
  });

  it("builds legal webpage and breadcrumb schema", () => {
    const graph = buildLegalPageJsonLd({
      path: "/security-policy",
      title: "Security Policy",
      description: "Security safeguards for Argos.",
    });

    expect(graph).toHaveLength(2);
    expect(graph[0]).toMatchObject({
      "@type": "WebPage",
      name: "Security Policy",
      url: absoluteUrl("/security-policy"),
    });
    expect(graph[1]).toMatchObject({
      "@type": "BreadcrumbList",
    });
  });

  it("renders escaped JSON-LD script markup", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ name: "<Argos>" }} />);

    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("\\u003cArgos>");
    expect(html).not.toContain("<Argos>");
  });
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/seo/schema.test.ts
```

Expected: fail because schema and JSON-LD helper files do not exist.

- [ ] **Step 3: Implement schema builders**

Create `apps/web/lib/seo/schema.ts`:

```ts
import { HOME_DESCRIPTION, HOME_TITLE, LOGO_PATH, PRODUCT_DEFINITION, SITE_NAME, absoluteUrl } from "./site";

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
      publisher: {
        "@id": organizationId,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": webpageId,
      name: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: homeUrl,
      isPartOf: {
        "@id": websiteId,
      },
      about: {
        "@id": productId,
      },
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
      publisher: {
        "@id": organizationId,
      },
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
      isPartOf: {
        "@id": `${absoluteUrl("/")}#website`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: input.title,
          item: pageUrl,
        },
      ],
    },
  ];
}
```

- [ ] **Step 4: Implement JSON-LD renderer**

Create `apps/web/components/public/json-ld.tsx`:

```tsx
type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

function serializeJsonLd(data: JsonLdProps["data"]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
      type="application/ld+json"
    />
  );
}
```

- [ ] **Step 5: Wire homepage JSON-LD**

Modify `apps/web/app/page.tsx` so the imports include:

```ts
import { JsonLd } from "@/components/public/json-ld";
import { buildHomeJsonLd } from "@/lib/seo/schema";
```

Replace the page component with:

```tsx
export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomeJsonLd()} />
      <LandingPage />
    </>
  );
}
```

- [ ] **Step 6: Wire legal page JSON-LD**

In each legal page, import:

```ts
import { JsonLd } from "@/components/public/json-ld";
import { buildLegalPageJsonLd } from "@/lib/seo/schema";
```

For `privacy-policy/page.tsx`, wrap the existing `LegalPage`:

```tsx
export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={buildLegalPageJsonLd({
          path: "/privacy-policy",
          title: "Privacy Policy",
          description:
            "This Privacy Policy explains what information Argos uses to deliver call review, coaching, training, and platform operations for sales organizations.",
        })}
      />
      <LegalPage
        eyebrow="Argos Policy"
        intro="This Privacy Policy explains what information Argos uses to deliver call review, coaching, training, and related platform operations for sales organizations."
        lastUpdated="April 22, 2026"
        sections={[
          {
            title: "What we collect",
            body: [
              "We collect account details, workspace configuration, and usage data needed to operate the Argos platform. That can include names, work email addresses, team membership, rubric configuration, and activity generated when users review calls or assign follow-up training.",
              "When customers connect call sources or recording providers, Argos may process recordings, transcripts, scorecards, and associated metadata strictly to provide the product features requested by the customer organization.",
            ],
          },
          {
            title: "How we use information",
            body: [
              "We use information to authenticate users, deliver workspace functionality, generate coaching outputs, maintain service quality, and investigate reliability or abuse issues.",
              "We do not use customer workspace data for unrelated product marketing. Access is limited to authorized personnel and service providers supporting platform delivery.",
            ],
          },
          {
            title: "Retention and control",
            body: [
              "Customer organizations control the operational use of their workspace and are responsible for ensuring they have the right to upload, sync, or process call-related material in Argos.",
              "We retain data for as long as needed to provide the service, satisfy legal obligations, resolve disputes, and enforce agreements. Customers can request deletion or export workflows subject to contractual and legal requirements.",
            ],
          },
        ]}
        title="Privacy Policy"
      />
    </>
  );
}
```

Apply the same wrapping pattern to terms and security pages using their existing props and route-specific title/description/path.

- [ ] **Step 7: Run schema and legal page tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/seo/schema.test.ts lib/legal-pages.test.ts
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/seo/schema.ts apps/web/lib/seo/schema.test.ts apps/web/components/public/json-ld.tsx apps/web/app/page.tsx apps/web/app/privacy-policy/page.tsx apps/web/app/terms-of-service/page.tsx apps/web/app/security-policy/page.tsx
git commit -m "feat: add public structured data"
```

## Task 5: Add Answer-Ready Homepage Copy And Align Source Of Truth

**Files:**

- Modify: `apps/web/components/public/landing-page.tsx`
- Modify: `apps/web/components/public/landing-page.module.css`
- Modify: `apps/web/lib/public-landing-page.test.ts`
- Modify: `apps/web/lib/public-homepage-source-of-truth.test.ts`
- Modify: `docs/public-homepage-source-of-truth.md`

- [ ] **Step 1: Update the failing homepage test**

In `apps/web/lib/public-landing-page.test.ts`, add these expectations after the existing hero body expectation:

```ts
    expect(html).toContain("Build a sales team that actually follows the playbook.");
    expect(html).not.toContain("Sales teams changed. Coaching them should have too.");
    expect(html).toContain(
      "Argos is a web platform for sales teams that turns real sales calls into scored evidence, coaching actions, roleplay practice, and progress signals managers can track across the team.",
    );
    expect(html).toContain("What Argos makes explicit");
    expect(html).toContain("Who it is for");
    expect(html).toContain("Sales managers and leaders who need coaching tied to real calls.");
    expect(html).toContain("How the loop works");
    expect(html).toContain("A call becomes scored evidence, a coaching action, a roleplay drill, and a next-call progress signal.");
```

Change the demo placeholder assertions from:

```ts
    expect(html).toContain("Demo video");
    expect(html).toContain("Video placeholder");
    expect(html).toContain('data-demo-video-placeholder="true"');
    expect(html).toContain('aria-label="Argos product demo video placeholder"');
```

to:

```ts
    expect(html).toContain("Demo walkthrough");
    expect(html).toContain("Call review, scorecard, and roleplay walkthrough");
    expect(html).not.toContain("Video placeholder");
    expect(html).not.toContain('data-demo-video-placeholder="true"');
    expect(html).not.toContain('aria-label="Argos product demo video placeholder"');
```

- [ ] **Step 2: Update the source-of-truth test**

In `apps/web/lib/public-homepage-source-of-truth.test.ts`, add:

```ts
    expect(source).toContain("Build a sales team that actually follows the playbook.");
    expect(source).not.toContain("Sales teams changed. Coaching them should have too.");
    expect(source).toContain("Access model");
    expect(source).toContain("Public pricing is not part of this homepage pass.");
    expect(source).not.toContain("Pricing: keep Solo, Team, Enterprise");
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run:

```bash
npm run test -w @argos-v2/web -- lib/public-landing-page.test.ts lib/public-homepage-source-of-truth.test.ts
```

Expected: fail until landing copy and the source-of-truth doc are updated.

- [ ] **Step 4: Add the answer-ready homepage data**

In `apps/web/components/public/landing-page.tsx`, replace the current hero headline value with:

```ts
  headline: "Build a sales team that actually follows the playbook.",
```

Modify `apps/web/components/public/landing-page.tsx` imports:

```ts
import { PRODUCT_DEFINITION } from "@/lib/seo/site";
```

Add after `demoProofPoints`:

```ts
const answerPoints = [
  {
    title: "Who it is for",
    body: "Sales managers and leaders who need coaching tied to real calls.",
  },
  {
    title: "How the loop works",
    body: "A call becomes scored evidence, a coaching action, a roleplay drill, and a next-call progress signal.",
  },
  {
    title: "What managers see",
    body: "The transcript, scorecard evidence, training assignment, and behavior trend stay connected.",
  },
] as const;
```

In `LandingHero`, add this block immediately after the hero body paragraph:

```tsx
          <div className={styles["argos-answer-block"]}>
            <p>{PRODUCT_DEFINITION}</p>
            <dl aria-label="What Argos makes explicit">
              {answerPoints.map((point) => (
                <div key={point.title}>
                  <dt>{point.title}</dt>
                  <dd>{point.body}</dd>
                </div>
              ))}
            </dl>
          </div>
```

- [ ] **Step 5: Replace placeholder demo copy**

In `LandingAccess`, replace the demo video placeholder element:

```tsx
          <div
            aria-label="Argos product demo video placeholder"
            className={styles["argos-demo-video"]}
            data-demo-video-placeholder="true"
          >
            <div className={styles["argos-demo-video-frame"]}>
              <span className={styles["argos-demo-label"]}>Demo video</span>
              <div className={styles["argos-demo-play"]} aria-hidden="true">
                <span />
              </div>
              <p>Video placeholder</p>
            </div>
          </div>
```

with:

```tsx
          <div
            aria-label="Argos demo walkthrough summary"
            className={styles["argos-demo-video"]}
          >
            <div className={styles["argos-demo-video-frame"]}>
              <span className={styles["argos-demo-label"]}>Demo walkthrough</span>
              <div className={styles["argos-demo-play"]} aria-hidden="true">
                <span />
              </div>
              <p>Call review, scorecard, and roleplay walkthrough</p>
            </div>
          </div>
```

- [ ] **Step 6: Add answer block styles**

In `apps/web/components/public/landing-page.module.css`, add after `.argos-hero-body`:

```css
.argos-answer-block {
  max-width: 42rem;
  margin-top: 1.25rem;
  border-left: 4px solid var(--argos-amber);
  background: rgba(241, 191, 123, 0.08);
  padding: 1rem 1.15rem;
}

.argos-answer-block p {
  margin: 0;
  color: var(--argos-text);
  font-size: 0.96rem;
  font-weight: 800;
  line-height: 1.55;
}

.argos-answer-block dl {
  display: grid;
  gap: 0.85rem;
  margin: 1rem 0 0;
}

.argos-answer-block div {
  display: grid;
  gap: 0.25rem;
}

.argos-answer-block dt,
.argos-answer-block dd {
  margin: 0;
}

.argos-answer-block dt {
  color: var(--argos-amber);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.argos-answer-block dd {
  color: var(--argos-muted);
  font-size: 0.84rem;
  font-weight: 800;
  line-height: 1.45;
}
```

- [ ] **Step 7: Align the source-of-truth doc**

Modify `docs/public-homepage-source-of-truth.md`.

Replace every instance of:

```md
Sales teams changed. Coaching them should have too.
```

with:

```md
Build a sales team that actually follows the playbook.
```

Replace:

```md
4. Pricing: keep Solo, Team, Enterprise, annual pricing math, and the enterprise calendar link.
```

with:

```md
4. Access model: keep Launch platform, See the loop, and the enterprise calendar link. Public pricing is not part of this homepage pass.
```

Replace:

```md
- Pricing behavior: annual selection shows yearly price.
```

with:

```md
- Access model: public visitors can launch the platform, see the loop, or book a guided demo.
- Public pricing is not part of this homepage pass.
```

- [ ] **Step 8: Run the focused tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/public-landing-page.test.ts lib/public-homepage-source-of-truth.test.ts
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/public/landing-page.tsx apps/web/components/public/landing-page.module.css apps/web/lib/public-landing-page.test.ts apps/web/lib/public-homepage-source-of-truth.test.ts docs/public-homepage-source-of-truth.md
git commit -m "feat: add answer-ready public homepage copy"
```

## Task 6: Add Security Headers

**Files:**

- Create: `apps/web/lib/security-headers.test.ts`
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Write the failing security header test**

Create `apps/web/lib/security-headers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("Next security headers", () => {
  it("adds conservative public security headers", async () => {
    const headersConfig = await nextConfig.headers?.();
    const firstRule = headersConfig?.[0];

    expect(firstRule?.source).toBe("/:path*");
    expect(firstRule?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=()",
        },
      ]),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -w @argos-v2/web -- lib/security-headers.test.ts
```

Expected: fail because `headers()` is not configured.

- [ ] **Step 3: Add headers**

Modify `apps/web/next.config.ts`:

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
] as const;

const nextConfig: NextConfig = {
  transpilePackages: ["@argos-v2/db", "@argos-v2/ui"],
  serverExternalPackages: ["pg", "pg-connection-string"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Run the security header test**

Run:

```bash
npm run test -w @argos-v2/web -- lib/security-headers.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/next.config.ts apps/web/lib/security-headers.test.ts
git commit -m "feat: add public security headers"
```

## Task 7: Full Local Verification

**Files:**

- No new files.

- [ ] **Step 1: Run focused public-site tests**

Run:

```bash
npm run test -w @argos-v2/web -- lib/seo/site.test.ts lib/seo/schema.test.ts lib/public-metadata.test.ts lib/public-seo-routes.test.ts lib/public-landing-page.test.ts lib/public-homepage-source-of-truth.test.ts lib/legal-pages.test.ts lib/security-headers.test.ts
```

Expected: pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck -w @argos-v2/web
```

Expected: pass.

- [ ] **Step 3: Run web build**

Run:

```bash
npm run build -w @argos-v2/web
```

Expected: pass and generate Next routes for `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/opengraph-image`.

- [ ] **Step 4: Resolve verification failures at the owning task**

If typecheck or build fails, return to the task that introduced the failing file, make the smallest correction there, rerun that task's focused test, and amend that task's commit before continuing. If every command passed, continue without creating an empty commit.

## Task 8: Deploy And Live Verification

**Files:**

- No source files unless live verification exposes a deployment-only issue.

- [ ] **Step 1: Deploy through the repo's proven production path**

Use the GitHub-backed path or the currently accepted Vercel production deploy flow for this project. Do not call the work complete from a preview URL.

- [ ] **Step 2: Verify live technical routes**

Run against the audited canonical fallback domain. If `NEXT_PUBLIC_SITE_URL` is changed before deployment, replace this domain in the commands and in `apps/web/lib/seo/site.ts` tests during that same implementation pass.

```bash
curl -sSIL https://argos-v2-nine.vercel.app/
curl -sSIL https://argos-v2-nine.vercel.app/robots.txt
curl -sSIL https://argos-v2-nine.vercel.app/sitemap.xml
curl -sSIL https://argos-v2-nine.vercel.app/llms.txt
```

Expected:

- Homepage returns 200 with no `x-robots-tag: noindex`.
- `/robots.txt` returns 200.
- `/sitemap.xml` returns 200.
- `/llms.txt` returns 200 and `content-type: text/plain`.

- [ ] **Step 3: Run SEO audit scripts against live**

Run:

```bash
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/fetch_page.py https://argos-v2-nine.vercel.app/ --output /tmp/argos-home.html
env PYTHONPATH=/private/tmp/argos-seo-pydeps python3 /Users/thevibecodebro/.codex/skills/seo/scripts/parse_html.py /tmp/argos-home.html --url https://argos-v2-nine.vercel.app/ --json
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/robots_checker.py https://argos-v2-nine.vercel.app/
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/llms_txt_checker.py https://argos-v2-nine.vercel.app/
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/social_meta_checker.py https://argos-v2-nine.vercel.app/
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/security_headers.py https://argos-v2-nine.vercel.app/
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/broken_link_checker.py https://argos-v2-nine.vercel.app/ --max-pages 25
```

Expected:

- Canonical URL present.
- JSON-LD present.
- Open Graph and Twitter Card fields present.
- `robots.txt` and `llms.txt` checks pass.
- Security header score improves from the audit baseline.
- Broken link count remains 0.

- [ ] **Step 4: Capture browser screenshots**

Run the existing Playwright/browser verification flow used during the audit and save:

```text
output/playwright/argos-home-desktop-after-seo.png
output/playwright/argos-home-mobile-after-seo.png
```

Expected:

- Homepage renders with the current canonical headline.
- Answer block is visible and does not crowd the mobile hero.
- No console errors.
- Demo section no longer says `Video placeholder`.

- [ ] **Step 5: Resolve live-only failures at the owning task**

If live verification exposes a source issue, return to the task that owns the file, make the smallest correction there, rerun Tasks 7 and 8, and amend that task's commit. If no live-only fixes are needed, record the live verification URLs and script results in the final handoff.

## Self-Review

Spec coverage:

- Production/source drift: Task 5 aligns the source-of-truth doc and homepage content; Task 8 verifies live.
- Missing sitemap: Task 3 adds `sitemap.ts`.
- Missing robots and AI crawler policy: Task 3 adds `robots.ts`.
- Missing canonicals and duplicate metadata: Task 2 adds route metadata.
- Missing social metadata: Task 2 adds Open Graph, Twitter, and generated OG image.
- Missing schema: Task 4 adds JSON-LD.
- Missing `llms.txt`: Task 3 adds the route.
- Missing answer-ready copy: Task 5 adds the answer block.
- Security headers: Task 6 adds headers.
- Live verification: Task 8 verifies final deployment, not only local code.

Placeholder scan:

- Product choices are resolved in Locked Assumptions.
- Deploy verification commands use the audited canonical fallback domain.
- Verification failures are routed back to the owning task instead of leaving unknown file lists.

Type consistency:

- `HOME_TITLE`, `HOME_DESCRIPTION`, `PRODUCT_DEFINITION`, `PUBLIC_ROUTES`, `PRIVATE_CRAWL_PATHS`, and `AI_CRAWLER_USER_AGENTS` are defined in Task 1 before later tasks import them.
- `buildHomeJsonLd`, `buildLegalPageJsonLd`, and `JsonLd` are defined in Task 4 before page wiring uses them.
- Route tests import the exact route files created in Task 3.
