# Argos SEO + AI SEO Action Plan

Date: June 17, 2026
Audit report: `FULL-AUDIT-REPORT.md`
Machine-readable findings: `SEO-FINDINGS.json`

## Priority Order

Do the work in this order. The first step matters most because the live page, local source, and homepage source-of-truth document currently disagree.

1. Reconcile the canonical public narrative and production domain.
2. Ship technical SEO basics: metadata, canonicals, robots, sitemap.
3. Add schema and social preview metadata.
4. Add AI-search artifacts and answer-ready homepage content.
5. Restore or remove public pricing, depending on the real product decision.
6. Improve trust headers and verify performance after deploy.

## Phase 0: Decisions Before Code

Owner: product/engineering
Target time: same day

Decisions needed:

- Final canonical public URL: `https://argos-v2-nine.vercel.app/`, `https://app.argos.ai/`, or another domain.
- Canonical homepage narrative:
  - Current live H1: `Build a sales team that actually follows the playbook.`
  - Current repo source of truth: `Sales teams changed. Coaching them should have too.`
- Public pricing:
  - `docs/public-homepage-source-of-truth.md` says to keep Solo, Team, Enterprise, and annual pricing math.
  - Current local homepage source does not include pricing.
- AI crawler posture:
  - Allow search/user-triggered crawlers by default if AI discovery is desired.
  - Decide separately whether training crawlers should be allowed.

Acceptance criteria:

- One canonical domain is chosen.
- One homepage narrative is chosen.
- Pricing decision is reflected in `docs/public-homepage-source-of-truth.md`.
- The deploy source that produces production is identified.

## Phase 1: Technical SEO Foundation

Owner: engineering
Target time: 0.5-1 day

Files to touch:

- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/privacy-policy/page.tsx`
- `apps/web/app/terms-of-service/page.tsx`
- `apps/web/app/security-policy/page.tsx`
- `apps/web/app/robots.ts` new
- `apps/web/app/sitemap.ts` new
- Optional: `apps/web/lib/seo/site.ts` new

Tasks:

- Add a single `siteUrl` helper, sourced from a public env var or constant, with a safe production fallback.
- Set `metadataBase` in root metadata.
- Add a title template and useful default description in root metadata.
- Add route-specific homepage metadata.
- Add route-specific legal-page metadata.
- Add canonical URLs for all public pages.
- Add `robots.ts` with public/private crawl rules and `Sitemap:`.
- Add `sitemap.ts` with the homepage and public legal pages.
- Keep preview/duplicate Vercel aliases noindexed if they are not canonical.

Suggested metadata targets:

- Homepage title: `Argos | Sales Coaching From Real Call Evidence`
- Homepage description: `Argos turns real sales calls into scored evidence, manager coaching actions, roleplay practice, and progress signals for sales teams.`
- Privacy title: `Privacy Policy | Argos`
- Terms title: `Terms of Service | Argos`
- Security title: `Security Policy | Argos`

Acceptance criteria:

- `/robots.txt` returns 200.
- `/sitemap.xml` returns 200.
- Homepage has a canonical URL.
- Legal pages have unique title/description/canonical values.
- Primary production URL has no noindex.
- Duplicate aliases remain noindexed if intended.

## Phase 2: Social Metadata And Preview Asset

Owner: engineering/design
Target time: 0.5 day

Files to touch:

- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- Optional: `apps/web/app/opengraph-image.tsx`
- Optional: `apps/web/public/og/argos-home.png`

Tasks:

- Add `openGraph` metadata for public pages.
- Add `twitter` card metadata.
- Add or generate a stable 1200x630 social image.
- Use the canonical public URL in `og:url`.
- Use `summary_large_image` for Twitter.

Acceptance criteria:

- Social metadata checker reports no missing required OG/Twitter fields.
- Shared preview title, description, and image match the chosen homepage narrative.

## Phase 3: Structured Data

Owner: engineering
Target time: 0.5-1 day

Files to touch:

- Optional: `apps/web/components/public/seo-json-ld.tsx` new
- `apps/web/app/page.tsx`
- `apps/web/app/privacy-policy/page.tsx`
- `apps/web/app/terms-of-service/page.tsx`
- `apps/web/app/security-policy/page.tsx`

Tasks:

- Add JSON-LD rendering helper that safely stringifies structured data.
- Add `Organization` schema.
- Add `WebSite` schema.
- Add homepage `WebPage` schema.
- Add `SoftwareApplication` or `Product` schema.
- Add `Offer` schema only if public pricing is restored and accurate.
- Add `BreadcrumbList` schema for public legal pages.

Rules:

- Do not add fake reviews or aggregate ratings.
- Do not add FAQPage or HowTo schema for this homepage.
- Do not include `SearchAction` unless public site search exists.
- Use `sameAs` only for verified real Argos profiles.

Acceptance criteria:

- Raw HTML contains JSON-LD.
- Google Rich Results Test or schema validator finds no fatal errors.
- Schema names, descriptions, and URLs match metadata and visible content.

## Phase 4: AI SEO / AEO Content

Owner: product/content/engineering
Target time: 1-2 days

Files to touch:

- `apps/web/components/public/landing-page.tsx`
- `apps/web/components/public/landing-page.module.css`
- `apps/web/app/llms.txt/route.ts` new
- Optional: `apps/web/app/llms-full.txt/route.ts` new
- Optional future public pages under `apps/web/app/*`

Tasks:

- Add a direct answer block near the top of the homepage:

```text
Argos is a web platform for sales teams that turns real sales calls into scored evidence, coaching actions, roleplay practice, and progress signals managers can track across the team.
```

- Add compact sections that answer:
  - Who Argos is for.
  - What Argos does.
  - How a call becomes coaching.
  - What roleplay practice does.
  - What managers can track.
  - What data Argos processes.
  - What integrations/upload sources are supported.
  - How pricing works, if public.
- Add `/llms.txt` with canonical product facts and public URL inventory.
- Add `/llms-full.txt` only if the fuller version will be maintained.
- Ensure product proof is available in server-rendered HTML, not only after client rendering.

Acceptance criteria:

- `/llms.txt` returns 200.
- The homepage has a concise extractable product definition in visible text.
- Raw HTML includes enough product proof for a non-JS crawler to understand the product.
- The AI artifact does not contradict page metadata or schema.

## Phase 5: Pricing And Buyer-Intent Pages

Owner: product/engineering
Target time: 1-3 days, depending on scope

Decision:

- If pricing is public, restore it visibly.
- If pricing is private or sales-led, remove stale pricing instructions from the canonical source of truth.

If pricing is public, tasks:

- Add pricing section to homepage or create `/pricing`.
- Include Solo, Team, Enterprise, annual math, and enterprise calendar link if still accurate.
- Add pricing URL to sitemap.
- Add pricing summary to `/llms.txt`.
- Add `Offer` schema only for accurate public pricing.

Recommended future pages:

- `/sales-call-scorecards`
- `/sales-coaching-roleplay`
- `/manager-dashboards`
- `/training-assignments`
- `/integrations`
- `/security`
- `/compare/call-recording-vs-sales-coaching-platform`

Acceptance criteria:

- No stale pricing claims exist in docs, page copy, schema, or AI files.
- Public pricing, if present, is consistent everywhere.

## Phase 6: Trust Headers And Security Presentation

Owner: engineering
Target time: 0.5-1 day

Files to touch:

- `apps/web/next.config.*` or existing app-level/Vercel header config
- Optional: public security page content

Tasks:

- Add `X-Content-Type-Options: nosniff`.
- Add `Referrer-Policy: strict-origin-when-cross-origin`.
- Add `X-Frame-Options: DENY` or CSP `frame-ancestors`.
- Add conservative `Permissions-Policy`.
- Add CSP in report-only mode first if authenticated app scripts are complex.
- Improve public security page metadata and schema.

Acceptance criteria:

- Security header checker improves from 45/100.
- Authenticated app flows still work.
- Public security page remains crawlable and canonicalized.

## Phase 7: Performance Verification

Owner: engineering
Target time: 0.5 day after deploy

Tasks:

- Rerun PageSpeed Insights or Lighthouse after final deploy.
- Confirm mobile LCP element and image priority.
- Confirm CLS around hero/nav/product carousel.
- Confirm no unused heavy PNGs are referenced.
- Confirm fonts do not create excessive layout shift.

Acceptance criteria:

- CWV data or Lighthouse numbers are recorded in the release notes.
- Any LCP/CLS issue has an owner and ticket.

## Verification Commands

Run from the repo root unless noted.

SEO scripts:

```bash
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/fetch_page.py https://<canonical-domain>/ --output /tmp/argos-home.html
env PYTHONPATH=/private/tmp/argos-seo-pydeps python3 /Users/thevibecodebro/.codex/skills/seo/scripts/parse_html.py /tmp/argos-home.html --url https://<canonical-domain>/ --json
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/robots_checker.py https://<canonical-domain>/
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/llms_txt_checker.py https://<canonical-domain>/
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/social_meta_checker.py https://<canonical-domain>/
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/security_headers.py https://<canonical-domain>/
python3 /Users/thevibecodebro/.codex/skills/seo/scripts/broken_link_checker.py https://<canonical-domain>/ --max-pages 25
```

Repo tests to prioritize:

```bash
npm --workspace @argos-v2/web test -- lib/public-landing-page.test.ts
npm --workspace @argos-v2/web test -- lib/public-homepage-source-of-truth.test.ts
npm --workspace @argos-v2/web test -- lib/legal-pages.test.ts
```

Browser verification:

```bash
npx playwright test --project=chromium
```

If the project does not have a matching Playwright suite, use the existing CLI/browser verification path used in the audit and capture desktop/mobile screenshots again.

## Definition Of Done

The SEO/AI SEO remediation is complete when:

- Canonical production domain is confirmed.
- Production homepage, source code, tests, docs, metadata, schema, and `llms.txt` all use the same product narrative.
- `/robots.txt`, `/sitemap.xml`, and `/llms.txt` return 200.
- Public pages have canonical URLs.
- Homepage and legal pages have unique metadata.
- OG/Twitter metadata is complete.
- JSON-LD is present and valid.
- Public pricing is either restored consistently or removed from the source of truth.
- Security headers are improved without breaking authenticated app flows.
- PageSpeed/Lighthouse or CrUX evidence is captured after deploy.
- Live verification is run against the final public URL, not only localhost or a preview alias.
