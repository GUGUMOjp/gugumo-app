-- GUGUMO Release Readiness Critical RLS Repair
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Target tables: public.companies, public.workspaces, public.profiles, public.csv_uploads
-- Purpose: read-only preflight before applying the four-table RLS repair.
-- Read-only status: READ ONLY.
-- Pre-check:
--   - Confirm Supabase Dashboard project name is GUGUMOjp's Project.
--   - Confirm Project ID is annvqxnupddnozyghqdw.
-- Stop conditions for write SQL:
--   - Any target table is missing.
--   - Any unknown, anon/public, ALL, DELETE, or broad policy exists.
--   - Same-table same-command permissive policy duplicates exist.
--   - profile tenant/role fields contain NULL or invalid values.
--   - helper functions unexpectedly exist and have not been reviewed.
--   - grants output differs from the intended REVOKE/GRANT design.

with target_tables(table_schema, table_name) as (
  values
    ('public', 'companies'),
    ('public', 'workspaces'),
    ('public', 'profiles'),
    ('public', 'csv_uploads')
)
select
  tt.table_schema,
  tt.table_name,
  case when c.oid is null then 'FAIL: table missing' else 'PASS' end as table_status,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls_enabled
from target_tables tt
left join pg_namespace n on n.nspname = tt.table_schema
left join pg_class c on c.relnamespace = n.oid
  and c.relname = tt.table_name
  and c.relkind in ('r', 'p')
order by tt.table_name;

select
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('companies', 'workspaces', 'profiles', 'csv_uploads')
  and column_name in (
    'id',
    'company_id',
    'workspace_id',
    'uploaded_by',
    'email',
    'name',
    'role',
    'file_data',
    'checksum',
    'status',
    'excluded_at',
    'excluded_by'
  )
order by table_name, ordinal_position;

select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  pg_get_constraintdef(pc.oid) as constraint_definition
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
  and kcu.constraint_name = tc.constraint_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
  and ccu.constraint_name = tc.constraint_name
left join pg_constraint pc
  on pc.conname = tc.constraint_name
  and pc.conrelid = to_regclass(format('%I.%I', tc.table_schema, tc.table_name))
where tc.table_schema = 'public'
  and tc.table_name in ('companies', 'workspaces', 'profiles', 'csv_uploads')
  and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY', 'CHECK')
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

select
  'profile_data_quality' as check_name,
  count(*) as total_profiles,
  count(*) filter (where id is null) as id_null_count,
  count(*) filter (where company_id is null) as company_id_null_count,
  count(*) filter (where workspace_id is null) as workspace_id_null_count,
  count(*) filter (where role is null) as role_null_count,
  count(*) filter (where role not in ('owner', 'admin', 'member', 'viewer')) as invalid_role_count
from public.profiles;

select
  'duplicated_profile_id_count' as check_name,
  count(*) as duplicated_id_count
from (
  select id
  from public.profiles
  group by id
  having count(*) > 1
) duplicated;

select
  table_name,
  row_count
from (
  select 'companies' as table_name, count(*) as row_count from public.companies
  union all
  select 'workspaces' as table_name, count(*) as row_count from public.workspaces
  union all
  select 'profiles' as table_name, count(*) as row_count from public.profiles
  union all
  select 'csv_uploads' as table_name, count(*) as row_count from public.csv_uploads
) counts
order by table_name;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  case
    when 'anon' = any(roles) then 'FAIL: anon policy'
    when 'public' = any(roles) then 'FAIL: public policy'
    when cmd = 'ALL' then 'FAIL: ALL policy'
    when cmd = 'DELETE' then 'FAIL: DELETE policy'
    when (cmd in ('SELECT', 'UPDATE') and (qual is null or qual = 'true')) then 'FAIL: broad USING'
    when (cmd in ('INSERT', 'UPDATE') and (with_check is null or with_check = 'true')) then 'FAIL: broad WITH CHECK'
    when policyname not in (
      'profiles_authenticated_select_self',
      'companies_authenticated_select_own',
      'workspaces_authenticated_select_own',
      'csv_uploads_authenticated_select_same_tenant',
      'csv_uploads_authenticated_insert_same_tenant',
      'csv_uploads_owner_admin_update_same_tenant'
    ) then 'FAIL: unknown policy'
    else 'REVIEW'
  end as review_status
from pg_policies
where schemaname = 'public'
  and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads')
order by tablename, cmd, policyname;

select
  tablename,
  cmd,
  permissive,
  count(*) as policy_count,
  case
    when permissive = 'PERMISSIVE' and count(*) > 1 then 'FAIL: same-command permissive policy overlap'
    else 'INFO'
  end as review_status,
  string_agg(policyname, ', ' order by policyname) as policy_names
from pg_policies
where schemaname = 'public'
  and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads')
group by tablename, cmd, permissive
order by tablename, cmd;

select
  grantee,
  table_name,
  privilege_type,
  is_grantable,
  case
    when grantee = 'anon' then 'REVIEW: anon privilege will be revoked'
    when grantee = 'PUBLIC' then 'REVIEW: PUBLIC privilege will be revoked'
    when grantee = 'authenticated' and table_name in ('companies', 'workspaces', 'profiles') and privilege_type = 'SELECT' then 'INFO: authenticated SELECT is required with RLS'
    when grantee = 'authenticated' and table_name = 'csv_uploads' and privilege_type in ('SELECT', 'INSERT', 'UPDATE') then 'INFO: authenticated csv_uploads privilege is required with RLS'
    when grantee = 'authenticated' and privilege_type in ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER') then 'REVIEW: authenticated unsafe privilege will be revoked'
    when grantee = 'service_role' then 'INFO: service_role is not used by the app; do not test with it'
    else 'REVIEW'
  end as review_status
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('companies', 'workspaces', 'profiles', 'csv_uploads')
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'service_role')
  and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
order by table_name, grantee, privilege_type;

select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  r.rolname as owner,
  p.prosecdef as security_definer,
  p.proconfig as config,
  pg_get_functiondef(p.oid) as definition,
  'REVIEW: helper functions are not expected for this draft' as review_status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where p.proname in (
  'gugumo_current_company_id',
  'gugumo_current_workspace_id',
  'gugumo_current_role'
)
order by function_schema, function_name, identity_arguments;

select
  'expected_helper_function_status' as check_name,
  case
    when exists (
      select 1
      from pg_proc
      where proname in (
        'gugumo_current_company_id',
        'gugumo_current_workspace_id',
        'gugumo_current_role'
      )
    ) then 'REVIEW: helper function exists'
    else 'PASS: helper functions not found'
  end as result,
  'This four-table package uses direct public.profiles EXISTS checks, not helper functions' as expected;
