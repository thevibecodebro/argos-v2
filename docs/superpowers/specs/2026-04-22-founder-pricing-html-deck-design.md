# Founder Pricing HTML Deck Design

Date: 2026-04-22
Status: Approved design draft
Owner: Codex

## Objective

Convert the existing Argos founder pricing deck and supporting founder pricing memo into a static HTML experience that can be published to GitHub Pages from this repository.

The result must serve two use cases from one source of truth:

1. a keyboard-navigable investor slide deck suitable for presentation
2. a readable founder-grade memo appendix suitable for diligence and internal reference

The HTML version must feel native to Argos rather than like a disconnected microsite.

## Canonical Source Of Truth

The HTML artifact must inherit all numbers and claims from the current finance source files:

- [2026-04-22-seat-pricing-model.md](/Users/thevibecodebro/Projects/argos-v2/docs/finance/2026-04-22-seat-pricing-model.md)
- [2026-04-22-investor-scenario-model.md](/Users/thevibecodebro/Projects/argos-v2/docs/finance/2026-04-22-investor-scenario-model.md)
- [Argos Founder Pricing Deck - output.pptx](/Users/thevibecodebro/Projects/argos-v2/docs/finance/outputs/2026-04-22-argos-pricing-deck/output.pptx)

The HTML version must not introduce new pricing assumptions or alternate numbers. If the source pricing docs change later, the HTML deck should be updated from those source docs rather than edited ad hoc.

## User-Approved Direction

The output will be:

- a standalone static HTML site
- published separately from the Next.js app
- deployed to GitHub Pages using the repository’s default Pages URL
- structured as both a slide deck and a memo in one coherent experience
- styled in the same visual language as the Argos application

## Audience

Primary audiences:

- founders using the deck in investor conversations
- investors reviewing pricing and unit economics
- board or diligence readers who need to inspect assumptions in more detail

Secondary audience:

- internal team members using the artifact as a pricing source companion to the markdown memo

## Non-Goals

- rebuilding the entire finance workflow inside the web app
- replacing the markdown source docs as the canonical source of truth
- deploying through Vercel or the Next.js runtime
- creating a CMS or admin editing surface
- building a generic presentation framework for arbitrary future decks

## Experience Shape

### High-Level Structure

The site will be a dual-mode static presentation:

- `Deck` mode: full-screen slide presentation with keyboard, click, wheel, and touch navigation
- `Memo` mode: same content expanded into readable founder documentation on one page

Both modes will live inside the same published artifact and share one content model, one design system, and one deployment.

### Routing / Published Path

GitHub Pages target:

- `https://thevibecodebro.github.io/argos-v2/founder-pricing/`

The static build should therefore be emitted under a dedicated Pages output folder that maps cleanly to `/founder-pricing/`.

### Navigation Model

The experience needs:

- a top-level mode switch between `Deck` and `Memo`
- in deck mode:
  - next / previous navigation
  - keyboard arrow navigation
  - wheel navigation with guardrails to prevent accidental skipping
  - touch / swipe navigation
  - a visible slide index / progress indicator
- in memo mode:
  - anchored sections
  - a sticky section nav or compact contents rail

## Visual Direction

### Core Recommendation

Use a hybrid visual system weighted toward the authenticated Argos product shell, with a restrained amount of landing-page atmosphere.

This means:

- structural rhythm and credibility from the product shell
- modest cinematic polish from the landing page
- no abrupt shift into a generic marketing-deck look

### Application-Driven Visual Tokens

Use the real Argos design language from the current app:

- background: `#0b0e14`
- primary surface: `#10131a`
- secondary surface: `#161a21`
- elevated surface accents: `#1c2028`, `#22262f`
- primary text: `#ecedf6`
- secondary text: `#a9abb3`
- primary accent: `#74b1ff`
- tertiary accent: `#6dddff`
- thin outline / separators: `#45484f`

Typography must match the app:

- display: `Space Grotesk`
- body: `Source Sans 3`

### Visual Rules

- keep the artifact dark and product-native
- use rounded dark panels and thin outline borders for information blocks
- use subtle blue/cyan glow fields in the background, not loud gradients
- use motion sparingly and only to clarify navigation or stage hierarchy
- avoid “startup template” aesthetics, especially generic center-stacked gradient slides
- maintain high contrast and operational clarity for numeric content

### Design Metaphor

The deck should feel like a “Founder OS” view of the Argos product:

- investor-grade narrative framing
- product-shell information density
- slightly more editorial composition than the app itself

## Information Architecture

### Deck Mode Slide Order

1. Cover
2. Product truth from the codebase
3. Official vendor rate card
4. Pricing architecture and controls
5. Direct cost stack
6. Team-size economics under the standard allowance
7. Voice sensitivity
8. ARR scale
9. Founder conclusion

### Memo Mode Sections

1. Executive summary
2. Product truth from the current codebase
3. Official vendor pricing
4. Modeling boundary: core COGS vs optional software vs internal tooling
5. Packaging recommendation and voice guardrails
6. Unit economics and margin sensitivity
7. Founder recommendations
8. Sources and verification date

### Relationship Between Modes

Deck mode and memo mode must describe the same story at different densities.

Deck mode:

- concise
- presentation-first
- visually staged

Memo mode:

- fuller explanation
- explicit assumptions
- more scannable tables and detail

The content model should map each deck slide to one or more memo sections so the two modes cannot drift.

## Content System

The site should use one canonical structured content object rather than two separately authored bodies of copy.

That content object should hold:

- slide titles
- slide summaries
- metrics
- tables
- sensitivity values
- memo paragraphs
- source notes

This ensures:

- one place to update pricing assumptions
- no silent mismatch between deck mode and memo mode
- easier maintenance when the markdown source docs change

## Implementation Approach

### Recommended Approach

Build a standalone static HTML presentation for GitHub Pages, separate from the Next.js app.

Why:

- lower deployment risk
- no runtime dependency on the app
- easier GitHub Pages publishing
- portable artifact
- easier to review locally and in GitHub Pages

### Technical Shape

- static files only
- no dependency on the existing web app runtime
- no requirement for React or Next.js
- prefer a single self-contained entrypoint plus minimal static assets
- keep the build simple enough that GitHub Pages deployment is deterministic

### Deployment Model

Add a GitHub Actions workflow that publishes the dedicated static output directory to `gh-pages`.

This workflow should:

- build the founder pricing site artifact
- deploy only that output to the Pages branch
- remain isolated from the existing Next.js deployment path

### Directory Intent

The implementation should live in a dedicated area clearly scoped to this artifact, for example:

- source files under a static presentation folder
- built output under a Pages-target folder such as `docs/founder-pricing/` or similar

The final exact folder can be chosen during implementation planning, but the key design constraint is isolation from the application runtime.

## Interaction Requirements

### Deck Mode

Required:

- keyboard navigation
- click or button navigation
- wheel navigation
- touch / swipe navigation
- progress indicator
- reduced-motion support

Expected:

- lightweight slide transitions
- no internal scrolling inside slides
- every slide fits one viewport

### Memo Mode

Required:

- continuous readable document flow
- section anchors
- sticky navigation or section index
- readable tables on desktop and mobile

## Responsive Requirements

The artifact must work at:

- 1920x1080
- 1280x720
- 768x1024
- 375x667
- 667x375

Rules:

- deck slides must fit within one viewport
- no internal slide scrollbars
- if content is too dense for a slide, it must be split into an additional slide
- memo mode may scroll normally, but spacing and tables must remain readable on mobile

## Accuracy Requirements

This artifact is founder and investor facing, so accuracy rules are strict:

- every number must match the current markdown source of truth
- every vendor price must match the verified official pricing references currently cited in the source docs
- the verification date must remain visible in the memo context
- the HTML artifact must not present inferred values as official vendor list prices

## Accessibility Requirements

- semantic HTML structure
- sufficient text contrast
- keyboard-accessible mode switching and slide navigation
- reduced-motion support
- readable focus states

## Success Criteria

The work is successful when:

1. the HTML artifact presents the full founder pricing story in both slide and memo form
2. the design feels clearly native to Argos
3. the artifact publishes successfully to GitHub Pages under the repo’s default Pages URL structure
4. deck and memo modes remain numerically consistent with the markdown pricing docs
5. the result is credible in an investor or board setting, not merely visually attractive

## Risks And Mitigations

### Risk: deck and memo content drift

Mitigation:

- one shared structured content source
- source docs remain canonical

### Risk: visual mismatch with the app

Mitigation:

- use actual app tokens, typography, and panel rhythm from the authenticated shell

### Risk: GitHub Pages deployment complexity

Mitigation:

- keep the build static and isolated from the Next.js app
- deploy only the dedicated presentation output

### Risk: slide density overwhelms deck mode

Mitigation:

- split dense content across additional slides during implementation
- preserve detail for memo mode instead of forcing it into slide mode

## Open Decision Resolved In Design

The following decisions are now fixed:

- deploy as standalone static site on `gh-pages`
- use the repository’s default GitHub Pages URL, not a custom domain
- ship both deck and memo experiences in one artifact
- use an Argos-authenticated-shell-first visual system with restrained landing-style atmosphere

## Implementation Handoff

The next phase should create an implementation plan covering:

- content model structure
- static file layout
- slide controller behavior
- memo layout behavior
- GitHub Pages workflow
- local verification flow
- deployment verification
