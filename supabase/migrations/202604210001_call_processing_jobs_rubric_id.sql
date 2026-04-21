alter table public.call_processing_jobs
  add column if not exists rubric_id uuid references public.rubrics(id) on delete restrict;

create index if not exists call_processing_jobs_rubric_id_idx
  on public.call_processing_jobs (rubric_id);

update public.call_processing_jobs as jobs
set rubric_id = calls.rubric_id
from public.calls as calls
where jobs.call_id = calls.id
  and jobs.rubric_id is null
  and calls.rubric_id is not null;
