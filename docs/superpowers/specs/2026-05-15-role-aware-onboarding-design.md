# Role-Aware Onboarding Guide Design

## Goal

Add a lightweight first-run guide for authenticated Argos users that helps reps and admins reach their first useful action without changing auth, billing, invite acceptance, or organization provisioning.

## Product Fit

Argos has different first jobs by role. Reps need to understand where to review calls, training, and roleplay. Admins need to launch the workspace by inviting people, configuring teams/rubrics/integrations, and getting the first call into the product. A small activation guide is useful here because it reduces blank-dashboard uncertainty and points users toward the core workflow.

## UX Direction

The guide should feel like operational onboarding, not a tutorial cage. It appears as a compact inline panel inside the authenticated app shell, only when it is relevant. It is dismissible, replayable from the account menu, and should not block navigation or page actions.

## Scope

- Add role-specific checklist content for `rep`, `manager`, `executive`, and `admin`.
- Treat `admin` as the workspace launch role because invite sending and several setup surfaces are admin-only.
- Treat `manager` and `executive` as team coaching roles, focused on team visibility, uploads, training, and leaderboards rather than admin-only invitations.
- Treat `rep` as an individual contributor, with wording focused on calls, training, and roleplay.
- Persist dismissal in browser `localStorage` using the authenticated app user id and role.
- Add a replay control under the existing account menu.
- Mount the panel from the authenticated shell so protected pages can share the same entrypoint.

## Non-Goals

- No database schema changes.
- No server API changes.
- No changes to Stripe checkout, billing webhooks, invite links, invite acceptance, login, or onboarding org creation.
- No forced modal tour or page-by-page overlay system in this pass.

## Safety

The guide is client-only and additive. If `localStorage` is unavailable, it should still render safely and dismiss for the current session. Existing navigation, account menu, feedback, notifications, and page content must continue to render.

## Testing

Add focused shell tests for:

- Admin/manager shell renders the workspace launch guide copy and account replay control.
- Rep shell renders rep-specific guide copy and does not show admin setup language.
- Existing navigation/account menu tests continue passing.
