# Training Section Brand-Aligned Redesign

**Date:** 2026-04-21
**Status:** Revised and approved in principle
**Scope:** Reset the authenticated `/training` experience so it looks and behaves like the rest of Argos while preserving the module-led learning flow and strict rep/manager separation

---

## Overview

The first curriculum-studio implementation missed the target.

It solved some structural problems, but the resulting page still felt off-brand because it leaned too far into a bespoke training workspace instead of the established Argos product language.

The revised direction is intentionally narrower:

- keep the existing Argos shell
- do not introduce a promotional hero
- make the selected module stage the visual anchor
- use the same slab-and-panel language as Dashboard, Call Library, Highlights, and Roleplay
- progressively disclose manager tooling instead of leaving a large inline editor open in the page

This redesign should feel like the Training room inside the same application, not like a separate product or internal form builder.

This revision supersedes the earlier "editorial studio" interpretation wherever the two conflict.

---

## Goals

- Make Training feel visually native to the authenticated Argos product
- Give the page one clear primary surface instead of many same-weight containers
- Preserve a module-led learning flow for reps
- Keep manager operations available without letting authoring dominate the page
- Hide manager capabilities completely from reps
- Reduce cognitive load by keeping the main canvas stable while actions open focused utilities

## Non-Goals

- Rebrand Argos or introduce a new design system
- Add a separate marketing-style hero to Training
- Split Training into separate routes for reps and managers in this phase
- Invent a new color palette, typography system, or page chrome for Training
- Add new backend training capabilities beyond the current workflows

---

## Why The Previous Result Failed

### 1. The page looked like an internal editor, not product UI

The most visually dominant object on the page was the large inline editor. That made Training read like a back-office form builder instead of a first-class product surface.

### 2. Too many same-weight dark slabs

The page stacked several containers with similar color, border weight, and padding. That flattened hierarchy and made it hard to tell what deserved attention first.

### 3. The composition was not aligned with the reference pages

The strongest authenticated pages in Argos share a clear pattern:

- a restrained route header
- one strong lead surface
- a small number of quieter support surfaces
- focused utility interactions that do not permanently take over the page

Training drifted away from that pattern.

### 4. Manager tooling was always "on stage"

Manager actions should be accessible, but the page should not permanently expose the full authoring system at rest.

### 5. The page felt too custom

The previous result tried to establish its own mood. The revised direction is to borrow more directly from the actual product primitives already working elsewhere in the app.

---

## Approved Direction

### Product Reference Mix

The approved direction is:

- **Call Library discipline** for lead-surface hierarchy
- **Dashboard panels** for supporting surfaces
- **Roleplay-style focus** for high-intent interactions

This does **not** mean copying any page literally. It means Training should use the same composition logic.

### Core Decisions

- **Page shell:** existing `PageFrame`
- **Hero:** none
- **Primary anchor:** selected module stage
- **Supporting surfaces:** calmer Dashboard-style panels
- **Manager tooling:** compact at rest, expanded on demand
- **Rep/manager split:** strict and non-negotiable
- **Brand tone:** same Argos product language, not a separate editorial aesthetic

---

## Information Architecture

### Primary Narrative

The page should communicate one sequence:

`selected module -> current learning state -> next action`

That sequence is the page backbone for both reps and managers.

### Remove The "Mini-App" Feeling

Training should not behave like a nested application with several competing modes.

These should no longer read as peer-level sections of equal importance:

- modules
- quiz
- assignments
- team progress
- AI tools

Instead:

- the selected module is the page anchor
- lesson and quiz are local views of that module
- manager tools are contextual utilities around the module
- team progress is summarized, not treated as a separate destination

---

## Layout

### Route Header

Keep the existing `PageFrame` as the route-level header.

- no second hero
- no oversized decorative treatment
- no extra promotional section above the actual work

### Lead Module Stage

The first major surface below `PageFrame` should be the selected module stage.

This is the main visual anchor of the page.

It should contain:

- module title
- skill/category tag
- concise module description
- lesson/quiz toggle
- primary action
- compact state summary
- manager status strip when relevant

This panel can carry a subtle blue tint or wash, but it should still look like product UI, not a hero banner.

### Curriculum Map Panel

The curriculum map should sit below the lead stage as a quieter support surface.

It should read like structured navigation, not a second hero and not a stack of mini feature cards.

### Manager Planning Panel

Managers should see a compact planning surface below the curriculum map.

At rest, it shows:

- short planning summary
- create module
- edit selected module
- assign selected module
- generate with AI

It should not render the full authoring interface until one of those actions is invoked.

### Mobile Behavior

On mobile the layout collapses to a single column in this order:

1. route header
2. lead module stage
3. curriculum map
4. manager planning surface if applicable

All critical actions must remain available without side-by-side layout assumptions.

---

## Rep Experience

Reps should experience Training as a focused learning page, not as a reduced manager console.

### Rep Surface Order

Reps should see:

1. route header
2. selected module stage
3. curriculum map
4. rep-relevant progress or assignment context if needed

They must not see dormant or hidden-looking manager controls.

### Stage Behavior

The rep stage should show:

- selected module title
- skill category
- short description
- status or progress state
- due date if assigned
- primary action

The default view is lesson, not quiz.

### Quiz Behavior

Quiz remains local to the selected module.

- use a compact segmented control or quiet tab switch
- do not treat quiz like a separate page mode
- if a module has no quiz, show a clear lesson-completion path instead of an empty quiz surface

### Empty / Waiting States

Rep-facing empty states should be calm and clear:

- no assigned modules
- all modules completed
- waiting on new assignments

They should feel intentionally designed, not like permission fallthrough.

---

## Manager Experience

Managers should still see Training as a curriculum surface first.

The difference is that they also get planning and operational context around the selected module.

### Manager Stage

Managers see the same module stage as reps, plus a compact operational strip inside the stage.

The strip should summarize the selected module with a few compact signals, such as:

- assignment coverage
- completion rate
- due soon count

This should be a slim horizontal band, not three or four large metric cards competing with the module content.

### Manager Planning Surface

The resting manager surface should be operational and compact.

It should answer:

- what can I do with this module
- how many modules or reps are involved
- what is the next management action

It should not expose the entire quiz builder or content editor by default.

---

## Progressive Disclosure For Manager Tools

This is the central UX correction in the redesign.

### At Rest

The page shows only the compact manager planning surface.

### On Action

Manager tools open focused utilities:

- **Create module:** right-side sheet or contained modal
- **Edit module:** same sheet/modal pattern
- **Assign module:** lighter modal
- **Generate with AI:** guided utility surface, ideally reusing the create/edit sheet

### Design Rule

The page underneath should remain visually stable.

The act of editing or assigning should not transform the entire Training page into a full-page admin canvas.

If implementation constraints prevent a sheet, use a contained modal before falling back to an always-open inline editor.

---

## Visual System

### Keep Existing Argos Brand Tokens

Training should continue using:

- existing authenticated app chrome
- existing dark palette
- existing typography stack
- existing blue accent
- existing radius and shadow language

No new aesthetic system should be introduced.

### Surface Hierarchy

The page should use a clearer hierarchy of emphasis:

- **lead surface:** selected module stage
- **secondary surface:** curriculum map
- **tertiary surface:** compact manager planning panel

Avoid stacking several equal-emphasis slabs.

### Panel Treatment

Use the same family of surfaces already working elsewhere:

- dark slab backgrounds
- restrained borders
- selective blue emphasis
- quiet shadows

The lead stage can carry a slightly richer tint than the rest of the page, but secondary surfaces should remain flatter and calmer.

### Navigation Styling

The curriculum map should look like structured product navigation.

That means:

- cleaner row rhythm
- clearer active row emphasis
- less card-like bulk
- no AI-looking side-tab treatment

### Copy Rhythm

Training copy should be tightened across the page.

Each surface should answer one question quickly:

- what module is this
- what should I do next
- what can I manage here

Avoid long paragraphs in several panels at once.

---

## State Design

### Loading

Loading states should mirror the actual layout:

- route header remains stable
- lead stage skeleton
- curriculum map skeleton
- compact manager surface skeleton

Avoid generic loading blocks that do not match the final structure.

### Success

Use compact inline confirmations for:

- save
- assign
- AI draft generation
- quiz submission

These should confirm work without dominating the page.

### Error

Attach errors to the action that failed:

- save errors in the create/edit surface
- assignment errors in the assignment modal
- AI errors near AI actions
- quiz submission errors inside the stage

### Empty

Manager empty states should feel like the start of planning work, not like broken UI.

Rep empty states should feel like a legitimate product state, not like an access problem.

---

## Role Visibility Rules

These rules are explicit and non-negotiable.

### Reps must never see

- create module
- edit module
- assign module
- AI drafting controls
- team-management framing
- planning summaries intended for managers

### Managers should see

- the same core module stage
- a compact manager status strip in the stage
- a compact planning surface below
- focused editing utilities only when invoked

Both roles should feel intentionally designed.

---

## Component Impact

This redesign should reshape the current Training implementation rather than introduce a new route architecture.

### Primary touchpoints

- `apps/web/app/(authenticated)/training/page.tsx`
- `apps/web/components/page-frame.tsx`
- `apps/web/components/training-panel.tsx`
- `apps/web/components/training/training-module-stage.tsx`
- `apps/web/components/training/training-module-toc.tsx`
- `apps/web/components/training/training-manager-command-deck.tsx`
- `apps/web/components/training/training-quiz-editor.tsx`

### Likely structural changes

- keep `PageFrame` and remove the need for a second hero-like surface
- restyle the selected module stage to become the clear lead panel
- restyle the curriculum map as a calmer support panel
- collapse the manager planning area to a compact resting state
- move create/edit/assign/generate flows into focused sheets or modals
- reduce the number of always-visible heavy surfaces on the page

---

## Testing And Verification Expectations

The redesign should be verified across:

- rep view
- manager view
- empty state with no modules
- module with quiz
- module without quiz
- assignment flow
- AI unavailable flow
- mobile collapse

Verification should confirm:

- the page now reads as part of the same application as Dashboard, Calls, Highlights, and Roleplay
- the selected module stage is the obvious anchor
- manager tooling no longer dominates the resting page
- reps do not see manager controls
- the page remains understandable when the current user resolves as a manager in local dev

---

## Success Criteria

The redesign succeeds if:

- Training immediately feels like Argos product UI
- the page has one obvious focal surface
- the manager path is available but secondary at rest
- reps get a clean learning experience
- the screen no longer reads like an always-open admin builder

If the page still feels like a stack of dark tools with the editor dominating the canvas, the redesign has failed.
