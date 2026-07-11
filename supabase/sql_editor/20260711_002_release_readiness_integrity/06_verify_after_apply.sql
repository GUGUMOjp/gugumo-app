-- GUGUMO Release Readiness Critical RLS Repair
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Target tables: public.companies, public.workspaces, public.profiles, public.csv_uploads
-- Purpose: final SQL metadata verification plus REST/app verification procedures.
-- Execution order: run after 05c_verify_four_table_rls.sql has no unexplained FAIL/REVIEW rows.
-- Read-only status: READ ONLY for Section A. Sections B-E are manual verification procedures.
-- Stop conditions:
--   - Any FAIL row in Section A.
--   - Any anonymous REST request returns rows or sensitive columns.
--   - Any authenticated role can cross tenant boundaries.
--   - Any prohibited role can INSERT/UPDATE csv_uploads.
-- Failure handling:
--   - Release FAIL. Do not proceed to beta.

-- ==================================================
-- Section A: SQL metadata verification
-- ==================================================

with target_tables(table_schema, table_name, expected_policy_count) as (
  values
    ('public', 'companies', 1),
    ('public', 'workspaces', 1),
    ('public', 'profiles', 1),
    ('public', 'csv_uploads', 3)
)
select
  tt.table_name,
  case when c.oid is null then 'FAIL: table missing' else 'PASS' end as table_status,
  case when c.relrowsecurity then 'PASS' else 'FAIL' end as rls_status,
  c.relrowsecurity as rls_enabled,
  case when c.relforcerowsecurity then 'REVIEW: FORCE RLS enabled' else 'INFO: FORCE RLS not enabled by design' end as force_rls_status,
  c.relforcerowsecurity as force_rls_enabled,
  tt.expected_policy_count
from target_tables tt
left join pg_namespace n on n.nspname = tt.table_schema
left join pg_class c on c.relnamespace = n.oid
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
    when (cmd in ('SELECT', 'UPDATE') and (qual is null or qual = 'true')) then 'FAIL: broad USING'
    when (cmd in ('INSERT', 'UPDATE') and (with_check is null or with_check = 'true')) then 'FAIL: broad WITH CHECK'
    else 'REVIEW: exact policy expression must be reviewed'
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

-- ==================================================
-- Section B: fully anonymous REST verification procedure
-- ==================================================
-- Conditions:
--   - Cookieなし
--   - User JWTなし
--   - Service Roleなし
--   - anon keyのみ
--   - Browser localStorage/sessionなし
--   - Existing rows are present in all four target tables
--
-- Use environment variables. Do not hard-code secrets in files.
--
--   SUPABASE_URL="https://<project-ref>.supabase.co"
--   SUPABASE_ANON_KEY="<anon-key>"
--
-- For each table below, run select=*, select=id, count, range, and a specific-id check.
-- Replace <redacted-...-id> placeholders with known IDs outside this repository.
--
-- companies:
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/companies?select=*&limit=1"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/companies?select=id&limit=1"
--   curl -I -H "apikey: ${SUPABASE_ANON_KEY}" -H "Prefer: count=exact" "${SUPABASE_URL}/rest/v1/companies?select=*"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" -H "Range: 0-0" "${SUPABASE_URL}/rest/v1/companies?select=*"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/companies?id=eq.<redacted-company-id>&select=*"
--
-- workspaces:
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/workspaces?select=*&limit=1"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/workspaces?select=id&limit=1"
--   curl -I -H "apikey: ${SUPABASE_ANON_KEY}" -H "Prefer: count=exact" "${SUPABASE_URL}/rest/v1/workspaces?select=*"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" -H "Range: 0-0" "${SUPABASE_URL}/rest/v1/workspaces?select=*"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/workspaces?id=eq.<redacted-workspace-id>&select=*"
--
-- profiles:
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/profiles?select=*&limit=1"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/profiles?select=email,name,role&limit=1"
--   curl -I -H "apikey: ${SUPABASE_ANON_KEY}" -H "Prefer: count=exact" "${SUPABASE_URL}/rest/v1/profiles?select=*"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" -H "Range: 0-0" "${SUPABASE_URL}/rest/v1/profiles?select=*"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/profiles?id=eq.<redacted-user-id>&select=*"
--
-- csv_uploads:
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/csv_uploads?select=*&limit=1"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/csv_uploads?select=id&limit=1"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/csv_uploads?select=file_data&limit=1"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/csv_uploads?select=checksum&limit=1"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/csv_uploads?select=file_name&limit=1"
--   curl -I -H "apikey: ${SUPABASE_ANON_KEY}" -H "Prefer: count=exact" "${SUPABASE_URL}/rest/v1/csv_uploads?select=*"
--   curl --fail-with-body -H "apikey: ${SUPABASE_ANON_KEY}" -H "Range: 0-0" "${SUPABASE_URL}/rest/v1/csv_uploads?select=*"
--
-- Expected anonymous result for every command:
--   - HTTP 401, HTTP 403, or HTTP 200 with [].
--   - Any returned row, id, email, name, role, file_name, checksum, or file_data is Release FAIL.
--
-- Do not run destructive anonymous POST/PATCH/DELETE/TRUNCATE against real data.
-- If destructive tests are required, design separate disposable test rows and rollback steps first.

-- ==================================================
-- Section C: authenticated REST verification procedure
-- ==================================================
-- Use real role-specific JWTs from Supabase Auth sessions.
-- Do not use Service Role. Do not save JWTs in the repository.
--
-- Required roles:
--   owner, admin, member, viewer
--
-- Owner/admin:
--   [ ] SELECT own profile succeeds.
--   [ ] SELECT own company succeeds.
--   [ ] SELECT own workspace succeeds.
--   [ ] SELECT own workspace csv_uploads succeeds.
--   [ ] csv_uploads INSERT succeeds with matching company_id/workspace_id/uploaded_by.
--   [ ] csv_uploads UPDATE succeeds for own tenant row.
--
-- Member:
--   [ ] SELECT own profile/company/workspace/csv_uploads succeeds.
--   [ ] csv_uploads INSERT succeeds with matching company_id/workspace_id/uploaded_by.
--   [ ] csv_uploads UPDATE is rejected.
--
-- Viewer:
--   [ ] SELECT own profile/company/workspace/csv_uploads succeeds.
--   [ ] csv_uploads INSERT is rejected.
--   [ ] csv_uploads UPDATE is rejected.
--
-- Tenant boundary:
--   [ ] Other profile SELECT returns 0 rows or is rejected.
--   [ ] Other company SELECT returns 0 rows or is rejected.
--   [ ] Other workspace SELECT returns 0 rows or is rejected.
--   [ ] Other workspace csv_uploads SELECT returns 0 rows or is rejected.
--   [ ] INSERT with fake company_id/workspace_id is rejected.
--   [ ] INSERT with uploaded_by different from auth.uid() is rejected.
--   [ ] UPDATE changing company_id/workspace_id away from own tenant is rejected.
--
-- Current production-like data may have only one tenant/profile. Do not create
-- role or cross-tenant test data in the target DB without an approved test-data plan.

-- ==================================================
-- Section D: app E2E verification checklist
-- ==================================================
-- Verify these flows after SQL and REST checks:
--   [ ] Login
--   [ ] Session restoration
--   [ ] Home display
--   [ ] Company/Workspace/Role display
--   [ ] CSV upload history display
--   [ ] CSV Upload
--   [ ] checksum duplicate detection
--   [ ] CSV exclusion/reactivation
--   [ ] Dashboard restoration
--   [ ] Weekly
--   [ ] Monthly
--   [ ] Replace
--   [ ] Option
--   [ ] Logout
--   [ ] Reload preserves session
--
-- Pay special attention to CurrentWorkspaceContext:
--   auth user -> profiles -> companies -> workspaces.

-- ==================================================
-- Section E: release decision table
-- ==================================================
-- Fill "Observed result" manually after SQL, REST, and app checks.
--
-- | Item | Expected result | Observed result | Release decision |
-- | --- | --- | --- | --- |
-- | companies anonymous read | No rows / 401 / 403 |  | PASS/FAIL |
-- | workspaces anonymous read | No rows / 401 / 403 |  | PASS/FAIL |
-- | profiles anonymous read | No rows / 401 / 403 |  | PASS/FAIL |
-- | csv_uploads anonymous read | No rows / 401 / 403 |  | PASS/FAIL |
-- | csv_uploads file_data anonymous read | No file_data / 401 / 403 |  | PASS/FAIL |
-- | anon/PUBLIC table privileges | None on four target tables |  | PASS/FAIL |
-- | authenticated TRUNCATE/DELETE | None on four target tables |  | PASS/FAIL |
-- | expected policies | Exactly six expected policies |  | PASS/FAIL |
-- | DELETE policy | None |  | PASS/FAIL |
-- | owner/admin SELECT/INSERT/UPDATE | Allowed in own tenant |  | PASS/FAIL |
-- | member SELECT/INSERT | Allowed in own tenant |  | PASS/FAIL |
-- | member UPDATE | Rejected |  | PASS/FAIL |
-- | viewer SELECT | Allowed in own tenant |  | PASS/FAIL |
-- | viewer INSERT/UPDATE | Rejected |  | PASS/FAIL |
-- | tenant boundary | Rejected or 0 rows |  | PASS/FAIL |
-- | Service Role | Not used by app or tests |  | PASS/FAIL |
-- | app E2E | All listed flows pass |  | PASS/FAIL |
--
-- Release PASS requires every row above to pass.
