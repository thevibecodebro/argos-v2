alter table public.ghl_call_imports
  drop constraint if exists ghl_call_imports_skipped_reason_check;

alter table public.ghl_call_imports
  add constraint ghl_call_imports_skipped_reason_check
  check (
    skipped_reason in (
      'no_connected_integration',
      'consent_missing',
      'no_recording',
      'no_owner_mapping',
      'wrong_message_type',
      'invalid_recording_filename',
      'unauthorized_after_refresh'
    )
  );
