# Training Manager Workflow Design

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Restore manager training authoring, AI curriculum generation, assignment management, and richer team progress in the current Next.js app

---

## Overview

The current training workspace in `apps/web` supports two things:

- reps can open modules and submit quiz progress
- managers can view a simple aggregate team-progress summary

The original product supported a fuller manager workflow that is now missing:

- create training modules
- edit training modules
- generate draft modules with AI
- assign modules to reps
- unassign modules before a rep starts
- inspect module-level team progress

This design restores that manager workflow inside the existing `/training` page and keeps the current app architecture intact:

- Next.js route handlers under `app/api/training`
- service-level access checks in `lib/training/service.ts`
- repository abstractions in `lib/training/repository.ts`
- current `training_modules` and `training_progress` tables

No new page or schema migration is required for this phase.

---

## 1. Goals

- Restore manager authoring directly in the current training page
- Restore AI-assisted curriculum drafting with review-before-save
- Restore assignment and unassignment workflows for team managers
- Replace the simple aggregate manager progress card with a module-level team progress view
- Keep rep training consumption behavior intact
- Respect the current team access and permission model already implemented in the app

## 2. Non-Goals

- Redesign the entire training experience into separate rep and manager routes
- Add lesson/video hosting beyond the current `videoUrl` field
- Add bulk edit, module deletion, module publishing states, or versioning
- Add background job orchestration for AI generation
- Change starter-module seeding behavior in this phase

---

## 3. Current State

### UI

[`apps/web/components/training-panel.tsx`](/Users/thevibecodebro/Projects/argos-v2/apps/web/components/training-panel.tsx) currently renders:

- a module list
- a module detail view with quiz answering
- a manager-only aggregate team completion list

It does not render any controls for module creation, editing, AI generation, or assignment.

### Backend

Current Next route handlers:

- [`apps/web/app/api/training/modules/route.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/app/api/training/modules/route.ts) only supports `GET`
- [`apps/web/app/api/training/modules/[id]/route.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/app/api/training/modules/[id]/route.ts) only supports `GET`
- [`apps/web/app/api/training/modules/[id]/progress/route.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/app/api/training/modules/[id]/progress/route.ts) supports rep progress submission
- [`apps/web/app/api/training/team-progress/route.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/app/api/training/team-progress/route.ts) supports manager progress retrieval

Current service behavior in [`apps/web/lib/training/service.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/lib/training/service.ts):

- enforces training access with the team permission model
- seeds starter modules when an org has none
- returns modules and team progress
- evaluates rep quiz submissions

### Data Model

The current training data model already supports most of the restored workflow:

- `training_modules`: `title`, `skillCategory`, `videoUrl`, `description`, `quizData`, `orderIndex`
- `training_progress`: `status`, `score`, `attempts`, `assignedBy`, `assignedAt`, `dueDate`, `completedAt`

That means create/edit/assign/unassign can be added without a schema change.

---

## 4. Recommended Approach

Restore the legacy manager workflow inside the existing `/training` page and current service/repository stack.

Why this approach:

- it fixes the actual product gap without adding new navigation
- it reuses the current access-control model instead of bypassing it
- it avoids copying legacy code directly into a different architecture
- it keeps rep and manager behavior close enough to share module data cleanly

Alternative approaches considered and rejected:

- Separate manager training workspace route: cleaner separation, but unnecessary navigation and more churn for this restore
- Backend-only parity first: lower initial implementation effort, but it does not solve the visible UX gap

---

## 5. UX Design

### 5.1 Shared Page Structure

The `/training` page remains a single page rendered by [`apps/web/components/training-panel.tsx`](/Users/thevibecodebro/Projects/argos-v2/apps/web/components/training-panel.tsx).

Behavior splits by capability:

- reps see only the current learner flow
- managers see the learner view plus manager controls and manager reporting

### 5.2 Manager Toolbar

Managers with `manage_team_training` see a manager-only toolbar above the module list with:

- `Create module`
- `Generate with AI`

If OpenAI is not configured, `Generate with AI` remains visible but disabled. The disabled state includes clear explanatory copy such as "AI curriculum generation is unavailable until OpenAI is configured."

This requirement is explicit: lack of OpenAI configuration should disable the AI entry point rather than silently removing it.

### 5.3 Create Module Modal

The create modal restores the legacy manual authoring flow:

- title
- skill category
- optional video URL
- optional description
- optional quiz builder

Quiz builder behavior:

- manager can toggle quiz on/off
- quiz consists of multiple-choice questions
- each question stores 4 options and one `correctIndex`
- leaving quiz off creates a non-quiz module that passes when a rep completes it

Validation:

- title required
- skill category required
- `videoUrl`, when present, must be a valid `http` or `https` URL
- quiz questions must have non-empty prompt text and options before save

### 5.4 Edit Module Modal

The edit modal mirrors the create modal and loads the selected module’s current fields, including quiz data.

Manager capabilities:

- update metadata
- add/remove/edit quiz questions
- change correct answer options

Out of scope for this phase:

- deletion
- duplicate module
- draft/published states

### 5.5 AI Generator Modal

The AI flow follows the original product shape but uses the current architecture.

Step 1: describe the training goal

- topic required
- target role optional
- module count constrained to 2 through 8
- optional skill-category focus selection

Step 2: preview and edit generated drafts

- generated modules are shown as drafts only
- manager can edit title, description, category, and quiz content
- manager can reorder drafts
- manager can delete drafts before save
- nothing persists until manager explicitly saves

Save behavior:

- each reviewed draft becomes a created training module
- module `orderIndex` is assigned in the final reviewed order
- if saving fails, the UI reports failure and stops instead of claiming full success

### 5.6 Assignment Modal

Managers can open `Assign` on a module row/card.

The assignment modal shows:

- reps already assigned to the module, with current assignment/progress status
- eligible reps not yet assigned
- optional due date

Rules:

- only reps accessible to the current manager can be assigned
- unassign is allowed only when the current status is still `assigned`
- once a rep has `in_progress`, `passed`, or `failed`, unassign is blocked
- blocked unassign attempts return a specific error and keep the UI in sync

### 5.7 Team Progress

The current aggregate list is replaced with a richer manager-only section that shows:

- a module header row
- one row per accessible rep
- per-module status chips and score when applicable

This section still filters to the reps the current manager may view based on team permissions.

If there are no modules:

- show an empty state instructing the manager to create or generate modules

If there are modules but no accessible reps:

- show an empty state explaining that no rep progress is available yet

---

## 6. Access And Permission Model

All permission checks stay in [`apps/web/lib/training/service.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/lib/training/service.ts).

### Rep

Reps can:

- view modules
- submit module progress
- view only their own module progress

Reps cannot:

- create modules
- edit modules
- generate AI modules
- assign or unassign modules
- view team progress

### Admin And Executive

Admins and executives have org-wide visibility consistent with the current app behavior. They may manage training content and assignments.

### Manager

Managers may act only within the reps they can access through `manage_team_training` and `view_team_training`.

Rules:

- content authoring and assignment changes require `manage_team_training`
- team progress visibility requires either `view_team_training` or `manage_team_training`
- accessible rep selection for assignments must be filtered through the same team-access logic used elsewhere in the app

---

## 7. Service Layer Design

Extend [`apps/web/lib/training/service.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/lib/training/service.ts) with manager-focused operations.

### New service operations

- `createTrainingModule(repository, authUserId, input)`
- `updateTrainingModule(repository, authUserId, moduleId, input)`
- `getTrainingModuleDetail(repository, authUserId, moduleId)`
- `getTrainingAiStatus()`
- `generateTrainingModules(authUserId, input)`
- `assignTrainingModule(repository, authUserId, moduleId, input)`
- `unassignTrainingModule(repository, authUserId, moduleId, repId)`

### Behavior rules

`createTrainingModule`

- require authenticated actor in an org
- require content-management permission
- compute next `orderIndex`
- persist module

`updateTrainingModule`

- require content-management permission
- require module in actor org
- update mutable fields only

`getTrainingModuleDetail`

- return full quiz details for managers
- keep rep-safe behavior for learners

`getTrainingAiStatus`

- return `{ available: boolean }`
- availability is derived solely from current OpenAI env configuration

`generateTrainingModules`

- require content-management permission
- if OpenAI env vars are missing, return `422`
- return draft modules only; do not persist anything
- validate and normalize model output before returning it

`assignTrainingModule`

- require content-management permission
- validate module belongs to actor org
- validate all rep IDs belong to accessible rep set for the actor
- create `training_progress` rows with `status = "assigned"` where missing
- store `assignedBy`, `assignedAt`, and optional `dueDate`
- if a row already exists for a rep+module, do not create duplicates

`unassignTrainingModule`

- require content-management permission
- validate target rep is in actor’s accessible rep set
- only allow removal when progress status is exactly `assigned`
- reject with a specific error if the rep already started or completed the module

### Starter Module Behavior

Current starter-module seeding remains unchanged:

- orgs with no modules still receive starter modules when training is first loaded

This restore does not remove or redesign starter seeding.

---

## 8. Repository Design

Extend [`apps/web/lib/training/repository.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/lib/training/repository.ts) and its implementations with the minimum new methods needed.

### New repository methods

- `findModuleById(orgId, moduleId)`
- `createModule(input)`
- `updateModule(input)`
- `findOrgRepsByIds(orgId, repIds?)`
- `findAccessibleRepDirectory(orgId)`
- `findProgressByModuleAndRepIds(moduleId, repIds)`
- `assignModuleToReps(input)`
- `removeAssignedModule(repId, moduleId)`

### Assignment semantics

Assignment methods should operate on the existing `training_progress` table:

- new assignment inserts `status = "assigned"`
- existing rows are left intact unless the row is still safely mutable
- unassignment deletes only rows still in `assigned`

Both the Drizzle-backed and Supabase-backed repositories must implement the same semantics.

---

## 9. API Design

Add route handlers under the existing training namespace.

### Existing routes retained

- `GET /api/training/modules`
- `GET /api/training/modules/[id]`
- `POST /api/training/modules/[id]/progress`
- `GET /api/training/team-progress`

### New routes

`POST /api/training/modules`

- manager/admin/executive content creation
- body: module authoring payload

`PATCH /api/training/modules/[id]`

- manager/admin/executive content update

`GET /api/training/ai-status`

- returns `{ available: boolean }`

`POST /api/training/modules/generate`

- manager/admin/executive AI draft generation
- returns draft modules only

`POST /api/training/modules/[id]/assign`

- assigns module to one or more reps

`DELETE /api/training/modules/[id]/assign/[repId]`

- removes assignment only if rep has not started

### Validation

Route handlers should validate:

- payload shape
- URL param presence
- `quizAnswers` types
- `moduleCount` bounds
- rep ID array non-empty where required
- valid date string when `dueDate` is present

Routes should continue delegating all permission decisions to the service layer.

---

## 10. OpenAI Integration

AI generation follows the legacy model conceptually but must fit the current app.

### Configuration

Availability is controlled by the presence of the OpenAI environment variables used by the current app’s server-side integrations.

If configuration is missing:

- `GET /api/training/ai-status` returns `{ available: false }`
- AI action in the manager UI is disabled
- generation route returns `422`

### Prompting

The generation prompt should request:

- exactly the requested module count
- progressive curriculum order
- one valid skill category per module
- module-specific descriptions
- quiz data with exactly 3 multiple-choice questions per module

### Output normalization

Service-side normalization should:

- coerce empty or invalid categories to a safe default
- truncate option lists to 4
- clamp `correctIndex` to 0 through 3
- limit returned modules to the requested count

If the model returns invalid JSON, the service should fail explicitly and return a clear server error rather than trying to persist anything.

---

## 11. Error Handling

### UI

- failed create/edit keeps modal open and shows inline error
- failed generation keeps prompt inputs intact
- failed draft save reports partial failure clearly and does not claim completion
- failed assignment or unassignment reports inline without forcing a full page refresh

### API / Service

- `403` for insufficient permissions
- `404` for unknown module or inaccessible module
- `400` for invalid payloads
- `422` when AI generation is requested without OpenAI configuration
- `500` for model failures or unexpected persistence failures

### User-facing copy

User-facing errors should be direct and local:

- "Module not found"
- "You do not have permission to manage training"
- "AI curriculum generation is unavailable until OpenAI is configured"
- "This module can’t be unassigned because the rep has already started it"

---

## 12. Testing

### Service tests

Extend [`apps/web/lib/training/service.test.ts`](/Users/thevibecodebro/Projects/argos-v2/apps/web/lib/training/service.test.ts) to cover:

- manager can create modules when permitted
- manager cannot create modules without `manage_team_training`
- manager can edit accessible modules
- rep cannot create or edit modules
- AI status reports unavailable when config is missing
- generation rejects when OpenAI config is missing
- assignment filters to accessible reps only
- unassignment succeeds only for `assigned` rows
- unassignment fails for `in_progress`, `passed`, and `failed` rows

### Route tests

Add route coverage for:

- create route validation
- patch route validation
- AI status route
- generation route happy path and unavailable path
- assign and unassign routes

### UI tests

Extend or add tests around [`apps/web/components/training-panel.tsx`](/Users/thevibecodebro/Projects/argos-v2/apps/web/components/training-panel.tsx) to verify:

- reps do not see manager controls
- managers do see authoring controls
- AI button is disabled when unavailable
- manager team progress renders module-level rows

---

## 13. Implementation Sequence

1. Extend repository interfaces and implementations
2. Add service operations and permission enforcement
3. Add new Next route handlers
4. Restore manager UI in `training-panel.tsx`
5. Add tests for service, routes, and UI
6. Verify manual manager and rep flows

---

## 14. Open Questions Resolved

- Should AI generation disappear when OpenAI is not configured?
  Resolved: no. It remains visible but disabled, with explicit unavailable messaging.

- Should this restore live in a new manager page?
  Resolved: no. It stays inside the existing `/training` page.

- Should AI generation save immediately?
  Resolved: no. It produces editable drafts and only persists on explicit save.
