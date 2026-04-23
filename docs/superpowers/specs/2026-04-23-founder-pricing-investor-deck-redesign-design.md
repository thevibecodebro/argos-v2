# Founder Pricing Investor Deck Redesign

Date: 2026-04-23
Status: Approved design draft
Owner: Codex

## Objective

Rewrite the existing founder pricing HTML artifact into a clearer investor-style slide deck that is easy to scan, visually aligned with Argos, and defensible in founder, investor, and diligence conversations.

The redesigned artifact must stop behaving like a dual deck-plus-memo experience. It should become a pricing-focused HTML presentation with a concise main deck and a short diligence appendix.

## Current State

The current implementation lives in:

- [site/founder-pricing/content.js](/Users/thevibecodebro/Projects/argos-v2/.worktrees/founder-pricing-html-deck/site/founder-pricing/content.js)
- [site/founder-pricing/render.js](/Users/thevibecodebro/Projects/argos-v2/.worktrees/founder-pricing-html-deck/site/founder-pricing/render.js)

The current artifact has two problems:

- it splits the experience between `Deck` and `Memo`, which makes the narrative harder to read
- the content is too abstract and not explicit enough about pricing structure, vendor costs, unit economics, and downside controls

The redesign replaces that with one primary slide-deck flow and an appendix that carries diligence detail without bloating the main story.

## Canonical Business Assumptions

These assumptions were explicitly approved in design review and must remain internally consistent across the deck, appendix, and any supporting docs:

- `Solo`: `$79 / month`
- `Team`: `$50 / seat / month`
- `Team minimum`: `3 seats`
- annual billing is supported and modeled at `10%` off list price
- included live voice: `120 live minutes per seat`
- `Solo` gets the same included live voice allowance as a single Team seat
- public overage is packaged as prepaid voice credit packs, not raw metered per-minute billing
- internal planning rate for underwriting:
  - `Solo`: `$0.39 / minute`
  - `Team`: `$0.29 / minute`
- recommended public voice credit packs:
  - `Solo`: `250 minutes for $125`
  - `Team`: `500 minutes for $175`
  - `Team`: `2,000 minutes for $600`
- purchased credit packs do not expire while the customer remains subscribed
- `HighLevel $97 / month` is included in the base recurring software stack
- `Zoom` is excluded from the base recurring software stack
- Stripe is shown separately from core product COGS
- Stripe assumptions:
  - `2.9% + 30¢` standard domestic card processing
  - `0.7%` Stripe Billing on recurring billing volume
- the deck must support two conclusions:
  - product gross margins are strong
  - live voice usage is controllable rather than open-ended

## Source-Of-Truth Policy

This redesign must follow the investor-materials rule that all fundraising assets agree with each other.

The HTML deck is not allowed to invent new numbers in the browser layer. It must be driven by one canonical structured content model that contains:

- pricing inputs
- vendor rates
- usage assumptions
- unit-economics outputs
- sensitivity outputs
- verification date
- source links or source labels for vendor pricing

During implementation, every vendor rate in the deck must be re-verified against official vendor pricing pages current on the implementation date. The deck should visibly state:

- `Verified: April 23, 2026` for the current rewrite

If any verified vendor rate differs from the assumptions above, the content model must be updated first and every dependent slide must be recomputed from that same source.

## Audience

Primary audience:

- founders using the deck in investor conversations
- investors evaluating pricing discipline, margin quality, and usage risk
- diligence readers who want exact unit-economics assumptions without reading a long memo

Secondary audience:

- internal operators using the deck as the pricing narrative counterpart to the underlying model

## Non-Goals

- no memo mode
- no prose-heavy one-page article view
- no company overview, market narrative, or product demo section
- no billing implementation or live quoting workflow
- no generic slide framework for arbitrary future decks
- no new pricing experimentation inside this redesign

## Experience Shape

### Core Recommendation

Build a product-led investor deck with a compact appendix.

The main deck should read like a sharp pricing narrative. The appendix should read like diligence support. Both should live in the same HTML artifact, with deck navigation as the primary experience.

### Reading Model

The artifact should have two reading layers:

1. Main deck
   - `8-10` slides
   - strong visual hierarchy
   - minimal text
   - only numbers that materially matter
2. Appendix
   - shorter than the main deck
   - exact rate cards, formulas, and scenario tables
   - navigable, but visually quieter

This is not a deck-plus-memo toggle. It is one deck that continues into a diligence appendix.

## Information Architecture

### Main Deck

The approved core slide order is:

1. Pricing architecture
2. Included usage and voice policy
3. Official vendor cost stack
4. Base usage assumptions
5. Seat economics: Solo vs Team
6. Voice sensitivity and downside control
7. Org-level margin outcomes
8. Monthly vs annual billing economics
9. Closing thesis

### Appendix

The appendix should include:

1. exact vendor rate card details
2. collected-margin treatment including Stripe
3. formula detail and modeling assumptions
4. voice credit pack logic
5. scenario tables and sensitivity tables

### Slide Intent

#### 1. Pricing Architecture

Show only the commercial structure:

- `Solo $79 / month`
- `Team $50 / seat / month`
- `3-seat minimum`
- annual prepay available at `10%` off

This slide should answer, in one screen, how the product is sold.

#### 2. Included Usage And Voice Policy

Show:

- `120 live minutes included per seat`
- pooled at the org level for Team
- public overage through prepaid credit packs
- purchased credit packs do not expire while the customer remains subscribed
- internal underwriting rates are not the public pricing mechanic

This slide must make the usage promise legible without exposing internal finance jargon.

#### 3. Official Vendor Cost Stack

Show the base software and API stack that matters to unit economics, including:

- OpenAI
- Vercel
- Supabase
- Fly.io
- HighLevel
- Resend or other email layer if used in the current model
- Stripe processing and Billing as a separate payment line, not buried inside core product COGS

`Zoom` should not appear as a base recurring cost.

This slide should summarize the stack in a way that looks investor-readable, with exact rate detail deferred to appendix slides.

#### 4. Base Usage Assumptions

Show the few assumptions that drive the model:

- voice minutes per seat included
- call scoring / transcription assumptions if still part of the current pricing model
- pooled usage behavior
- software floor assumptions

The point is to show that the model has explicit inputs rather than hand-wavy averages.

#### 5. Seat Economics: Solo vs Team

Show unit economics clearly for:

- `Solo`
- `Team at minimum contract size`
- a representative mid-sized Team example

This slide should show both:

- product gross margin
- collected gross margin after Stripe

#### 6. Voice Sensitivity And Downside Control

Show what happens as voice usage rises, and why the downside is controlled.

Controls that should be made explicit:

- included minutes are bounded
- usage is pooled
- overage moves into prepaid credit packs
- live voice is not sold as unlimited

This slide should support the conclusion that voice is the main variable but not an unmanaged liability.

#### 7. Org-Level Margin Outcomes

Show how economics behave for different customer sizes.

This should reinforce:

- small customers remain viable
- Team economics improve with scale
- the `3-seat minimum` matters

#### 8. Monthly Vs Annual Billing Economics

Show:

- monthly list pricing
- annual pricing at `10%` off
- why annual improves cash collection and slightly improves payment-fee efficiency

This slide should not oversell annual as a margin unlock. It is primarily a commercial and cash-flow tool.

#### 9. Closing Thesis

End with a compressed investor conclusion:

- pricing is simple
- margins are strong
- live voice is controlled
- overage is monetized

## Visual Direction

### Theme

The deck must stay in the Argos product theme rather than defaulting to a generic startup-deck style.

Use the existing Argos palette as the base:

- background: `#0b0e14`
- primary surface: `#10131a`
- secondary surface: `#161a21`
- elevated surface accents: `#1c2028`, `#22262f`
- primary text: `#ecedf6`
- secondary text: `#a9abb3`
- primary accent: `#74b1ff`
- tertiary accent: `#6dddff`
- outline: `#45484f`

Typography:

- display: `Space Grotesk`
- body: `Source Sans 3`

### Visual Rules

- no memo toggle
- no long dense text blocks in the core deck
- each slide must fit inside one viewport with no internal scrolling
- tables must be simplified to the minimum rows and columns needed for the slide
- appendix slides can be denser than core slides, but still must fit the viewport
- avoid template-like purple gradients, bright startup marketing colors, or white-slide aesthetics
- motion should be restrained and purposeful

### Composition Guidance

The visual tone should feel like:

- product-native
- analytical
- crisp
- investor-grade

It should not feel like:

- a blog post
- a memo rendered in slides
- a generic pitch-template export

## Content And Writing Rules

Use an operator-style writing voice:

- direct
- specific
- low on hype
- no filler transitions
- use exact numbers where available

Main-deck slide copy should follow these density rules:

- one title
- one short subhead or framing line if needed
- no more than `4-6` bullets on content slides
- no more than `3` headline numbers on metric-heavy slides unless a table is clearer

The appendix can be denser, but still should favor compact tables and labels over paragraphs.

## Interaction Model

Required:

- keyboard navigation
- click navigation
- mouse-wheel navigation with debounce / guardrails
- touch / swipe navigation
- slide progress indicator
- reduced-motion support

Optional but recommended:

- a compact appendix jump menu
- a visible separator between core deck and appendix

The default entry should land on the first pricing slide, not a cover screen.

## Content Model Changes

The structured content object should be redesigned around a real pricing deck model.

It should support:

- global metadata
- theme tokens
- canonical pricing assumptions
- vendor rate cards
- slide definitions
- appendix definitions
- source references

The current `memoSections` structure should be removed.

The content model should make it hard to drift between:

- pricing assumptions
- displayed tables
- conclusion statements

## Implementation Boundaries

This redesign should remain:

- static
- zero-dependency by default
- publishable to GitHub Pages
- isolated from the main Next.js application runtime

The existing founder-pricing site can remain in the current static site area, but the implementation should explicitly replace:

- dual-mode deck/memo navigation
- generic abstract summaries
- outdated pricing assumptions such as the old single-tier framing

## Verification Requirements

Before implementation is considered complete, the rewrite must verify:

- all vendor rates used in the deck were checked against official sources on the current date
- the structured content model matches approved pricing assumptions
- every slide fits the viewport at standard desktop and mobile checkpoints
- keyboard, wheel, and touch navigation still work
- appendix slides remain readable without scrolling
- no memo-mode UI remains
- published path remains `/argos-v2/founder-pricing/`

## Open Decisions Resolved In Design

These questions are now settled and should not be re-opened during implementation unless the user changes direction:

- deck focus is pricing and unit economics only
- no company intro slides
- no memo mode
- product-led investor visual style, not board-pack austerity
- main deck plus diligence appendix is the preferred format
- Stripe should be separated from core product COGS in margin presentation
- both monthly and annual pricing are shown
- annual uses a `10%` discount
- public overage is packaged as credit packs, not public metered billing
- purchased credit packs do not expire while the customer remains subscribed
- `HighLevel` stays in the base software stack
- `Zoom` stays out of the base software stack

## Success Criteria

The redesign succeeds if:

- a founder can present the main deck without explaining away confusing slides
- an investor can understand pricing architecture, cost structure, and margin logic in one pass
- a diligence reader can inspect appendix detail without needing a separate memo
- the artifact feels like Argos, not a detached microsite
- the final numbers remain internally consistent and source-defensible
