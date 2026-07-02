-- Keep internal RLS helpers out of the exposed public RPC schema.
-- Policies still execute these functions as authenticated users, but the
-- functions live in a non-exposed schema and use an explicit empty search path.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema private to service_role;
  end if;
end $$;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema private
  revoke execute on functions from public;

create or replace function private.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id
  from public.users
  where id = auth.uid()
  limit 1;
$$;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.users
  where id = auth.uid()
  limit 1;
$$;

create or replace function private.user_belongs_to_current_org(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = target_user_id
      and org_id = private.current_user_org_id()
  );
$$;

create or replace function private.call_belongs_to_current_org(target_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.calls
    where id = target_call_id
      and org_id = private.current_user_org_id()
  );
$$;

create or replace function private.current_user_is_org_wide()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_role() in ('admin', 'executive');
$$;

create or replace function private.current_user_can_see_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.current_user_is_org_wide()
    or exists (
      select 1
      from public.team_memberships memberships
      where memberships.org_id = private.current_user_org_id()
        and memberships.team_id = target_team_id
        and memberships.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.team_permission_grants grants
      where grants.org_id = private.current_user_org_id()
        and grants.user_id = auth.uid()
        and grants.team_id = target_team_id
    );
$$;

create or replace function private.current_user_can_read_rep_with_permissions(
  target_rep_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_rep_id = auth.uid()
    or private.current_user_is_org_wide()
    or (
      private.current_user_role() = 'manager'
      and exists (
        select 1
        from public.team_permission_grants grants
        join public.team_memberships rep_membership
          on rep_membership.org_id = grants.org_id
         and rep_membership.team_id = grants.team_id
         and rep_membership.user_id = target_rep_id
         and rep_membership.membership_type = 'rep'
        where grants.org_id = private.current_user_org_id()
          and grants.user_id = auth.uid()
          and grants.permission_key = any(required_permissions)
      )
    );
$$;

create or replace function private.current_user_can_write_rep_with_permissions(
  target_rep_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_rep_id = auth.uid()
    or private.current_user_role() = 'admin'
    or (
      private.current_user_role() = 'manager'
      and exists (
        select 1
        from public.team_permission_grants grants
        join public.team_memberships rep_membership
          on rep_membership.org_id = grants.org_id
         and rep_membership.team_id = grants.team_id
         and rep_membership.user_id = target_rep_id
         and rep_membership.membership_type = 'rep'
        where grants.org_id = private.current_user_org_id()
          and grants.user_id = auth.uid()
          and grants.permission_key = any(required_permissions)
      )
    );
$$;

create or replace function private.current_user_can_read_call_with_permissions(
  target_call_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.calls call_row
    where call_row.id = target_call_id
      and call_row.org_id = private.current_user_org_id()
      and (
        private.current_user_is_org_wide()
        or private.current_user_can_read_rep_with_permissions(call_row.rep_id, required_permissions)
      )
  );
$$;

create or replace function private.current_user_can_write_call_with_permissions(
  target_call_id uuid,
  required_permissions text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.calls call_row
    where call_row.id = target_call_id
      and call_row.org_id = private.current_user_org_id()
      and (
        private.current_user_role() = 'admin'
        or private.current_user_can_write_rep_with_permissions(call_row.rep_id, required_permissions)
      )
  );
$$;

create or replace function private.current_user_can_assign_training_progress(
  target_rep_id uuid,
  target_module_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return
    private.user_belongs_to_current_org(target_rep_id)
    and exists (
      select 1
      from public.training_modules modules
      where modules.id = target_module_id
        and modules.org_id = private.current_user_org_id()
    )
    and (
      private.current_user_role() = 'admin'
      or (
        private.current_user_role() = 'manager'
        and exists (
          select 1
          from public.team_permission_grants grants
          join public.team_memberships rep_membership
            on rep_membership.org_id = grants.org_id
           and rep_membership.team_id = grants.team_id
           and rep_membership.user_id = target_rep_id
           and rep_membership.membership_type = 'rep'
          where grants.org_id = private.current_user_org_id()
            and grants.user_id = auth.uid()
            and grants.permission_key = 'manage_team_training'
        )
      )
    );
end;
$$;

create or replace function private.current_user_can_update_training_progress(
  target_rep_id uuid,
  target_module_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return
    private.user_belongs_to_current_org(target_rep_id)
    and exists (
      select 1
      from public.training_modules modules
      where modules.id = target_module_id
        and modules.org_id = private.current_user_org_id()
    )
    and (
      target_rep_id = auth.uid()
      or private.current_user_role() = 'admin'
      or (
        private.current_user_role() = 'manager'
        and exists (
          select 1
          from public.team_permission_grants grants
          join public.team_memberships rep_membership
            on rep_membership.org_id = grants.org_id
           and rep_membership.team_id = grants.team_id
           and rep_membership.user_id = target_rep_id
           and rep_membership.membership_type = 'rep'
          where grants.org_id = private.current_user_org_id()
            and grants.user_id = auth.uid()
            and grants.permission_key = 'manage_team_training'
        )
      )
    );
end;
$$;

create or replace function private.current_user_can_read_training_progress(
  target_rep_id uuid,
  target_module_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return
    private.user_belongs_to_current_org(target_rep_id)
    and exists (
      select 1
      from public.training_modules modules
      where modules.id = target_module_id
        and modules.org_id = private.current_user_org_id()
    )
    and (
      target_rep_id = auth.uid()
      or private.current_user_is_org_wide()
      or (
        private.current_user_role() = 'manager'
        and exists (
          select 1
          from public.team_permission_grants grants
          join public.team_memberships rep_membership
            on rep_membership.org_id = grants.org_id
           and rep_membership.team_id = grants.team_id
           and rep_membership.user_id = target_rep_id
           and rep_membership.membership_type = 'rep'
          where grants.org_id = private.current_user_org_id()
            and grants.user_id = auth.uid()
            and grants.permission_key in ('view_team_training', 'manage_team_training')
        )
      )
    );
end;
$$;

revoke all on function private.current_user_org_id() from public, anon, authenticated;
revoke all on function private.current_user_role() from public, anon, authenticated;
revoke all on function private.user_belongs_to_current_org(uuid) from public, anon, authenticated;
revoke all on function private.call_belongs_to_current_org(uuid) from public, anon, authenticated;
revoke all on function private.current_user_is_org_wide() from public, anon, authenticated;
revoke all on function private.current_user_can_see_team(uuid) from public, anon, authenticated;
revoke all on function private.current_user_can_read_rep_with_permissions(uuid, text[]) from public, anon, authenticated;
revoke all on function private.current_user_can_write_rep_with_permissions(uuid, text[]) from public, anon, authenticated;
revoke all on function private.current_user_can_read_call_with_permissions(uuid, text[]) from public, anon, authenticated;
revoke all on function private.current_user_can_write_call_with_permissions(uuid, text[]) from public, anon, authenticated;
revoke all on function private.current_user_can_assign_training_progress(uuid, uuid) from public, anon, authenticated;
revoke all on function private.current_user_can_update_training_progress(uuid, uuid) from public, anon, authenticated;
revoke all on function private.current_user_can_read_training_progress(uuid, uuid) from public, anon, authenticated;

grant execute on function private.current_user_org_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.user_belongs_to_current_org(uuid) to authenticated;
grant execute on function private.call_belongs_to_current_org(uuid) to authenticated;
grant execute on function private.current_user_is_org_wide() to authenticated;
grant execute on function private.current_user_can_see_team(uuid) to authenticated;
grant execute on function private.current_user_can_read_rep_with_permissions(uuid, text[]) to authenticated;
grant execute on function private.current_user_can_write_rep_with_permissions(uuid, text[]) to authenticated;
grant execute on function private.current_user_can_read_call_with_permissions(uuid, text[]) to authenticated;
grant execute on function private.current_user_can_write_call_with_permissions(uuid, text[]) to authenticated;
grant execute on function private.current_user_can_assign_training_progress(uuid, uuid) to authenticated;
grant execute on function private.current_user_can_update_training_progress(uuid, uuid) to authenticated;
grant execute on function private.current_user_can_read_training_progress(uuid, uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function private.current_user_org_id() to service_role;
    grant execute on function private.current_user_role() to service_role;
    grant execute on function private.user_belongs_to_current_org(uuid) to service_role;
    grant execute on function private.call_belongs_to_current_org(uuid) to service_role;
    grant execute on function private.current_user_is_org_wide() to service_role;
    grant execute on function private.current_user_can_see_team(uuid) to service_role;
    grant execute on function private.current_user_can_read_rep_with_permissions(uuid, text[]) to service_role;
    grant execute on function private.current_user_can_write_rep_with_permissions(uuid, text[]) to service_role;
    grant execute on function private.current_user_can_read_call_with_permissions(uuid, text[]) to service_role;
    grant execute on function private.current_user_can_write_call_with_permissions(uuid, text[]) to service_role;
    grant execute on function private.current_user_can_assign_training_progress(uuid, uuid) to service_role;
    grant execute on function private.current_user_can_update_training_progress(uuid, uuid) to service_role;
    grant execute on function private.current_user_can_read_training_progress(uuid, uuid) to service_role;
  end if;
end $$;

do $$
declare
  helper_names text[] := array[
    'call_belongs_to_current_org',
    'current_user_can_assign_training_progress',
    'current_user_can_read_call_with_permissions',
    'current_user_can_read_rep_with_permissions',
    'current_user_can_read_training_progress',
    'current_user_can_see_team',
    'current_user_can_update_training_progress',
    'current_user_can_write_call_with_permissions',
    'current_user_can_write_rep_with_permissions',
    'current_user_is_org_wide',
    'current_user_org_id',
    'current_user_role',
    'user_belongs_to_current_org'
  ];
  helper_name text;
  policy_row record;
  policy_roles text;
  using_expr text;
  check_expr text;
  create_sql text;
begin
  for policy_row in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    using_expr := policy_row.qual;
    check_expr := policy_row.with_check;

    foreach helper_name in array helper_names loop
      using_expr := replace(using_expr, 'public.' || helper_name || '(', 'private.' || helper_name || '(');
      check_expr := replace(check_expr, 'public.' || helper_name || '(', 'private.' || helper_name || '(');
      using_expr := regexp_replace(
        using_expr,
        '(^|[^[:alnum:]_.])' || helper_name || '\(',
        '\1private.' || helper_name || '(',
        'g'
      );
      check_expr := regexp_replace(
        check_expr,
        '(^|[^[:alnum:]_.])' || helper_name || '\(',
        '\1private.' || helper_name || '(',
        'g'
      );
    end loop;

    if using_expr is not distinct from policy_row.qual
      and check_expr is not distinct from policy_row.with_check then
      continue;
    end if;

    select string_agg(
      case
        when role_name::text = 'public' then 'public'
        else quote_ident(role_name::text)
      end,
      ', '
      order by role_name::text
    )
    into policy_roles
    from unnest(policy_row.roles) as role_name;

    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );

    create_sql := format(
      'create policy %I on %I.%I as %s for %s to %s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      lower(policy_row.permissive),
      lower(policy_row.cmd),
      policy_roles
    );

    if using_expr is not null then
      create_sql := create_sql || format(' using (%s)', using_expr);
    end if;

    if check_expr is not null then
      create_sql := create_sql || format(' with check (%s)', check_expr);
    end if;

    execute create_sql;
  end loop;
end $$;

drop function if exists public.current_user_can_assign_training_progress(uuid, uuid);
drop function if exists public.current_user_can_read_call_with_permissions(uuid, text[]);
drop function if exists public.current_user_can_read_rep_with_permissions(uuid, text[]);
drop function if exists public.current_user_can_read_training_progress(uuid, uuid);
drop function if exists public.current_user_can_see_team(uuid);
drop function if exists public.current_user_can_update_training_progress(uuid, uuid);
drop function if exists public.current_user_can_write_call_with_permissions(uuid, text[]);
drop function if exists public.current_user_can_write_rep_with_permissions(uuid, text[]);
drop function if exists public.current_user_is_org_wide();
drop function if exists public.call_belongs_to_current_org(uuid);
drop function if exists public.user_belongs_to_current_org(uuid);
drop function if exists public.current_user_role();
drop function if exists public.current_user_org_id();
