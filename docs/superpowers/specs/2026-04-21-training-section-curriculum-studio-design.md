# Training Section Curriculum Studio Redesign

**Date:** 2026-04-21
**Status:** Approved
**Scope:** Redesign the authenticated `/training` experience so it feels native to Argos while improving learning flow, manager operations, and information hierarchy

---

## Overview

The current training page in `apps/web` works functionally, but the user experience is structurally flat and visually dated relative to the rest of the authenticated product.

Today the page asks one surface to do too many things at once:

- learner lesson consumption
- learner quiz completion
- manager authoring
- manager assignments
- manager reporting

That creates unnecessary mode-switching and weakens the feeling that Training is a focused product area.

This redesign turns Training into a calmer, more intentional **curriculum studio** inside the existing Argos application shell.

The approved direction is:

- **same Argos application shell**
- **split-shell layout**
- **reps never see manager controls**
- **manager experience is balanced, not manager-dominant**
- **manager stage uses a hybrid module-led view with stitched-in team pulse**
- **visual tone is editorial studio, not glowing dashboard**

The page should feel like part of the same application as Dashboard, Calls, and Roleplay, but with a quieter, more learning-oriented rhythm.

---

## Goals

- Make Training feel native to the current Argos authenticated application
- Create a stronger module-led learning flow for reps
- Remove unnecessary internal section switching and reduce cognitive load
- Give managers operational context without turning Training into a reporting dashboard
- Preserve the current shared route architecture for reps and managers
- Keep manager actions discoverable while clearly hidden from reps

## Non-Goals

- Split Training into separate routes for reps and managers in this phase
- Rebrand the page with a new palette or new global design system
- Turn Training into a media library or video-first browsing experience
- Rebuild the app shell, sidebar, header, or page frame outside of Training
- Add new backend capabilities beyond what the current training workflows already support

---

## Current Problems

### 1. Flat hierarchy

The current page uses similar-weight panels for overview, lesson, manager tools, assignments, AI tools, and team progress. This makes it hard to tell what the primary task is.

### 2. Too many workspace modes

The current `overview / modules / quiz / assignments / teamProgress / aiTools` navigation behaves like a mini-app nested inside the page. This adds friction for both learners and managers.

### 3. Role-mixing

The current structure tries to satisfy learners and managers through the same page-level navigation model instead of preserving one coherent learning surface with role-specific augmentation.

### 4. Visual mismatch

Training already uses the same palette family as the rest of Argos, but the composition feels older and heavier. It relies too much on stacked panels and not enough on layout rhythm, reading flow, and content hierarchy.

### 5. Generic admin patterns inside a learning space

Manager capabilities currently read like separate tool areas rather than contextual controls around a curriculum.

### 6. Critique finding worth addressing directly

The automated design scan flagged the current right-accent tab treatment in `training-workspace-nav.tsx` as an AI-style side-tab pattern. That is a signal that the current internal nav language is too generic and should be removed instead of restyled.

---

## Design Direction

### Approved Direction

- **Shell model:** Stage + Command Deck
- **Role strategy:** Split-shell with a strict rep/manager boundary
- **Manager emphasis:** Balanced
- **Manager stage model:** Hybrid
- **Visual tone:** Editorial Studio

### What “Editorial Studio” Means Here

This is not a separate visual brand.

It means Training should use the existing Argos shell, typography, radii, shadows, and accent color, but apply them with more editorial discipline:

- stronger title and reading hierarchy
- quieter surfaces
- more whitespace
- clearer content sequencing
- fewer independent cards competing for attention
- less “dashboard” energy

The page should feel like the curriculum room inside Argos, not a detached futuristic sub-app.

---

## Information Architecture

### Primary Narrative

The page should always communicate one core sequence:

`current curriculum -> selected module -> next action`

That sequence becomes the page backbone for both reps and managers.

### Remove Current Page-Level Training Modes

The current workspace nav is no longer the correct IA model.

These items should stop being peer destinations:

- Course overview
- Modules
- Quiz
- Assignments
- Team progress
- AI tools

Instead:

- the selected module becomes the page anchor
- lesson and quiz become local subviews of that module
- manager workflows become contextual tools around the selected module
- team progress becomes a quiet summary with optional deeper inspection

---

## Layout

### Stage + Command Deck

The training page should use a two-part desktop layout inside the existing `PageFrame`.

### Left: Stage

The left side is the primary module-led workspace.

It should contain:

- module headline block
- lesson or quiz subview
- primary learner action
- manager status band when relevant

This area is where attention should land first.

### Right: Command Deck

The right side is a quieter contextual rail.

For reps, it contains only learner-relevant support information.

For managers, it becomes a planning deck, not a second dashboard.

### Mobile Behavior

On mobile the layout collapses to a single column in this order:

1. stage
2. module table of contents
3. manager command deck if the user can manage

No critical action should depend on side-by-side visibility.

---

## Rep Experience

Reps should experience Training as a focused learning workspace.

### Stage

The rep stage should show:

- selected module title
- skill category
- concise description
- completion status
- score or attempt context if relevant
- due date if assigned
- primary CTA

The default subview should be the lesson, not the quiz.

### Module Flow

The module rail should behave like a table of contents:

- selecting a module updates the stage in place
- module status is visible at a glance
- the active module is clearly marked without using a loud side-border tab pattern

### Quiz Handling

Quiz should stop behaving like a full workspace section.

Instead:

- lesson and quiz are subviews inside the module stage
- a lightweight toggle or segmented control switches between them
- if a module has no quiz, the rep should see a lesson-completion path, not an empty quiz state

### Rep Right Rail

The learner rail should contain:

- module list / table of contents
- personal progress summary
- due date / assigned context if relevant

It should not contain manager tools or team reporting.

---

## Manager Experience

Managers should see the same module-led stage as reps, but with stitched-in operational context and a separate planning rail.

The page should still feel like Training first.

### Manager Stage

The selected module remains the primary anchor.

Managers should also see a compact status band inside the stage summarizing:

- assignment coverage
- completion rate
- due soon count
- overdue or stalled signals when relevant

This is the approved **hybrid** model:

- not purely module-first
- not purely team-first
- module-led with operational context embedded

### Manager Command Deck

The right deck should hold contextual controls for the selected module:

- create module
- edit selected module
- assign selected module
- draft lesson content with AI
- draft quiz with AI
- compact team pulse summary

These controls should feel like a quiet planning deck, not like standalone sections fighting for page priority.

### Team Progress

Team progress should not dominate the page by default.

Instead:

- show a concise summary in the command deck
- allow deeper inline inspection through an attached drill-down surface when needed
- keep detailed team tables secondary

This preserves the learning identity of the page.

---

## Interaction Model

### Selected Module As Anchor

The selected module is the stable anchor for the whole page.

Switching modules should:

- update the stage in place
- preserve the overall shell
- feel like changing chapters, not navigating to a new area

### Lesson / Quiz Subviews

The lesson and quiz should live inside the same stage container.

Recommended model:

- default to lesson
- expose quiz with a local segmented control or quiet switch
- use the stage footer or header for the primary action state

The CTA label should adapt by state, for example:

- Resume lesson
- Open quiz
- Submit quiz
- Review results

### Manager Actions

Manager actions should open focused surfaces rather than reconfigure the entire page into new modes.

Preferred patterns:

- drawer
- inline side panel
- anchored command surface

Avoid:

- reintroducing page-level tabs for AI tools or assignments
- large page takeovers for routine manager tasks

---

## Visual System

### Keep Existing Argos Tokens

Training should continue using:

- existing authenticated app chrome
- existing dark shell palette
- existing Space Grotesk display type and body typography
- existing accent blue
- current radius language
- current shadow language, but applied more selectively

### Tone Adjustments

The page should move away from:

- glow-heavy panels
- “everything is a card”
- operational dashboard density
- visually loud glassmorphism

The page should move toward:

- clearer text hierarchy
- quieter panel backgrounds
- more negative space
- stronger distinction between primary stage and secondary support areas
- TOC-like module navigation instead of utility-nav language

### Surface Strategy

Use panels only where hierarchy needs separation.

Prefer:

- grouped spacing
- restrained borders
- section dividers
- a few strong surfaces rather than many medium-emphasis ones

The stage should feel like the editorial focal plane.

The command deck should feel thinner and quieter.

---

## States

### Empty States

### No modules

Managers should see a studio-style empty state with:

- Create module
- Generate with AI

This should feel like the beginning of a curriculum workspace, not an error condition.

### No assigned reps

Managers should see this as a planning gap:

- no broken-state language
- clear next action for assignment

### Rep with no assigned work

Reps should see a calm waiting state that explains whether training is unassigned, complete, or pending new curriculum.

### Loading States

Skeletons should mirror the new layout:

- stage skeleton
- TOC rail skeleton
- command deck skeleton

Avoid generic spinners as the primary loading treatment.

### Success States

Use compact inline confirmations for:

- save
- assignment
- AI draft load
- quiz submission

Avoid oversized banners that visually dominate the studio layout.

### Error States

Errors should stay attached to the action that failed:

- assignment errors near assignment controls
- AI draft errors near AI actions
- module save errors inside edit/create flows
- quiz submission errors inside the stage

---

## Role Visibility Rules

These rules are explicit and non-negotiable for this redesign.

### Reps must never see:

- manager command deck
- create module
- edit module
- assign module
- AI drafting controls
- team progress summaries

### Managers should see:

- the same core learning stage
- additional stage-level operational summary
- a quiet right-side planning deck

This is a hard split in visible capabilities, even though both roles use the same route.

---

## Component Impact

The redesign should primarily reshape the current training components rather than introduce a brand-new route architecture.

Likely primary touchpoints:

- `apps/web/components/training-panel.tsx`
- `apps/web/components/training/training-course-shell.tsx`
- `apps/web/components/training/training-workspace-nav.tsx`
- `apps/web/components/training/training-manager-ai-tools.tsx`
- `apps/web/components/training/training-quiz-editor.tsx`
- `apps/web/app/(authenticated)/training/page.tsx`

### Expected Structural Changes

- reduce or remove the current page-level workspace navigation
- replace the current shell with a stage + command deck layout
- move lesson / quiz into local stage subviews
- demote team progress from primary panel to summarized manager support surface
- restyle module navigation into a TOC-like curriculum rail

---

## Testing And Verification Expectations

The redesign should be verified across:

- rep view
- manager view
- empty module state
- module without quiz
- module with quiz
- assignment state
- AI unavailable state
- mobile collapse

Verification should confirm:

- rep users cannot access or see manager controls
- manager actions remain discoverable without dominating the page
- selected module flow remains clear
- lesson and quiz subviews are obvious and local
- the page feels visually coherent with the rest of Argos

---

## Recommended Implementation Direction

Implement the redesign as a reshape of the existing Training surface, not as a new route or product area.

The key success criteria are:

- clearer page hierarchy
- less mode switching
- cleaner role separation
- calmer visual rhythm
- stronger feeling that Training belongs in the same application as the rest of Argos

If the finished page still reads as a dashboard-with-tabs, the redesign has missed the target.
