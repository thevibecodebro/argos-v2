# Integrations Security

## Operator Runbook

Use this checklist before enabling external access, OAuth integrations, worker processing, or AI-backed call analysis in a hosted environment. Values in `.env.example` are placeholders only; production secrets must live in the hosting provider secret store.

### Invite-Only Rollout

Keep account creation invite-only until the first production tenant is ready for broader signup.

Required app env:

- `ARGOS_INVITE_ONLY=true`
- `ARGOS_BOOTSTRAP_ADMIN_EMAILS` set only to the initial owner/admin emails that may create the first organization without an invite
- `NEXT_PUBLIC_SITE_URL` set to the exact production app origin
- `ARGOS_ALLOWED_ORIGINS` set to a comma-separated list of exact trusted origins, for example the production app URL plus approved preview/staging URLs

Hosted Supabase live verification:

- Confirm public signup is disabled in Supabase Auth for the hosted project. Local repo config is not proof that hosted signup is disabled.
- Confirm enabled identity providers match the rollout plan. Disabling only email signup is not enough if Google OAuth still allows new users.
- Confirm invite acceptance works for an invited user and that a non-invited user cannot create an organization.
- Recheck redirect allow-list entries after the final production domain is assigned. Avoid broad preview wildcards once production is stable.

### Trusted Origins

OAuth callbacks and auth redirects derive trusted request origins from `NEXT_PUBLIC_SITE_URL`, Vercel deployment URL variables, and `ARGOS_ALLOWED_ORIGINS`.

Operational rules:

- Use exact `https://` origins. Do not include paths.
- Keep production and staging origins explicit.
- Add preview origins only when they are intentionally allowed for auth or OAuth testing.
- If forwarded headers are present in production and do not match the trusted list, the app falls back to the configured site origin.

### Rate Limiting

Rate-limit buckets are stored in Postgres and bucket identifiers are hashed with `ARGOS_RATE_LIMIT_HASH_SECRET`.

Operational rules:

- Generate a long random `ARGOS_RATE_LIMIT_HASH_SECRET` per environment.
- Do not reuse local development values in hosted environments.
- Keep the secret stable during normal operation. Rotating it resets effective rate-limit buckets because subjects hash to new bucket IDs.
- Confirm the `rate_limit_buckets` migration is applied before enabling public traffic.

## Provider Token Encryption

Zoom and GoHighLevel access and refresh tokens are stored with the versioned `argos:v1:` ciphertext prefix. Zoom `webhook_token` is encrypted when present. The server-only key is `ARGOS_TOKEN_ENCRYPTION_KEY`, encoded as either 32-byte base64 or 32-byte hex.

Legacy plaintext rows are still readable so production can roll forward safely. New OAuth upserts and token refresh writes store encrypted values. Run the one-time rotation script in dry-run mode first:

```bash
npm run rotate:integration-tokens -w @argos-v2/web
```

Apply the updates only after the dry-run output is reviewed:

```bash
npm run rotate:integration-tokens -w @argos-v2/web -- --apply
```

The script prints row IDs and counts only. It must not print token values.

Production rollout:

- Generate one 32-byte key per environment and store it as `ARGOS_TOKEN_ENCRYPTION_KEY`.
- Do not reuse the local development key in hosted environments.
- Run the dry-run rotation before deploy if plaintext integration tokens already exist.
- Apply rotation only after the dry-run row counts match expectations.
- After rotation, sample integration rows through a privileged database client and confirm stored token fields use the `argos:v1:` prefix. Do not paste token values into logs or tickets.

## Zoom Webhook Model

Argos uses one global Zoom webhook secret: `ZOOM_WEBHOOK_SECRET_TOKEN`. The webhook processor validates Zoom signatures with that app-level secret only, then looks up the integration by Zoom `account_id` to find the organization, rate-limit bucket, and recording download tokens.

Do not reintroduce per-user dynamic webhook registration or per-row webhook secret fallback. Zoom OAuth callback persistence should keep `webhook_id` and `webhook_token` null for the current global webhook model.

Required hosted env:

- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_REDIRECT_URI`
- `ARGOS_WEBHOOK_URL`
- `ZOOM_WEBHOOK_SECRET_TOKEN`

Zoom live verification:

- In the Zoom app configuration, set the OAuth redirect URL to the same value as `ZOOM_REDIRECT_URI`.
- Set the recording webhook endpoint to `ARGOS_WEBHOOK_URL`.
- Set the webhook secret token to the exact hosted `ZOOM_WEBHOOK_SECRET_TOKEN`.
- Connect Zoom from the hosted app and confirm the integration stores the Zoom account ID.
- Trigger or replay a signed webhook and confirm the app accepts valid signatures and rejects invalid signatures.
- Confirm webhook processing maps by Zoom `account_id`; it should not depend on per-row webhook secrets.

## GoHighLevel Gate

GoHighLevel remains unavailable unless all of these are true:

- `ARGOS_GHL_ENABLED=true`
- `GHL_CLIENT_ID` is present
- `GHL_CLIENT_SECRET` is present

The connect, callback, status, and settings surfaces should report `not_configured` or unavailable until this gate is satisfied.

Required hosted env when enabling GoHighLevel:

- `ARGOS_GHL_ENABLED=true`
- `GHL_CLIENT_ID`
- `GHL_CLIENT_SECRET`
- `GHL_REDIRECT_URI`

GoHighLevel live verification:

- Keep `ARGOS_GHL_ENABLED=false` until Marketplace app access and OAuth credentials are confirmed.
- Confirm the Marketplace redirect URI exactly matches `GHL_REDIRECT_URI`.
- Connect a test location from the hosted app before exposing the control to users.
- If HighLevel returns account or provisioning errors during Marketplace login, verify the HighLevel admin state before changing app code.

## Hosted Verification Checklist

These checks require live provider access and were not locally verified by repo tests.

Supabase:

- Auth signup is disabled for invite-only rollout.
- Auth providers and redirect allow-list match production and staging domains.
- `SUPABASE_SERVICE_ROLE_KEY` is set only in server/worker environments.
- Current migrations are applied to the hosted database.

Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `ARGOS_ALLOWED_ORIGINS`, `ARGOS_INVITE_ONLY`, `ARGOS_TOKEN_ENCRYPTION_KEY`, `ARGOS_RATE_LIMIT_HASH_SECRET`, and integration secrets are present in the intended environments.
- Preview envs either use explicit trusted origins or intentionally omit integration secrets.
- Production deploy health check returns 200.

Fly worker:

- `DATABASE_URL`, `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and call processing env are present as Fly secrets.
- `CALL_PROCESSING_ENABLED` is set intentionally for the target worker app.
- Worker `/health` returns 200 after deploy.

OpenAI:

- `OPENAI_API_KEY` is present only in server/worker environments.
- `OPENAI_CALL_SCORING_MODEL`, `OPENAI_TRAINING_MODEL`, and `OPENAI_CALL_TRANSCRIPTION_MODEL` are set to supported models for the account.
- A hosted call-processing smoke test completes transcription and scoring without logging raw secrets or token values.
