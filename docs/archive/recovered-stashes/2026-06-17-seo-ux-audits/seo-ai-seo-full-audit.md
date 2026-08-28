# Argos SEO + AI SEO Full Audit

Date: June 17, 2026
Primary production URL audited: https://argos-v2-nine.vercel.app/
Secondary alias checked: https://argos-v2-thevibecodebro.vercel.app/
Unresolved domain from this environment: https://app.argos.ai/

## Executive Summary

Argos is indexable on the primary Vercel URL and the page renders cleanly in a real browser, but the public SEO foundation is incomplete. The largest risk is not a single missing tag; it is that production, local source, and the documented homepage source of truth disagree about the public narrative. Until that is reconciled, metadata, schema, `llms.txt`, and AI-answer optimization may describe the wrong version of the page.

Overall score: 58/100, medium confidence.

This score excludes Core Web Vitals because the PageSpeed API was rate-limited during the audit and no Google Search Console or CrUX property data was available.

| Area | Score | Confidence | Notes |
| --- | ---: | --- | --- |
| Technical SEO | 56/100 | High | 200 OK and no noindex on the primary URL, but no sitemap, no robots policy, no canonicals, incomplete trust headers. |
| On-page SEO | 58/100 | High | Good single H1 and headings, but live copy conflicts with canonical repo direction and metadata is incomplete. |
| Content quality | 64/100 | Medium | Product story is clear, but answer-ready definition, pricing, comparison, and trust sections are thin or missing. |
| Schema | 15/100 | High | No JSON-LD detected. |
| AI SEO / AEO / GEO | 44/100 | Medium | AI crawlers are not explicitly blocked, but there is no `llms.txt`, no structured entity graph, and limited answer-ready content. |
| Images and media | 70/100 | Medium | Rendered product images load and are reasonably sized, but raw HTML has much less product proof. |
| Performance / CWV | Insufficient data | Low | Visual load worked; PageSpeed/CWV verification needs a clean rerun. |
| Trust and compliance | 62/100 | High | Privacy, terms, and security pages exist, but metadata, canonicals, schema, and headers need work. |

## Scope And Evidence

Local source inspected:

- `docs/public-homepage-source-of-truth.md`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/privacy-policy/page.tsx`
- `apps/web/app/terms-of-service/page.tsx`
- `apps/web/app/security-policy/page.tsx`
- `apps/web/components/public/landing-page.tsx`
- `apps/web/components/public/legal-page.tsx`
- `apps/web/public/*`

Live checks performed:

- HTTP headers for `/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/privacy-policy`, `/terms-of-service`, `/security-policy`, `/login`
- Raw HTML parse for homepage and public legal pages
- Social metadata audit
- Robots and `llms.txt` checks
- Broken link crawl
- Security header check
- Redirect check
- Hreflang check
- Desktop and mobile Playwright render checks
- Console warning check
- Screenshot capture:
  - `output/playwright/argos-home-desktop-full.png`
  - `output/playwright/argos-home-mobile-full.png`

Machine-readable findings:

- `SEO-FINDINGS.json`
- Verified with `/Users/thevibecodebro/.codex/skills/seo/scripts/finding_verifier.py`
- Raw findings: 15
- Verified findings: 15
- Dropped findings: 0

Official references used:

- Google AI Search guidance: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google robots.txt specification: https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec
- Google structured data guidance: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Google Search Central updates: https://developers.google.com/search/updates
- OpenAI crawler documentation: https://developers.openai.com/api/docs/bots
- Anthropic crawler documentation: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Perplexity crawler documentation: https://docs.perplexity.ai/docs/resources/perplexity-crawlers

## Current Crawl Snapshot

Homepage raw HTML parse:

- Title: `Argos | Sales Standard Installation Platform`
- Meta description: `Sales coaching backed by Argos scorecards, call reviews, training assignments, roleplay practice, and manager dashboards.`
- H1: `Build a sales team that actually follows the playbook.`
- Word count: 658
- Canonical: missing
- Robots meta: missing
- Structured data: none
- Open Graph: none
- Twitter Card: none
- Hreflang: none
- Raw HTML images: two decorative `/argos_logo_background.png` references
- Internal links detected in raw parse: `/`, `/login`, `/privacy-policy`, `/terms-of-service`, `/security-policy`

Public legal page parse:

- `/privacy-policy`: HTTP 200, H1 present, 216 words, no canonical, no schema, inherited homepage title/description.
- `/terms-of-service`: HTTP 200, H1 present, 210 words, no canonical, no schema, inherited homepage title/description.
- `/security-policy`: HTTP 200, H1 present, 186 words, no canonical, no schema, inherited homepage title/description.

Indexation and crawling:

- `https://argos-v2-nine.vercel.app/`: HTTP 200, no `x-robots-tag: noindex`.
- `https://argos-v2-thevibecodebro.vercel.app/`: HTTP 200, includes `x-robots-tag: noindex`.
- `/robots.txt`: 404.
- `/sitemap.xml`: 404.
- `/llms.txt`: 404.
- `/llms-full.txt`: not found.

Browser rendering:

- Desktop and mobile screenshots rendered successfully.
- Console messages: 0.
- The page is responsive and readable at mobile width.
- The demo/video section is visibly a placeholder.
- Product screenshots are visible after browser render, but they are not visible in the initial raw HTML parse.

## Verified Findings

### Critical

1. Production homepage content does not match the repository's canonical public-homepage source of truth.

Evidence:

- Live H1: `Build a sales team that actually follows the playbook.`
- Canonical repo direction in `docs/public-homepage-source-of-truth.md`: `Sales teams changed. Coaching them should have too.`
- Local `apps/web/components/public/landing-page.tsx` also uses `Sales teams changed. Coaching them should have too.`
- Live metadata uses `Argos | Sales Standard Installation Platform`, while local root metadata still says `Argos` / `Revenue Command Platform`.
- Live product screenshots load from `/homepage-product/*.png`, but that asset folder is not present under `apps/web/public` in the current working tree.

Why it matters:

Search and AI systems need a stable entity definition. If the deployed page, local source, tests, source-of-truth document, schema, and `llms.txt` do not describe the same product story, future optimization work can reinforce the wrong narrative.

Recommended fix:

Reconcile the release source first. Decide whether the canonical public homepage is the live "sales playbook" version or the local "sales teams changed" version, then deploy the chosen version and align title, description, H1, schema, sitemap, social metadata, and `llms.txt` around it.

### Warnings

2. Missing `sitemap.xml`.

Evidence:

- `/sitemap.xml` returns 404.
- No `apps/web/app/sitemap.ts` file exists.

Impact:

This is not always fatal for a small site, but it weakens discovery, makes Search Console submission weaker, and gives AI/web crawlers no explicit public URL inventory.

Recommended fix:

Add `apps/web/app/sitemap.ts` with the homepage and public legal pages. Add pricing/demo pages if they become public.

3. Missing `robots.txt` and explicit AI crawler policy.

Evidence:

- `/robots.txt` returns 404.
- Google treats a 4xx robots response as no crawl restrictions, so this is not currently blocking Googlebot.
- There is no `Sitemap:` directive and no explicit policy for AI-search crawlers.

Impact:

Default-allow is acceptable for basic crawlability, but it is sloppy for a SaaS product with authenticated surfaces and AI-search goals. It also misses a clean place to declare the sitemap and crawler intent.

Recommended fix:

Add `apps/web/app/robots.ts`. Allow public pages, disallow authenticated/private surfaces, include the sitemap URL, and make explicit decisions for:

- `Googlebot`
- `OAI-SearchBot`
- `ChatGPT-User`
- `Claude-SearchBot`
- `ClaudeBot`
- `PerplexityBot`
- `Perplexity-User`

Important distinction:

OpenAI and Perplexity both distinguish user-triggered fetch agents from automatic search/crawl agents. If Argos wants to be available when a user asks an AI system about the site, do not casually block user-triggered agents.

4. Missing canonical URLs.

Evidence:

- `parse_html.py` found `canonical=null` on `/`, `/privacy-policy`, `/terms-of-service`, and `/security-policy`.
- There are multiple Vercel aliases, including one that returns `x-robots-tag: noindex`.

Impact:

Without canonical URLs, crawlers have less certainty about the preferred public URL, especially while Vercel aliases exist.

Recommended fix:

Set `metadataBase` and route-level `alternates.canonical` values. Use the final public domain, not a transient preview URL, once DNS is settled.

5. Generic and duplicated metadata.

Evidence:

- Local `apps/web/app/layout.tsx` exports:
  - `title: "Argos"`
  - `description: "Revenue Command Platform"`
- Live legal pages inherit homepage metadata rather than page-specific title and description.

Impact:

Duplicate or generic titles reduce clarity in search results and AI summaries. Legal pages also look less trustworthy when they present as the main sales page.

Recommended fix:

Add unique metadata for homepage, privacy, terms, and security pages. Keep root metadata as a safe fallback only.

6. Missing Open Graph and Twitter Card metadata.

Evidence:

- `social_meta_checker.py` scored the homepage `0/100`.
- Missing `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, and `twitter:card`.

Impact:

This does not directly prevent ranking, but it hurts share quality, previews in private communities, and entity consistency across platforms.

Recommended fix:

Add `openGraph` and `twitter` metadata through Next metadata exports. Ship a stable social preview image or an App Router generated OG image.

7. No structured data.

Evidence:

- Raw parse detected no JSON-LD on homepage or legal pages.

Impact:

Structured data helps search systems understand the entity, page type, product category, and relationship between pages. It is also useful source material for answer engines.

Recommended fix:

Add JSON-LD for:

- `Organization`
- `WebSite`
- `WebPage`
- `SoftwareApplication` or `Product`
- `Offer`, only if public pricing is real and current
- `BreadcrumbList` for legal pages

Do not add fake review/rating schema. Do not add FAQPage or HowTo schema for this homepage; Google has removed or heavily limited those rich-result surfaces. Visible Q&A content can still be useful without FAQ schema.

8. Missing `llms.txt` and `llms-full.txt`.

Evidence:

- `llms_txt_checker.py` found no `/llms.txt`.
- No `/llms-full.txt` exists.

Impact:

Google says `llms.txt` is not needed for Google Search and does not provide a Google ranking lift. For AI-search and agent use, it can still serve as a clean map of canonical product facts, public URLs, and allowed references.

Recommended fix:

Add `/llms.txt` with:

- 40-60 word product definition
- Canonical homepage URL
- Public legal URLs
- Pricing/demo path
- Product capabilities
- Intended audience
- Security/data-use summary
- Contact/demo link
- Crawler policy summary

Add `/llms-full.txt` only if the team will maintain a fuller version.

9. Homepage lacks a direct answer block for "What is Argos?"

Evidence:

- The page has strong product language, but no concise product definition block.
- It does not clearly answer category, audience, deployment state, pricing, integrations, or limitations in extraction-friendly sections.

Impact:

AI answers tend to favor pages that make direct claims in stable, concise language. Current copy is more campaign-style than answer-ready.

Recommended fix:

Add a visible definition near the top:

> Argos is a web platform for sales teams that turns real sales calls into scored evidence, coaching actions, roleplay practice, and progress signals managers can track across the team.

Then add compact sections for:

- Who it is for
- What it does
- How call review becomes coaching
- Pricing
- Security and data handling
- Integrations and upload sources
- How it differs from call recording or generic training tools

10. Product proof is stronger after render than in initial HTML.

Evidence:

- Raw HTML image extraction only found decorative logo-background references.
- The browser-rendered page loads product images from `/homepage-product/argos-dashboard.png`, `/homepage-product/argos-calls.png`, and `/homepage-product/argos-scorecard.png`.
- Those live images return 200 and are about 105-136 KB each.

Impact:

Google can render JavaScript when not blocked, but some AI agents and lightweight crawlers rely more heavily on initial HTML or early fetches. The product screenshots and their alt text should not be the only source of product proof.

Recommended fix:

Ensure the core product proof is present in server-rendered HTML. If the carousel is client-driven, add static fallback copy and at least one representative image in initial markup or a `noscript` fallback.

11. Security and trust headers are incomplete.

Evidence:

- `security_headers.py` score: `45/100`.
- Present: HSTS.
- Missing: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

Impact:

This is not a classic ranking factor, but security posture affects trust, enterprise buyer confidence, and the quality of public technical due diligence.

Recommended fix:

Add conservative headers in `next.config.ts` or Vercel config. Test authenticated routes before enforcing a strict CSP.

12. Public pricing is called for by the canonical source of truth but not visible.

Evidence:

- `docs/public-homepage-source-of-truth.md` says the canonical flow should keep Solo, Team, Enterprise, annual pricing math, and the enterprise calendar link.
- Current local `landing-page.tsx` contains demo booking but no pricing section.
- Live homepage also did not show a pricing section in the captured page.

Impact:

This is both a content strategy issue and an AI SEO issue. If pricing is public, it should be visible, crawlable, reflected in schema, and referenced in `llms.txt`. If pricing is not public, the source of truth should be corrected.

Recommended fix:

Decide whether pricing should be public. If yes, restore the section and include pricing in sitemap/schema/AI docs. If no, update the canonical source-of-truth document and avoid stale pricing claims.

### Informational Positives

13. Primary homepage is live and indexable.

Evidence:

- HTTP 200.
- No `x-robots-tag: noindex` on `https://argos-v2-nine.vercel.app/`.
- Rendered desktop and mobile successfully.
- Console messages: 0.

14. Public legal pages exist and are crawlable.

Evidence:

- `/privacy-policy`, `/terms-of-service`, and `/security-policy` each return 200.
- Each page has meaningful H1/H2 content.

15. No broken homepage links were found.

Evidence:

- Broken link crawl found 6 links.
- Healthy links: 5.
- Broken links: 0.
- Redirected links: 1, the Google Calendar booking URL.

Optional improvement:

Use the final Google Calendar URL instead of the short `calendar.app.google` URL if reducing redirect hops matters.

## Technical SEO Audit

### Indexation

The primary Vercel URL is indexable and has no noindex header. The secondary Vercel alias has a noindex header, which is acceptable if it is intentionally treated as a duplicate alias. The final production domain still needs to be clarified because `https://app.argos.ai/` did not resolve from this environment.

Actions:

- Pick the canonical public domain.
- Use that domain in `metadataBase`, sitemap, robots, schema, Open Graph, Twitter, and `llms.txt`.
- Keep preview/alias domains noindexed if they are not meant to rank.

### Robots

The missing robots file is not currently blocking Googlebot because Google treats 4xx robots responses as no restrictions. Still, Argos should publish one.

Recommended high-level policy:

- Allow `/`, legal pages, pricing/demo pages, static assets, and public product pages.
- Disallow authenticated app paths where applicable.
- Include `Sitemap: https://<canonical-domain>/sitemap.xml`.
- Allow AI search crawlers where discovery is desired.
- Decide separately on training crawlers versus search/user-triggered crawlers.

### Sitemap

Current sitemap status is 404. This should be fixed before any Search Console submission.

Minimum sitemap URLs:

- `/`
- `/privacy-policy`
- `/terms-of-service`
- `/security-policy`

Add later if public:

- `/pricing`
- `/security`
- `/integrations`
- `/sales-call-scorecards`
- `/sales-coaching-roleplay`
- `/demo`

### Canonicals

Every public page should have a canonical URL. This is especially important because current crawl evidence includes multiple Vercel aliases and possible domain uncertainty.

### Metadata

The live homepage title and description are better than the local root fallback, but legal pages inherit duplicates. Route-level metadata should become the source of truth.

Suggested homepage metadata direction:

- Title: `Argos | Sales Coaching From Real Call Evidence`
- Description: `Argos turns real sales calls into scored evidence, manager coaching actions, roleplay practice, and progress signals for sales teams.`

If the team keeps the live "Sales Standard Installation Platform" positioning, use that consistently instead.

## Content SEO Audit

### Strengths

- The page has one clear H1.
- The core product loop is understandable.
- The page includes strong terms around call review, scorecards, coaching, roleplay, training assignments, and manager dashboards.
- The page is not thin by word count.
- Legal/security pages exist.

### Gaps

- No direct "What is Argos?" answer block.
- No public pricing despite source-of-truth instructions.
- No public comparison or alternatives content.
- No dedicated integration/source pages.
- No obvious About, contact, customer proof, case study, docs, or changelog surfaces.
- Demo video area is still a placeholder.
- Readability script flagged high complexity, although that result is low-confidence because raw extracted page text concatenates UI blocks.

Recommended public content model:

- Homepage: entity definition, product loop, proof, pricing/demo, trust.
- `/pricing`: current plans, annual math, enterprise path.
- `/security`: clearer trust page, not only policy.
- `/integrations`: Zoom/upload/recording sources if supported.
- `/sales-call-scorecards`: buyer-intent use case page.
- `/sales-coaching-roleplay`: buyer-intent use case page.
- `/manager-dashboards`: product capability page.
- `/compare/call-recording-vs-coaching-platform`: educational comparison.

## AI SEO / AEO / GEO Audit

### Current Readiness

Argos is partially ready for AI search because the homepage content is crawlable and directly explains the product loop. It is not yet strong for answer engines because the page lacks a concise entity definition, structured data, `llms.txt`, and stable source-of-truth alignment.

### AI Crawler Access

Because there is no robots file, crawlers are default-allowed. That is acceptable but implicit. For AI-search goals, the site should explicitly allow search/user-triggered agents that the business wants to support.

Crawler notes from official docs:

- OpenAI distinguishes `ChatGPT-User` from automatic search crawling; `ChatGPT-User` is tied to user action.
- Anthropic documents `Claude-SearchBot` as a search-related crawler and warns that disabling it can reduce visibility in Claude search experiences.
- Perplexity recommends allowing its crawlers for search result surfacing and separates `PerplexityBot` from user-triggered agents.
- Google says normal SEO fundamentals still apply to AI experiences in Search.

### Answer Engine Gaps

The page should make these answers easy to extract:

- What is Argos?
- Who uses Argos?
- What problem does Argos solve?
- How does Argos score sales calls?
- How does Argos turn call review into coaching?
- Does Argos include roleplay practice?
- What dashboards do managers get?
- What data does Argos process?
- What integrations or upload sources are supported?
- How much does Argos cost?
- How is Argos different from call recording, conversation intelligence, or LMS tools?

### AI Content Artifacts

Recommended files/routes:

- `/llms.txt`: concise AI-agent index.
- `/llms-full.txt`: optional fuller explanation.
- `/pricing.md` or public `/pricing`: only if pricing is public and maintained.
- `/security`: human-readable trust page, not just policy text.

## Schema Audit

No JSON-LD is currently present. Add schema only for facts that are true and maintainable.

Recommended schema:

- `Organization`: Argos entity, canonical URL, logo, sameAs links if verified.
- `WebSite`: canonical site URL and site name. Do not include `SearchAction` unless the site has functional public search.
- `WebPage`: homepage and legal pages with name, description, URL, dateModified when available.
- `SoftwareApplication` or `Product`: category, operating system `Web`, application category, feature list.
- `Offer`: only if pricing is visible and current.
- `BreadcrumbList`: legal pages and any future product/use-case pages.

Avoid:

- Fake `Review` or `AggregateRating`.
- `FAQPage` and `HowTo` schema for this site. Visible FAQs are fine, but Google has removed or restricted those rich result surfaces.

## Image And Media Audit

Live rendered product images:

- `/homepage-product/argos-dashboard.png`: 200, about 105 KB.
- `/homepage-product/argos-calls.png`: 200, about 106 KB.
- `/homepage-product/argos-scorecard.png`: 200, about 136 KB.

Local public assets:

- `apps/web/public/argos-forge/*.webp`: about 56-92 KB each.
- `apps/web/public/argos-forge/*.png`: about 1.5-1.7 MB each.
- `apps/web/public/brand/argos-main-logo.jpg`: about 20 KB.
- `apps/web/public/brand/argos-wordmark.png`: about 24 KB.
- `apps/web/public/argos_logo_background.png`: about 28 KB.

Findings:

- Product images are reasonably sized on live.
- Heavy PNG duplicates should not be shipped or referenced if WebP equivalents are available.
- Logo images are decorative with surrounding labels/aria labels, which is acceptable.
- Demo video placeholder should be replaced or removed before serious SEO/social promotion.

## Performance And Core Web Vitals

PageSpeed API was rate-limited during the audit, so there is no reliable Lighthouse/CWV score in this report.

Observed positives:

- Homepage fetch and redirect check were fast in the audit environment.
- Desktop/mobile Playwright render succeeded.
- No console warnings or errors.
- Product images are not oversized.

Remaining verification:

- Run PageSpeed Insights or Lighthouse against the final deployed canonical domain.
- Check LCP element and image priority.
- Confirm CLS on the mobile nav/hero/product carousel.
- Verify font loading and icon font behavior.
- Confirm no unused large PNG assets are referenced.

## Security And Trust Audit

Strengths:

- HSTS is present.
- Privacy, terms, and security pages exist.
- Authenticated `/login` is private/no-cache.

Gaps:

- Missing CSP.
- Missing X-Frame-Options.
- Missing X-Content-Type-Options.
- Missing Referrer-Policy.
- Missing Permissions-Policy.
- Legal pages need unique metadata, canonicals, and schema.

Recommended first headers:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` or a CSP `frame-ancestors` policy, after checking embed needs.
- `Permissions-Policy` with unnecessary browser features disabled.
- A staged CSP, starting report-only if authenticated app scripts are complex.

## High-Impact Query Opportunities

The current homepage can support these themes after metadata, schema, and answer-ready content are added:

- sales call coaching software
- sales call scorecard platform
- sales coaching roleplay software
- sales manager coaching dashboard
- turn sales calls into coaching
- call review scorecard for sales teams
- sales training assignments from real calls
- conversation intelligence vs sales coaching software

Recommended page clusters:

- Sales call scorecards
- Sales coaching roleplay
- Manager dashboards
- Training assignments
- Call review workflow
- Security and data handling
- Pricing
- Comparisons

## Limitations

- No Google Search Console, Bing Webmaster Tools, or analytics access was used.
- PageSpeed API was rate-limited, so no CWV score is included.
- The final production domain is unresolved from this environment.
- Local working tree is dirty and includes many changes unrelated to this audit.
- Production appears to differ from the current local working tree, so all implementation should start by reconciling release source and canonical domain.

## Bottom Line

Argos does not have a crawl-blocking disaster on the primary live URL. The real problem is incomplete SEO infrastructure plus source-of-truth drift. Fix the deployment/source mismatch first, then ship sitemap, robots, canonicals, metadata, schema, `llms.txt`, and answer-ready public content in that order.
