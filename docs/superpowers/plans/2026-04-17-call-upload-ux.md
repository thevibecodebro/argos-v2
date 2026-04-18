## Goal

Improve the Argos call-recording upload UX so users see real transfer progress, understand processing state after the upload completes, and get actionable recovery guidance for common failures.

## Decision

Do not implement chunked uploads in this pass.

The current architecture only supports a single multipart request handled synchronously in `POST /api/calls/upload`. There is no resumable upload session model, no chunk storage/assembly path, and no background worker infrastructure for finalization. A minimal chunked solution would require new endpoints, storage behavior, and server-side coordination well beyond the UX scope of this task.

## Scope

1. Keep the upload as a single request.
2. Add real upload progress on the client using XHR upload progress events.
3. Split UI state into explicit phases:
   - idle
   - ready
   - uploading
   - processing
   - success
   - error
   - canceled
4. Improve backend error contracts for:
   - oversized file
   - unsupported file type
   - processing failure after bytes finish uploading
5. Add cancel and retry on the client where feasible.
6. Add tests for validation, progress/cancel behavior, and error mapping.

## Planned Changes

1. Create a small upload client helper for:
   - file validation
   - XHR request execution
   - progress callbacks
   - abort support
2. Update `UploadCallPanel` to use the helper and render accessible status and recovery guidance.
3. Update `/api/calls/upload` to return structured error payloads with stable codes and actionable messages.
4. Keep `uploadCall()` in the calls service synchronous, but classify processing failures so the client can distinguish them from transfer failures.
5. Add focused tests around the helper, route, and panel state rendering/behavior where practical in the current test setup.
