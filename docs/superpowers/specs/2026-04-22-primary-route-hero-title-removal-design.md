# Primary Route Hero Title Removal

**Date:** 2026-04-22
**Status:** Approved in conversation, pending written-spec review
**Scope:** Remove redundant large hero titles from top-level authenticated product routes while preserving route actions and layout clarity

---

## Overview

Several primary authenticated routes repeat the current location twice:

- once in the left navigation
- again as a large route hero with an eyebrow, title, and description

That pattern is adding visual weight without adding much meaning on the core product pages.

The approved direction is to remove the large hero treatment from the primary top-level routes and keep only the utility controls that still help the user act on the page.

This cleanup is intentionally narrow. It applies only to the main product routes shown in review:

- `/dashboard`
- `/team`
- `/leaderboard`
- `/training`
- `/calls`
- `/highlights`

It does not apply to settings, provisioning states, loading/error states, or detail pages in this phase.

---

## Goals

- Remove redundant route naming from the primary authenticated pages
- Bring useful content higher on the screen
- Preserve route-level actions and contextual controls
- Keep layout spacing consistent after the hero blocks are removed
- Avoid broad changes to secondary surfaces that still benefit from explicit headings

## Non-Goals

- Redesign the authenticated shell or sidebar navigation
- Remove headers from settings, detail views, error states, or provisioning flows
- Introduce a new global page-title system in the shell
- Rework the information architecture of the affected routes
- Change backend behavior or route access rules

---

## Current State

There are currently three header patterns across the affected routes:

### 1. Shared `PageFrame` header

`/team`, `/leaderboard`, and `/training` use `PageFrame` to render:

- eyebrow
- title
- description
- optional actions

This gives them consistent spacing, but it also produces the repeated hero treatment the user wants removed.

### 2. Route-local intro block

`/dashboard` renders its own introductory title block inside the page view.

That block is not shared, so it should be removed directly at the route level.

### 3. Bespoke hero sections

`/calls` and `/highlights` use custom hero compositions rather than `PageFrame`.

These routes still need top-of-page utility affordances, but they do not need oversized titles.

---

## Approved Direction

### Route Scope

Only the six primary product routes listed above should lose the large hero treatment.

The following routes should keep their current page headers for now:

- settings routes
- provisioning and account setup surfaces
- loading and error routes
- not-found routes
- detail pages such as call detail and rep profile

### UX Rule

For top-level product routes, the shell navigation should carry primary orientation.

The page body should begin with content and actions, not a repeated location label.

### Action Preservation

Removing the hero does not mean removing useful controls.

The following must remain visible near the top of their routes:

- quick navigation actions in `team`, `leaderboard`, and `training`
- `Upload a call` and viewer context in `calls`
- `Back to call library` in `highlights`

These controls should be presented as a compact utility row or action strip rather than a hero banner.

---

## Implementation Design

### `PageFrame`

`PageFrame` should gain an opt-in headerless or compact mode.

That mode should:

- preserve the outer container rhythm used by the route
- preserve action placement
- skip rendering the eyebrow, title, and description block

This change must be opt-in so that all existing non-target routes keep their current behavior.

### `/team`, `/leaderboard`, `/training`

These routes should continue using `PageFrame`, but switch to the new headerless or compact mode.

Result:

- existing action buttons remain available
- body content starts higher on the page
- no route hero is shown

### `/dashboard`

Remove the route-local intro title block from the dashboard views.

The first meaningful metrics and panels should become the top of the page content.

No shell-level replacement is needed.

### `/calls`

Replace the custom hero with a compact top utility row.

That row should retain:

- viewer context when applicable
- upload CTA

The oversized eyebrow, title, and descriptive paragraph should be removed.

### `/highlights`

Replace the custom hero with a compact top utility row.

That row should retain:

- back-to-library navigation

The large title and descriptive copy should be removed.

---

## Layout and Spacing Requirements

- The first content surface on each affected route must not feel jammed against the global app header.
- Action rows must align with the route container width already used by that page.
- Removing the hero must not create a dead gap where the header used to be.
- `PageFrame` headerless mode must not disturb routes that still use the standard header mode.

---

## Verification

Before calling the change complete:

1. Verify the six affected routes no longer render the large route hero treatment.
2. Verify the preserved actions still appear in a stable top position.
3. Verify settings and detail routes still render their existing headers.
4. Run targeted checks for the touched components and routes.
5. Run `gitnexus_detect_changes()` before any commit that includes implementation code.

---

## Risks

### Spacing regression

If `PageFrame` simply stops rendering its header block without adjusting spacing, the first child surface may sit too high or too low.

Mitigation:

- make header suppression an explicit layout mode
- verify spacing on all three `PageFrame` consumers in scope

### Over-flattening route context

`/calls` and `/highlights` still need visible utility affordances even without a hero.

Mitigation:

- keep a compact top row for actions
- remove only the redundant title copy, not the controls

### Scope creep

A global `PageFrame` change could unintentionally flatten routes outside the approved set.

Mitigation:

- use opt-in behavior only
- do not migrate settings, detail, or stateful routes in this pass
