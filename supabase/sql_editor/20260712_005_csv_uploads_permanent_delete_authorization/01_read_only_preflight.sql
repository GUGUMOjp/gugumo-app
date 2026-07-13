-- GUGUMO csv_uploads permanent delete authorization preflight
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Forbidden project: ivtaxvuysqqnzpnwndqt
-- Purpose: read-only confirmation immediately before applying excluded-only DELETE authorization.
--
-- Confirm the Supabase Dashboard project ID before running.
-- This SQL is read-only and returns one consolidated result table.

with policy_inventory as (
  select policyname, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'csv_uploads'
),
direct_grants as (
  select grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'csv_uploads'
    and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
),
status_constraint as (
  select pg_get_constraintdef(oid, true) as definition
  from pg_constraint
  where conrelid = 'public.csv_uploads'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid, true) ilike '%status%'
),
column_inventory as (
  select column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'csv_uploads'
),
profile_columns as (
  select column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
),
preflight_rows as (
  select
    'project_confirmation' as check_name,
    'REVIEW' as result_status,
    1::bigint as item_count,
    'Confirm Dashboard project name GUGUMOjp''s Project and project ID annvqxnupddnozyghqdw before running any apply SQL. Do not run on ivtaxvuysqqnzpnwndqt.' as detail

  union all

  select
    'csv_uploads_columns' as check_name,
    case
      when not exists (select 1 from column_inventory where column_name = 'id') then 'STOP'
      when not exists (select 1 from column_inventory where column_name = 'company_id') then 'STOP'
      when not exists (select 1 from column_inventory where column_name = 'workspace_id') then 'STOP'
      when not exists (select 1 from column_inventory where column_name = 'status') then 'STOP'
      else 'PASS'
    end as result_status,
    (select count(*) from column_inventory)::bigint as item_count,
    'Required delete filter columns: id, company_id, workspace_id, status.' as detail

  union all

  select
    'rls_state' as check_name,
    case
      when c.relrowsecurity then 'PASS'
      else 'STOP'
    end as result_status,
    1::bigint as item_count,
    concat('rls_enabled=', c.relrowsecurity, '; force_rls=', c.relforcerowsecurity) as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'csv_uploads'
    and c.relkind = 'r'

  union all

  select
    'delete_policy_absence' as check_name,
    case when exists (select 1 from policy_inventory where cmd = 'DELETE') then 'STOP' else 'PASS' end as result_status,
    (select count(*) from policy_inventory where cmd = 'DELETE')::bigint as item_count,
    concat('delete_policy_names=', coalesce((select string_agg(policyname, ', ' order by policyname) from policy_inventory where cmd = 'DELETE'), 'none')) as detail

  union all

  select
    'authenticated_delete_privilege_absence' as check_name,
    case when exists (select 1 from direct_grants where grantee = 'authenticated' and privilege_type = 'DELETE') then 'STOP' else 'PASS' end as result_status,
    (select count(*) from direct_grants where grantee = 'authenticated' and privilege_type = 'DELETE')::bigint as item_count,
    'authenticated must not already have DELETE before this package is applied.' as detail

  union all

  select
    'anon_public_privilege_absence' as check_name,
    case when exists (select 1 from direct_grants where grantee in ('PUBLIC', 'anon')) then 'STOP' else 'PASS' end as result_status,
    (select count(*) from direct_grants where grantee in ('PUBLIC', 'anon'))::bigint as item_count,
    'anon/PUBLIC must not have csv_uploads table privileges.' as detail

  union all

  select
    'status_constraint' as check_name,
    case
      when exists (select 1 from status_constraint where definition ilike '%active%' and definition ilike '%excluded%') then 'PASS'
      else 'REVIEW'
    end as result_status,
    (select count(*) from status_constraint)::bigint as item_count,
    concat('status_constraints=', coalesce((select string_agg(definition, '; ') from status_constraint), 'none')) as detail

  union all

  select
    'profiles_role_tenant_columns' as check_name,
    case
      when not exists (select 1 from profile_columns where column_name = 'id') then 'STOP'
      when not exists (select 1 from profile_columns where column_name = 'company_id') then 'STOP'
      when not exists (select 1 from profile_columns where column_name = 'workspace_id') then 'STOP'
      when not exists (select 1 from profile_columns where column_name = 'role') then 'STOP'
      else 'PASS'
    end as result_status,
    (select count(*) from profile_columns)::bigint as item_count,
    'DELETE policy will use direct public.profiles EXISTS checks with id, company_id, workspace_id, and role.' as detail
)
select check_name, result_status, item_count, detail
from preflight_rows
order by
  case check_name
    when 'project_confirmation' then 10
    when 'csv_uploads_columns' then 20
    when 'rls_state' then 30
    when 'delete_policy_absence' then 40
    when 'authenticated_delete_privilege_absence' then 50
    when 'anon_public_privilege_absence' then 60
    when 'status_constraint' then 70
    when 'profiles_role_tenant_columns' then 80
    else 999
  end;
