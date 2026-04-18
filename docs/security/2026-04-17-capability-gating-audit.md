# Capability Gating Audit

Date: 2026-04-17

## Scope

This audit covered capability-dependent product areas in the active Next.js app:

- Zoom
- Go High Level
- invite delivery
- AI training generation
- Roleplay TTS
- Roleplay realtime voice
- settings and onboarding-adjacent setup flows

The goal was to ensure feature availability comes from real backend capability state rather than optimistic UI assumptions.

## Capability Inventory

| Feature | External dependency | Capability source | Backend check before audit | UI before audit | Status after patch |
| --- | --- | --- | --- | --- | --- |
| Zoom connect/disconnect | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, Zoom OAuth | shared capability helper | Connect route required both vars, status service only checked `ZOOM_CLIENT_ID` | Settings could show Zoom as connectable even when secret was missing | Fixed |
| Zoom callback and webhook registration result | Zoom OAuth callback + webhook registration | callback redirect notices | Callback redirected away from integrations page | User lost context and got no page-level notice | Fixed |
| Go High Level connect/disconnect | `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, GHL OAuth | shared capability helper | Connect route required both vars, status service only checked `GHL_CLIENT_ID` | Settings could show GHL as connectable even when secret was missing | Fixed |
| Invite delivery from onboarding and People settings | `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`, Resend email delivery | shared capability helper | Backend created invite flow assumed email delivery was configured | Onboarding and People settings still offered invite actions when delivery was unavailable | Fixed |
| Training AI generation | `OPENAI_API_KEY` | shared capability helper via `getTrainingAiStatus()` | Present | Already disabled in training UI | Centralized |
| Roleplay TTS | `OPENAI_API_KEY` | shared capability helper via roleplay voice config | Route returned `503` when missing | Assistant transcript still showed clickable `Listen` actions | Fixed |
| Roleplay realtime voice | `OPENAI_API_KEY` | shared capability helper via roleplay voice config | Route returned `503` when missing | Voice button and copy suggested the feature was available | Fixed |

## Findings

### High

1. Integration availability drifted from the real backend contract.
   - `getIntegrationStatuses()` treated Zoom and GHL as available when only the client ID existed.
   - The actual OAuth connect routes required both client ID and client secret.
   - Result: admins could see a ready-to-connect state and hit a dead end.

2. Integration failure redirects sent users to the wrong page.
   - Zoom and GHL connect/callback failures redirected to `/settings` instead of `/settings/integrations`.
   - The account page had no relevant messaging, so users lost context after a failed connect attempt.

3. Roleplay voice affordances were rendered even when the backend would reject them.
   - The roleplay UI still rendered the live voice button and transcript `Listen` actions.
   - Backend routes correctly returned `503` when OpenAI voice config was missing.
   - Result: feature entries looked available but failed only after interaction.

4. Invite delivery was not capability-gated in onboarding or People settings.
   - `sendInvite()` depended on Resend and site URL config, but the UI still rendered invite flows as if delivery was available.
   - Result: invite creation would fail only after submit, which is a dead-end onboarding/settings experience.

### Medium

1. Capability logic was fragmented across integrations, invites, training, and roleplay.
   - Different surfaces used different env heuristics.
   - That made future drift likely.

2. Integration settings lacked page-level setup notices.
   - Callback/query-state errors existed in URLs but were not surfaced in the UI.

## Patches Applied

1. Added shared capability helpers in `apps/web/lib/capabilities/service.ts`.
2. Switched integrations status to use real OAuth capability state, including both client ID and client secret.
3. Switched training AI status and roleplay voice config to the shared capability helper.
4. Redirected Zoom and GHL connect/callback failures to `/settings/integrations`.
5. Added integration notice parsing in `apps/web/lib/integrations/settings.ts`.
6. Surfaced setup and callback notices in the integrations settings page.
7. Replaced unavailable integration connect buttons with non-clickable `Setup required` UI and explicit setup copy.
8. Added invite email capability checks before invite persistence, so missing delivery config returns a controlled capability failure instead of a `500`.
9. Gated onboarding and People settings invite entry points when invite delivery is unavailable.
10. Removed roleplay `Listen` actions and live voice controls when voice capability is unavailable, and updated the input placeholder/copy to avoid misleading prompts.

## Tests Added or Updated

- `apps/web/lib/capabilities/service.test.ts`
- `apps/web/lib/integrations/settings.test.ts`
- `apps/web/lib/integrations/service.test.ts`
- `apps/web/lib/integrations-connect-routes.test.ts`
- `apps/web/lib/roleplay-panel.test.ts`
- `apps/web/lib/roleplay-voice-routes.test.ts`
- `apps/web/lib/invites/service.test.ts`

## Verification

```bash
npm run test -w @argos-v2/web -- lib/capabilities/service.test.ts lib/integrations/settings.test.ts lib/integrations/service.test.ts lib/integrations-connect-routes.test.ts lib/roleplay-panel.test.ts lib/roleplay-voice-routes.test.ts lib/invites/service.test.ts
npm run typecheck:web
```

Both verification commands completed successfully.
