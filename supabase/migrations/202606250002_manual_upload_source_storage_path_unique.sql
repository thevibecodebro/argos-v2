create unique index if not exists call_processing_jobs_manual_source_storage_path_uq
  on public.call_processing_jobs (source_storage_path)
  where source_origin = 'manual_upload';
