# Google Meet OAuth Production Verification

Use this checklist to move Google Meet ingestion from an allowlisted testing pilot to a verified external production integration.

## Release Boundary

- The current testing OAuth project remains limited to explicitly approved, non-PHI pilot accounts.
- Create a separate production Google Cloud project and web OAuth client.
- Do not place the production client secret in Vercel or Fly until the production project is approved for every requested scope and the restricted-scope security assessment is complete.
- Do not describe the integration as generally available while Google shows an unverified-app warning or tester-only access.

## Production OAuth Configuration

- Application name: `Argos Revenue Command`
- Homepage: `https://argosrevenuecommand.com`
- Privacy policy: `https://argosrevenuecommand.com/privacy-policy`
- Terms: `https://argosrevenuecommand.com/terms-of-service`
- Security policy: `https://argosrevenuecommand.com/security-policy`
- Redirect URI: `https://argosrevenuecommand.com/api/integrations/google-meet/callback`
- User type: External
- APIs: Google Meet REST API, Google Calendar API, Google Drive API
- Confirm the support email and developer contacts are monitored before submission.
- Verify ownership of every authorized domain used by the app.

## Scope Justifications

### `openid` and `email`

Argos uses the authenticated Google account identifier and email address to show which organizer account is connected, enforce one organizer connection per Argos organization, and prevent an organizer account from being connected to multiple Argos organizations. Argos does not request the user's Google profile scope.

### `https://www.googleapis.com/auth/meetings.space.readonly`

Argos lists completed conference records and reads meeting-space metadata for the connected organizer. The meeting-space code is required to correlate a generated Meet recording with the corresponding Calendar event. Argos does not create or modify meeting spaces.

### `https://www.googleapis.com/auth/calendar.events.readonly`

Google Meet conference records do not provide the human-readable meeting title required by Argos's organization-managed sales-call filters. Argos reads Calendar events within the bounded Meet backfill window, matches the Meet code in Calendar `conferenceData`, and uses only the event summary as the call title. Argos does not create, edit, or delete Calendar events.

### `https://www.googleapis.com/auth/drive.meet.readonly`

For recordings that pass the organization's include and exclude title rules, Argos reads metadata and downloads only Drive files created or edited by Google Meet. The MP4 is copied into the organization's private Argos recording storage and processed through the existing transcription and scoring pipeline. Filtered artifacts are recorded as skipped metadata and are not downloaded. Argos does not access unrelated Drive files or modify Google Drive content.

## Data Handling Evidence

- OAuth tokens are encrypted at rest with the server-only integration token key.
- Tokens are decrypted only in privileged web or worker runtimes.
- Google Meet integration and import tables deny direct `public`, `anon`, and `authenticated` access.
- Recording files are stored in the private `call-recordings` bucket and accessed through authenticated short-lived URLs.
- Title filtering runs before billing checks, Drive download, storage, call creation, or transcription.
- Sync requires an organization admin, recording-processing consent, at least one include rule, and a selected default Argos rep.
- Disconnect revokes Google access before local token deletion and redacts provider discovery metadata.
- Admin call deletion removes the private recording and derived call data while retaining only an opaque suppression identifier to prevent re-import.
- Operational errors and metrics must not contain OAuth tokens or raw meeting titles.

## Reviewer Demo Script

1. Show the public Argos homepage, privacy policy, terms, and security policy on `argosrevenuecommand.com`.
2. Sign in to a dedicated non-PHI reviewer organization as an organization admin.
3. Open Settings, then Integrations, and show the Google Meet connection card before connection.
4. Start the connection and record the complete English-language Google consent screen with every requested scope visible.
5. Complete OAuth and show the connected organizer email in Argos.
6. Add an include phrase such as `demo` and an exclude phrase such as `internal`.
7. Select a default Argos rep and confirm recording-processing consent.
8. Show one recorded `Customer Demo` meeting and one `Internal Demo Practice` meeting in the connected Google account.
9. Run Sync now. Show that the included recording creates one Argos call and one processing job.
10. Show that the excluded recording has skipped metadata and no MP4 in Argos storage.
11. Delete the imported call and show that its private recording is removed and a resync does not recreate it.
12. Disconnect Google Meet and show that future sync is disabled and the organizer can reconnect only through a new consent grant.

The recording must use the same production OAuth project, branding, domains, redirect URI, and scope set submitted for verification. Do not include customer data, secrets, tokens, or PHI in the demo.

## Submission Checklist

- Complete a legal review of the public privacy, terms, security, retention, deletion, and consent language.
- Create a dedicated reviewer organization and synthetic Meet recordings.
- Record and publish an accessible demo video using the script above.
- Publish the production OAuth app from Testing to In production.
- In Verification Center, submit branding, each scope justification, and the demo video.
- Respond to Google reviewer questions from the monitored project contact mailbox.
- Engage a Google-approved assessor when Google starts the restricted-scope security-assessment phase.
- Record approval emails, scope approvals, assessment evidence, expiration dates, and renewal owner in the compliance evidence store.

## Staged Production Rollout

1. Set the approved production client ID, client secret, and redirect URI in Vercel and Fly without changing the testing project.
2. Redeploy web and worker runtimes and verify the deployed commit and environment identity.
3. Connect one non-PHI internal organization and complete the end-to-end demo checks.
4. Expand to two external pilot organizations and monitor OAuth callbacks, refresh failures, sync errors, filtered artifacts, downloads, processing jobs, and deletion events.
5. Expand in small cohorts only after seven consecutive days without unresolved authorization, tenant-isolation, deletion, or duplicate-import failures.
6. Keep an administrator guide ready for Google Workspace domains that block or limit third-party applications.

## Go/No-Go Gate

General availability requires all of the following:

- Google production OAuth status is verified for the exact requested scopes.
- The restricted-scope security assessment is complete and current.
- Public policies are deployed and legally approved.
- Provider revocation, deletion suppression, private storage, tenant isolation, and audit tests pass.
- Production Vercel and Fly credentials refer to the same approved OAuth client.
- The staged pilot has no unresolved critical or high-severity security findings.
