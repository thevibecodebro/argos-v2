# Integrations Security

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

## Zoom Webhook Model

Argos uses one global Zoom webhook secret: `ZOOM_WEBHOOK_SECRET_TOKEN`. The webhook processor validates Zoom signatures with that app-level secret only, then looks up the integration by Zoom `account_id` to find the organization, rate-limit bucket, and recording download tokens.

Do not reintroduce per-user dynamic webhook registration or per-row webhook secret fallback. Zoom OAuth callback persistence should keep `webhook_id` and `webhook_token` null for the current global webhook model.

## GoHighLevel Gate

GoHighLevel remains unavailable unless all of these are true:

- `ARGOS_GHL_ENABLED=true`
- `GHL_CLIENT_ID` is present
- `GHL_CLIENT_SECRET` is present

The connect, callback, status, and settings surfaces should report `not_configured` or unavailable until this gate is satisfied.
