insert into public.organizations (id, name, slug, plan)
values (
  'de6607b8-355c-461d-a80c-f1a342f7028f',
  'Argos Demo Org',
  'argos-demo-org',
  'trial'
)
on conflict (id) do nothing;

insert into public.users (
  id,
  org_id,
  role,
  email,
  first_name,
  last_name,
  display_name_set
)
values (
  '5eb6eb29-8da8-457d-a2c6-9afd2308672d',
  'de6607b8-355c-461d-a80c-f1a342f7028f',
  'rep',
  'rep@argos.ai',
  'Riley',
  'Stone',
  true
)
on conflict (id) do nothing;

insert into public.calls (
  id,
  org_id,
  rep_id,
  status,
  consent_confirmed,
  overall_score,
  call_topic,
  created_at
)
values
  (
    'b5773405-f04f-4f7d-a2fc-a706a205bb26',
    'de6607b8-355c-461d-a80c-f1a342f7028f',
    '5eb6eb29-8da8-457d-a2c6-9afd2308672d',
    'complete',
    true,
    88,
    'ACME renewal',
    now() - interval '2 days'
  ),
  (
    '1ec5ed47-7f1c-4f2b-a79d-86098d84cd99',
    'de6607b8-355c-461d-a80c-f1a342f7028f',
    '5eb6eb29-8da8-457d-a2c6-9afd2308672d',
    'complete',
    true,
    72,
    'Globex objection handling',
    now() - interval '14 days'
  ),
  (
    '51c5b3bc-afb8-416d-9ae2-4f2f2c2e09fb',
    'de6607b8-355c-461d-a80c-f1a342f7028f',
    '5eb6eb29-8da8-457d-a2c6-9afd2308672d',
    'evaluating',
    true,
    null,
    'Northstar discovery',
    now() - interval '7 days'
  )
on conflict (id) do nothing;
