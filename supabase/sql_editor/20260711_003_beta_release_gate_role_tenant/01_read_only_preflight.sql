-- GUGUMO Beta Release Gate role/tenant read-only preflight.
-- Target Supabase project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- DO NOT RUN on project ivtaxvuysqqnzpnwndqt.
-- Read-only metadata checks only. No data changes.

select
  'confirm_project_id_before_any_manual_step' as check_name,
  'annvqxnupddnozyghqdw' as expected_project_id,
  'Confirm the SQL Editor is opened in GUGUMOjp''s Project before using any template.' as operator_action;

with expected_tables(table_schema, table_name) as (
  values
    ('public', 'companies'),
    ('public', 'workspaces'),
    ('public', 'profiles'),
    ('public', 'csv_uploads')
)
select
  'rls_enabled_on_four_tables' as check_name,
  e.table_schema,
  e.table_name,
  c.relrowsecurity as rls_enabled,
  case
    when c.relrowsecurity is true then 'PASS'
    else 'FAIL'
  end as result
from expected_tables e
left join pg_namespace n
  on n.nspname = e.table_schema
left join pg_class c
  on c.relnamespace = n.oid
  and c.relname = e.table_name
  and c.relkind = 'r'
order by e.table_name;

select
  'expected_policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads')
order by tablename, policyname;

select
  'profiles_role_distribution' as check_name,
  role,
  count(*) as profile_count
from public.profiles
group by role
order by role;

select
  'duplicate_profiles_by_auth_user' as check_name,
  id as auth_user_id,
  count(*) as profile_count,
  case
    when count(*) = 1 then 'PASS'
    else 'FAIL'
  end as result
from public.profiles
group by id
having count(*) <> 1
order by count(*) desc, id;

select
  'profiles_missing_tenant_link' as check_name,
  p.id as profile_id,
  p.company_id,
  p.workspace_id,
  p.role,
  case
    when p.company_id is null or p.workspace_id is null or p.role is null then 'FAIL'
    when c.id is null then 'FAIL'
    when w.id is null then 'FAIL'
    when w.company_id is distinct from p.company_id then 'FAIL'
    else 'PASS'
  end as result
from public.profiles p
left join public.companies c
  on c.id = p.company_id
left join public.workspaces w
  on w.id = p.workspace_id
where p.company_id is null
  or p.workspace_id is null
  or p.role is null
  or c.id is null
  or w.id is null
  or w.company_id is distinct from p.company_id
order by p.id;

select
  'csv_uploads_id_sequence_effective_privileges' as check_name,
  role_name,
  has_sequence_privilege(role_name::name, 'public.csv_uploads_id_seq', 'USAGE') as has_usage,
  has_sequence_privilege(role_name::name, 'public.csv_uploads_id_seq', 'SELECT') as has_select,
  has_sequence_privilege(role_name::name, 'public.csv_uploads_id_seq', 'UPDATE') as has_update
from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name);

select
  'csv_uploads_id_sequence_direct_acl' as check_name,
  coalesce(r.rolname, 'PUBLIC') as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl, acldefault('S', c.relowner))) as acl
left join pg_roles r
  on r.oid = acl.grantee
where n.nspname = 'public'
  and c.relname = 'csv_uploads_id_seq'
  and c.relkind = 'S'
order by grantee, acl.privilege_type;
