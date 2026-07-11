-- GUGUMO Release Readiness Critical RLS Repair
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Target tables: public.companies, public.workspaces, public.profiles, public.csv_uploads
-- Purpose: read-only verification after 05b_apply_four_table_rls.sql.
-- Read-only status: READ ONLY.
-- Stop conditions:
--   - Any FAIL row below.
--   - Any REVIEW row that cannot be explained by the approved design.

with target_tables(table_schema, table_name, expected_policy_count) as (
  values
    ('public', 'companies', 1),
    ('public', 'workspaces', 1),
    ('public', 'profiles', 1),
    ('public', 'csv_uploads', 3)
)
select
  tt.table_name,
  case when c.relrowsecurity then 'PASS' else 'FAIL' end as rls_status,
  c.relrowsecurity as rls_enabled,
  case when c.relforcerowsecurity then 'REVIEW: FORCE RLS enabled' else 'INFO: FORCE RLS not enabled' end as force_rls_status,
  c.relforcerowsecurity as force_rls_enabled
from target_tables tt
join pg_namespace n on n.nspname = tt.table_schema
join pg_class c on c.relnamespace = n.oid
  and c.relname = tt.table_name
  and c.relkind in ('r', 'p')
order by tt.table_name;

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
    when roles <> array['authenticated']::name[] then 'FAIL: policy role is not exactly authenticated'
    when cmd in ('ALL', 'DELETE') then 'FAIL: ALL/DELETE policy'
    when policyname not in (
      'profiles_authenticated_select_self',
      'companies_authenticated_select_own',
      'workspaces_authenticated_select_own',
      'csv_uploads_authenticated_select_same_tenant',
      'csv_uploads_authenticated_insert_same_tenant',
      'csv_uploads_owner_admin_update_same_tenant'
    ) then 'FAIL: unexpected policy'
    when tablename = 'profiles' and cmd = 'SELECT' and qual ilike '%auth.uid%' and qual ilike '%id%' then 'PASS'
    when tablename = 'companies' and cmd = 'SELECT' and qual ilike '%profiles%' and qual ilike '%auth.uid%' and qual ilike '%company_id%' then 'PASS'
    when tablename = 'workspaces' and cmd = 'SELECT' and qual ilike '%profiles%' and qual ilike '%auth.uid%' and qual ilike '%workspace_id%' and qual ilike '%company_id%' then 'PASS'
    when tablename = 'csv_uploads' and cmd = 'SELECT' and qual ilike '%profiles%' and qual ilike '%owner%' and qual ilike '%viewer%' then 'PASS'
    when tablename = 'csv_uploads' and cmd = 'INSERT' and with_check ilike '%uploaded_by%' and with_check ilike '%owner%' and with_check ilike '%member%' then 'PASS'
    when tablename = 'csv_uploads' and cmd = 'UPDATE' and qual ilike '%owner%' and qual ilike '%admin%' and with_check ilike '%owner%' and with_check ilike '%admin%' then 'PASS'
    else 'REVIEW: condition text requires human review'
  end as review_status
from pg_policies
where schemaname = 'public'
  and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads')
order by tablename, cmd, policyname;

with expected_policies(tablename, policyname, cmd) as (
  values
    ('profiles', 'profiles_authenticated_select_self', 'SELECT'),
    ('companies', 'companies_authenticated_select_own', 'SELECT'),
    ('workspaces', 'workspaces_authenticated_select_own', 'SELECT'),
    ('csv_uploads', 'csv_uploads_authenticated_select_same_tenant', 'SELECT'),
    ('csv_uploads', 'csv_uploads_authenticated_insert_same_tenant', 'INSERT'),
    ('csv_uploads', 'csv_uploads_owner_admin_update_same_tenant', 'UPDATE')
)
select
  ep.tablename,
  ep.policyname,
  ep.cmd,
  case when p.policyname is null then 'FAIL: expected policy missing' else 'PASS' end as result
from expected_policies ep
left join pg_policies p on p.schemaname = 'public'
  and p.tablename = ep.tablename
  and p.policyname = ep.policyname
  and p.cmd = ep.cmd
order by ep.tablename, ep.cmd, ep.policyname;

select
  tablename,
  cmd,
  count(*) as policy_count,
  case
    when tablename in ('companies', 'workspaces', 'profiles') and cmd = 'SELECT' and count(*) = 1 then 'PASS'
    when tablename = 'csv_uploads' and cmd in ('SELECT', 'INSERT', 'UPDATE') and count(*) = 1 then 'PASS'
    when cmd in ('DELETE', 'ALL') then 'FAIL'
    else 'REVIEW'
  end as expected_count_status,
  string_agg(policyname, ', ' order by policyname) as policy_names
from pg_policies
where schemaname = 'public'
  and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads')
group by tablename, cmd
order by tablename, cmd;

select
  table_name,
  grantee,
  privilege_type,
  is_grantable,
  case
    when grantee in ('anon', 'PUBLIC') then 'FAIL: anonymous/PUBLIC table privilege remains'
    when grantee = 'authenticated' and table_name in ('companies', 'workspaces', 'profiles') and privilege_type = 'SELECT' then 'PASS'
    when grantee = 'authenticated' and table_name = 'csv_uploads' and privilege_type in ('SELECT', 'INSERT', 'UPDATE') then 'PASS'
    when grantee = 'authenticated' and privilege_type in ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER') then 'FAIL: unsafe authenticated privilege remains'
    when grantee = 'service_role' then 'INFO: service_role present; app must not use Service Role'
    else 'REVIEW'
  end as review_status
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('companies', 'workspaces', 'profiles', 'csv_uploads')
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'service_role')
  and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
order by table_name, grantee, privilege_type;

select
  table_name,
  column_name,
  grantee,
  privilege_type,
  is_grantable,
  case
    when grantee in ('anon', 'PUBLIC') then 'FAIL: anonymous/PUBLIC column privilege remains'
    when grantee = 'authenticated' and table_name in ('companies', 'workspaces', 'profiles') and privilege_type = 'SELECT' then 'INFO: authenticated table SELECT should be sufficient'
    when grantee = 'authenticated' and table_name = 'csv_uploads' and privilege_type in ('SELECT', 'INSERT', 'UPDATE') then 'INFO: authenticated table grant should be sufficient'
    when grantee = 'service_role' then 'INFO: service_role present; app must not use Service Role'
    else 'REVIEW'
  end as review_status
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('companies', 'workspaces', 'profiles', 'csv_uploads')
  and grantee in ('anon', 'authenticated', 'PUBLIC', 'service_role')
order by table_name, column_name, grantee, privilege_type;

with id_generation as (
  select
    c.column_default,
    c.is_identity,
    c.identity_generation,
    pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name)::regclass as id_sequence,
    exists (
      select 1
      from pg_trigger t
      join pg_class rel on rel.oid = t.tgrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
      where ns.nspname = 'public'
        and rel.relname = 'csv_uploads'
        and not t.tgisinternal
        and t.tgenabled in ('O', 'A', 'R')
    ) as has_enabled_user_trigger
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'csv_uploads'
    and c.column_name = 'id'
)
select
  'csv_uploads_id_generation' as check_name,
  case
    when is_identity = 'YES' then 'PASS: identity column'
    when column_default is not null then 'PASS: column default exists'
    when id_sequence is not null then 'PASS: owned sequence exists'
    when has_enabled_user_trigger then 'REVIEW: enabled user trigger exists'
    else 'FAIL: no id generation mechanism found'
  end as result,
  column_default,
  is_identity,
  identity_generation,
  id_sequence::text as id_sequence,
  has_enabled_user_trigger
from id_generation;

with id_sequence as (
  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass as seq_regclass
),
sequence_acl as (
  select
    ids.seq_regclass,
    acl.grantee,
    acl.privilege_type,
    acl.is_grantable
  from id_sequence ids
  join pg_class seq on seq.oid = ids.seq_regclass
  cross join lateral aclexplode(coalesce(seq.relacl, '{}'::aclitem[])) acl
  where ids.seq_regclass is not null
),
relevant_grants as (
  select
    coalesce(r.rolname, case when sa.grantee = 0 then 'PUBLIC' end) as grantee,
    sa.seq_regclass,
    sa.privilege_type,
    sa.is_grantable
  from sequence_acl sa
  left join pg_roles r on r.oid = sa.grantee
)
select
  'csv_uploads_id_sequence_effective_privileges' as check_name,
  rtc.role_name,
  case
    when ids.seq_regclass is null then 'FAIL: csv_uploads id sequence missing'
    when rtc.role_name = 'anon'
      and not has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'USAGE')
      and not has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'SELECT')
      and not has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'UPDATE') then 'PASS'
    when rtc.role_name = 'authenticated'
      and has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'USAGE')
      and not has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'SELECT')
      and not has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'UPDATE') then 'PASS'
    when rtc.role_name = 'service_role' then 'INFO: service_role not changed by this package'
    else 'FAIL: unexpected effective sequence privilege'
  end as result,
  ids.seq_regclass::text as sequence_name,
  case when ids.seq_regclass is null then null else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'USAGE') end as has_usage,
  case when ids.seq_regclass is null then null else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'SELECT') end as has_select,
  case when ids.seq_regclass is null then null else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'UPDATE') end as has_update
from id_sequence ids
cross join (values ('anon'), ('authenticated'), ('service_role')) as rtc(role_name)
order by rtc.role_name;

with id_sequence as (
  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass as seq_regclass
),
sequence_acl as (
  select
    ids.seq_regclass,
    acl.grantee,
    acl.privilege_type,
    acl.is_grantable
  from id_sequence ids
  join pg_class seq on seq.oid = ids.seq_regclass
  cross join lateral aclexplode(coalesce(seq.relacl, '{}'::aclitem[])) acl
  where ids.seq_regclass is not null
),
public_grants as (
  select
    seq_regclass,
    privilege_type,
    is_grantable
  from sequence_acl
  where grantee = 0
)
select
  'csv_uploads_id_sequence_public_grant' as check_name,
  'PUBLIC' as role_name,
  case
    when (select seq_regclass from id_sequence) is null then 'FAIL: csv_uploads id sequence missing'
    when coalesce(bool_or(privilege_type = 'USAGE'), false) is false
      and coalesce(bool_or(privilege_type = 'SELECT'), false) is false
      and coalesce(bool_or(privilege_type = 'UPDATE'), false) is false then 'PASS'
    else 'FAIL: PUBLIC sequence grant remains'
  end as result,
  (select seq_regclass::text from id_sequence) as sequence_name,
  coalesce(bool_or(privilege_type = 'USAGE'), false) as public_has_usage_grant,
  coalesce(bool_or(privilege_type = 'SELECT'), false) as public_has_select_grant,
  coalesce(bool_or(privilege_type = 'UPDATE'), false) as public_has_update_grant,
  string_agg(privilege_type, ', ' order by privilege_type) as public_direct_privileges
from public_grants;

with id_sequence as (
  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass as seq_regclass
),
sequence_acl as (
  select
    ids.seq_regclass,
    acl.grantee,
    acl.privilege_type,
    acl.is_grantable
  from id_sequence ids
  join pg_class seq on seq.oid = ids.seq_regclass
  cross join lateral aclexplode(coalesce(seq.relacl, '{}'::aclitem[])) acl
  where ids.seq_regclass is not null
),
relevant_grants as (
  select
    coalesce(r.rolname, case when sa.grantee = 0 then 'PUBLIC' end) as grantee,
    sa.seq_regclass,
    sa.privilege_type,
    sa.is_grantable
  from sequence_acl sa
  left join pg_roles r on r.oid = sa.grantee
)
select
  'csv_uploads_id_sequence_direct_acl' as check_name,
  rtc.role_name,
  case
    when ids.seq_regclass is null then 'FAIL: csv_uploads id sequence missing'
    when rtc.role_name in ('anon', 'PUBLIC') and exists (
      select 1
      from relevant_grants
      where grantee = rtc.role_name
    ) then 'FAIL: direct sequence ACL remains'
    when rtc.role_name = 'authenticated'
      and bool_or(rg.privilege_type = 'USAGE') is true
      and coalesce(bool_or(rg.privilege_type = 'SELECT'), false) is false
      and coalesce(bool_or(rg.privilege_type = 'UPDATE'), false) is false then 'PASS'
    when rtc.role_name = 'authenticated' then 'FAIL: authenticated direct ACL is not USAGE only'
    when rtc.role_name = 'service_role' then 'INFO: service_role not changed by this package'
    else 'PASS'
  end as result,
  ids.seq_regclass::text as sequence_name,
  coalesce(bool_or(rg.privilege_type = 'USAGE'), false) as direct_usage,
  coalesce(bool_or(rg.privilege_type = 'SELECT'), false) as direct_select,
  coalesce(bool_or(rg.privilege_type = 'UPDATE'), false) as direct_update,
  string_agg(rg.privilege_type, ', ' order by rg.privilege_type) as direct_privileges
from id_sequence ids
cross join (values ('anon'), ('authenticated'), ('PUBLIC'), ('service_role')) as rtc(role_name)
left join relevant_grants rg on rg.grantee = rtc.role_name
group by ids.seq_regclass, rtc.role_name
order by rtc.role_name;

select
  'anonymous_rest_required' as check_name,
  'REVIEW' as result,
  'SQL metadata passed only if no FAIL rows above; REST behavior is still unproven' as observed,
  'Run 06 anonymous REST checks for companies, workspaces, profiles, csv_uploads, and csv_uploads.file_data' as expected;
