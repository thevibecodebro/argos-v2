-- Restrict direct RPC execution for SECURITY DEFINER helpers. The RLS policy
-- helpers still need authenticated execution because protected table policies
-- call them while evaluating signed-in requests.

do $$
declare
  helper regprocedure;
begin
  foreach helper in array array[
    'public.call_belongs_to_current_org(uuid)'::regprocedure,
    'public.current_user_can_assign_training_progress(uuid, uuid)'::regprocedure,
    'public.current_user_can_read_call_with_permissions(uuid, text[])'::regprocedure,
    'public.current_user_can_read_rep_with_permissions(uuid, text[])'::regprocedure,
    'public.current_user_can_read_training_progress(uuid, uuid)'::regprocedure,
    'public.current_user_can_see_team(uuid)'::regprocedure,
    'public.current_user_can_update_training_progress(uuid, uuid)'::regprocedure,
    'public.current_user_can_write_call_with_permissions(uuid, text[])'::regprocedure,
    'public.current_user_can_write_rep_with_permissions(uuid, text[])'::regprocedure,
    'public.current_user_is_org_wide()'::regprocedure,
    'public.current_user_org_id()'::regprocedure,
    'public.current_user_role()'::regprocedure,
    'public.user_belongs_to_current_org(uuid)'::regprocedure
  ]
  loop
    execute format('revoke all on function %s from public', helper);
    execute format('revoke all on function %s from anon', helper);
    execute format('grant execute on function %s to authenticated', helper);
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', helper);
    end if;
  end loop;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public';
    execute 'revoke all on function public.rls_auto_enable() from anon';
    execute 'revoke all on function public.rls_auto_enable() from authenticated';
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute 'grant execute on function public.rls_auto_enable() to service_role';
    end if;
  end if;
end $$;
