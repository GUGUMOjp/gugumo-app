-- GUGUMO csv_uploads permanent delete authorization verification
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Purpose: read-only verification after applying 02_apply_delete_authorization.sql.

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
delete_policy as (
  select *
  from policy_inventory
  where cmd = 'DELETE'
),
verify_rows as (
  select
    'rls_state' as check_name,
    case when c.relrowsecurity then 'PASS' else 'FAIL' end as result_status,
    1::bigint as item_count,
    concat('rls_enabled=', c.relrowsecurity, '; force_rls=', c.relforcerowsecurity) as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'csv_uploads'
    and c.relkind = 'r'

  union all

  select
    'authenticated_delete_privilege' as check_name,
    case when exists (select 1 from direct_grants where grantee = 'authenticated' and privilege_type = 'DELETE') then 'PASS' else 'FAIL' end as result_status,
    (select count(*) from direct_grants where grantee = 'authenticated' and privilege_type = 'DELETE')::bigint as item_count,
    'authenticated must have direct DELETE privilege; RLS policy limits rows.' as detail

  union all

  select
    'anon_public_delete_absence' as check_name,
    case when exists (select 1 from direct_grants where grantee in ('anon', 'PUBLIC') and privilege_type = 'DELETE') then 'FAIL' else 'PASS' end as result_status,
    (select count(*) from direct_grants where grantee in ('anon', 'PUBLIC') and privilege_type = 'DELETE')::bigint as item_count,
    'anon/PUBLIC must not have DELETE privilege.' as detail

  union all

  select
    'delete_policy_count' as check_name,
    case
      when (select count(*) from delete_policy) = 1
       and exists (select 1 from delete_policy where policyname = 'csv_uploads_owner_admin_delete_excluded_same_tenant') then 'PASS'
      else 'FAIL'
    end as result_status,
    (select count(*) from delete_policy)::bigint as item_count,
    concat('delete_policy_names=', coalesce((select string_agg(policyname, ', ' order by policyname) from delete_policy), 'none')) as detail

  union all

  select
    'delete_policy_condition' as check_name,
    case
      when exists (
        select 1
        from delete_policy
        where policyname = 'csv_uploads_owner_admin_delete_excluded_same_tenant'
          and roles = array['authenticated']::name[]
          and qual ilike '%excluded%'
          and qual ilike '%owner%'
          and qual ilike '%admin%'
          and qual ilike '%company_id%'
          and qual ilike '%workspace_id%'
          and qual ilike '%profiles%'
          and with_check is null
      ) then 'PASS'
      else 'FAIL'
    end as result_status,
    1::bigint as item_count,
    'Expected DELETE policy: authenticated only, USING status=excluded, owner/admin, same company/workspace via public.profiles EXISTS, no WITH CHECK.' as detail

  union all

  select
    'existing_select_insert_update_policy_preservation' as check_name,
    case
      when exists (
        select 1
        from policy_inventory
        where policyname = 'csv_uploads_authenticated_select_same_tenant'
          and cmd = 'SELECT'
      )
      and exists (
        select 1
        from policy_inventory
        where policyname = 'csv_uploads_authenticated_insert_same_tenant'
          and cmd = 'INSERT'
      )
      and exists (
        select 1
        from policy_inventory
        where policyname = 'csv_uploads_owner_admin_update_same_tenant'
          and cmd = 'UPDATE'
      ) then 'PASS'
      else 'FAIL'
    end as result_status,
    (
      select count(*)
      from policy_inventory
      where policyname in (
        'csv_uploads_authenticated_select_same_tenant',
        'csv_uploads_authenticated_insert_same_tenant',
        'csv_uploads_owner_admin_update_same_tenant'
      )
    )::bigint as item_count,
    'Existing SELECT, INSERT, and UPDATE policies must remain present after adding DELETE authorization.' as detail

  union all

  select
    'unexpected_delete_policy_absence' as check_name,
    case
      when exists (
        select 1
        from delete_policy
        where policyname <> 'csv_uploads_owner_admin_delete_excluded_same_tenant'
      ) then 'FAIL'
      else 'PASS'
    end as result_status,
    (select count(*) from delete_policy where policyname <> 'csv_uploads_owner_admin_delete_excluded_same_tenant')::bigint as item_count,
    'No extra DELETE policy should exist.' as detail
)
select check_name, result_status, item_count, detail
from verify_rows
order by
  case check_name
    when 'rls_state' then 10
    when 'authenticated_delete_privilege' then 20
    when 'anon_public_delete_absence' then 30
    when 'delete_policy_count' then 40
    when 'delete_policy_condition' then 50
    when 'existing_select_insert_update_policy_preservation' then 60
    when 'unexpected_delete_policy_absence' then 70
    else 999
  end;
