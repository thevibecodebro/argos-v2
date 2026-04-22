# Rubrics Settings Page Design

**Date:** 2026-04-22
**Status:** Approved design, ready for implementation planning
**Route:** `/settings/rubric`

## Goal

Restore the missing admin-only Rubrics settings page as a guided workflow for creating, importing, reviewing, and publishing immutable rubric versions without rewriting historical call scores.

## Problem

The settings navigation exposes a Rubrics entry, but the route and UI do not exist. At the same time, the codebase already supports rubric-backed scoring, roleplay generation, dashboard filtering, draft creation, history reads, and publish operations. The missing piece is the settings UI and API surface that lets admins manage those rubric versions intentionally.

## Product Principles

1. Published rubrics are immutable versions.
2. Creating a draft does not change the active rubric.
3. Only publishing a draft promotes it to the new active version.
4. Historical calls keep their original `rubricId` and scores forever.
5. The common path should be fast: create a new draft from the current active rubric.
6. Imports should be forgiving: valid rows become a draft immediately, invalid rows are flagged inline for repair.

## User Scope

This page is available only to admins.

Non-admin users who reach `/settings/rubric` should be redirected back to `/settings`, consistent with the existing settings pages.

## Page Shape

The page lives under the authenticated settings shell and uses the same `PageFrame` pattern as the existing settings pages.

The main experience is a four-step wizard:

1. **Choose Source**
2. **Edit Draft**
3. **Review & Fix**
4. **Publish**

Above the wizard, the page shows the current active rubric summary. Below the wizard, the page shows the rubric version history so admins can inspect older versions and clone from them without leaving the page.

## Wizard Flow

### 1. Choose Source

The wizard starts by asking how to create the draft.

Available sources:

- **New Draft from Active** — primary default path
- **Clone Historical Version**
- **Start from Default Template**
- **Import CSV**
- **Import JSON**

Behavior:

- If an active rubric exists, `New Draft from Active` is preselected.
- If no active rubric exists, `Start from Default Template` becomes the default.
- `Clone Historical Version` lets the admin pick any previous version from history.
- Import paths parse the uploaded file through the rubric settings API, map valid rows into draft categories, and collect row-level validation errors for the review step.

### 2. Edit Draft

The admin edits the in-progress draft before publishing.

Editable fields:

- rubric name
- rubric description
- category list
- category slug
- category name
- category description
- category weight
- scoring guidance:
  - excellent
  - proficient
  - developing
  - look-for bullets
- sort order

Expected affordances:

- add category
- remove category from the current draft
- reorder categories
- edit weights directly
- normalize slug from name when helpful, but always let the admin override it

The draft remains local to the wizard through `Edit Draft` and `Review & Fix`. When the admin continues into `Publish`, the app creates a server-side draft version via the rubric create endpoint and uses that draft ID for the final publish action. Editing this draft must not alter the active rubric or any published historical version.

### 3. Review & Fix

This step shows:

- overall draft summary
- category count
- weight distribution
- validation errors
- import-specific row errors

Import behavior:

- valid rows are already included in the draft
- invalid rows are listed inline with field-level explanations
- the admin can fix them directly in the wizard
- the draft cannot be published until validation passes

This step also explains the versioning invariant:

> Publishing this draft creates a new rubric version for future scoring. Existing calls remain attached to their original rubric version.

### 4. Publish

This step is an explicit confirmation screen.

It shows:

- the current active rubric
- the draft that will become the next version
- a concise note that publishing affects future scoring only

Publishing behavior:

- the selected draft becomes the new active rubric
- the previously active rubric becomes historical
- no historical rubric record is mutated except active status changes already supported by the repository
- no old call is re-scored

## Active Rubric Summary

The page should display a compact active rubric card outside the wizard.

Fields to show:

- rubric name
- version
- description
- category count
- published/updated timestamp
- active badge

If no active rubric exists, the card should show an empty state with a prompt to start from the default template or an import source.

## Version History

The page should display rubric history ordered by newest version first.

Each version row should show:

- version number
- name
- status badge (`Active` or `Historical`)
- category count
- updated timestamp

Available actions per row:

- inspect summary
- clone into a new draft

V1 does not need:

- rollback in one click
- delete version
- archive version
- edit published version in place
- diff viewer between versions

## Data and Domain Rules

The implementation must align with the existing rubric domain model:

- `loadActiveRubric`
- `loadRubricHistory`
- `createDraftRubric`
- `publishRubric`

The current repository already supports:

- active rubric lookup
- version history lookup
- category lookup by rubric ID
- draft creation
- draft publication

The page should treat drafts as pre-publication versions created through the wizard. A newly created draft is not active until `publish` succeeds.

## API Surface

The current app has no rubric settings API routes, so implementation must add them.

Required endpoints for V1:

- **GET /api/rubrics**
  - returns active rubric summary
  - returns rubric history
- **POST create draft**
  - accepts manual input or a cloned/import-derived payload
  - validates using rubric service rules
  - returns the created draft version
- **POST publish draft**
  - publishes a specific draft version
  - returns the newly active rubric

Exact route shape for V1:

- `GET /api/rubrics`
- `POST /api/rubrics`
- `POST /api/rubrics/[id]/publish`

## Import Rules

### CSV

CSV import should map rows into categories with predictable headers for:

- name
- slug
- description
- weight
- excellent
- proficient
- developing
- look-for bullets

Look-for bullets can be represented as a delimiter-separated string and normalized into `lookFor: string[]`.

### JSON

JSON import should accept the rubric input shape already implied by the service layer:

- top-level `name`
- optional `description`
- `categories[]`

### Partial Success Behavior

Imports are partial-success by design:

- rows that validate become part of the draft
- rows that fail are retained as fixable issues in the review step
- the system must not silently discard invalid rows without surfacing them

## Security Requirements

The settings page and every rubric API route must enforce admin-only access server-side.

Security requirements:

- do not trust client role state
- re-check the authenticated user and org membership on every write
- validate every request payload server-side using the existing rubric validation logic
- do not expose raw database errors to the client
- do not allow clients to mutate published versions directly

## UX Requirements

The page should feel like a guided admin tool, not a raw JSON editor.

Key UX expectations:

- clear explanation of immutable versioning
- strong affordance for `New Draft from Active`
- obvious distinction between draft and active states
- import error messages tied to the exact broken row or field
- publish confirmation that calls out the future-only impact

Because the chosen layout is wizard-based, the interface should prioritize focus and step progression over showing every control at once.

## Out of Scope for V1

- editing published rubrics in place
- deleting or archiving rubric versions
- automatic backfill or re-scoring of historical calls
- one-click rollback
- visual version diffing
- multiple concurrent named drafts with separate lifecycle management
- background import jobs

## File Structure Direction

Expected implementation areas:

- authenticated settings route for `/settings/rubric`
- `RubricsPanel` client component under `components/settings`
- rubric settings API routes under `app/api/rubrics`
- tests for panel, routes, and rubric service behavior

Implementation should follow existing settings-page conventions before introducing new abstractions.

## Testing Strategy

Implementation should include:

### Service tests

- creating a draft does not change the active rubric
- publishing a draft does change the active rubric
- historical versions remain accessible after publishing a new one
- import payload validation catches invalid rows and fields

### Route tests

- admin can fetch rubric settings state
- non-admin is blocked from writes
- invalid create/import payloads return validation failures
- publish requires an existing draft in the current org

### Panel tests

- wizard step progression works
- source selection defaults correctly
- import errors render inline
- publish confirmation includes future-only scoring messaging

### Regression tests

- settings nav points to a real implemented Rubrics route

## Success Criteria

The rebuild is successful when:

1. Admins can open `/settings/rubric` without a crash.
2. Admins can create a draft from the active rubric, a historical rubric, the default template, CSV, or JSON.
3. Draft creation does not change the active rubric.
4. Publishing promotes the draft to a new active version.
5. Historical calls remain attached to their original rubric version and scores.
6. Imports preserve valid rows and expose invalid rows inline for repair.
