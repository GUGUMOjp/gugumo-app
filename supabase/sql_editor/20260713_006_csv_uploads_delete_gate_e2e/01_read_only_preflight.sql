-- GUGUMO DELETE Gate E2E preflight
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Forbidden project: ivtaxvuysqqnzpnwndqt
-- Read-only. Do not use this as automatic project detection; confirm the Dashboard project manually.

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
required_columns as (
  select *
  from (values
    ('csv_uploads', 'id'),
    ('csv_uploads', 'file_name'),
    ('csv_uploads', 'file_data'),
    ('csv_uploads', 'uploaded_at'),
    ('csv_uploads', 'company_id'),
    ('csv_uploads', 'workspace_id'),
    ('csv_uploads', 'uploaded_by'),
    ('csv_uploads', 'snapshot_date'),
    ('csv_uploads', 'checksum'),
    ('csv_uploads', 'status'),
    ('csv_uploads', 'excluded_at'),
    ('csv_uploads', 'excluded_by'),
    ('csv_uploads', 'created_at'),
    ('companies', 'id'),
    ('companies', 'name'),
    ('companies', 'status'),
    ('workspaces', 'id'),
    ('workspaces', 'company_id'),
    ('workspaces', 'name'),
    ('workspaces', 'status'),
    ('profiles', 'id'),
    ('profiles', 'company_id'),
    ('profiles', 'workspace_id'),
    ('profiles', 'email'),
    ('profiles', 'name'),
    ('profiles', 'role')
  ) as v(table_name, column_name)
),
missing_columns as (
  select r.table_name, r.column_name
  from required_columns r
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = r.table_name
      and c.column_name = r.column_name
  )
),
marker_counts as (
  select 'companies' as source_name, count(*)::bigint as item_count
  from public.companies
  where name like '%GUGUMO_DELETE_GATE_E2E_20260713%'

  union all

  select 'workspaces' as source_name, count(*)::bigint as item_count
  from public.workspaces
  where name like '%GUGUMO_DELETE_GATE_E2E_20260713%'

  union all

  select 'profiles' as source_name, count(*)::bigint as item_count
  from public.profiles
  where name like '%GUGUMO_DELETE_GATE_E2E_20260713%'

  union all

  select 'csv_uploads' as source_name, count(*)::bigint as item_count
  from public.csv_uploads
  where file_name like '%GUGUMO_DELETE_GATE_E2E_20260713%'
     or checksum like 'GUGUMO_DELETE_GATE_E2E_20260713%'
),
preflight_rows as (
  select
    'project_confirmation' as check_name,
    'REVIEW' as result_status,
    1::bigint as item_count,
    'Manually confirm Dashboard project name GUGUMOjp''s Project and project ID annvqxnupddnozyghqdw. Do not run on ivtaxvuysqqnzpnwndqt.' as detail

  union all

  select
    'auth_user_creation_policy' as check_name,
    'REVIEW' as result_status,
    1::bigint as item_count,
    'Create the one DELETE Gate test Auth user manually in Supabase Dashboard. SQL templates must not create Auth users.' as detail

  union all

  select
    'required_tables' as check_name,
    case
      when exists (
        select 1
        from (values ('companies'), ('workspaces'), ('profiles'), ('csv_uploads')) as t(table_name)
        where not exists (
          select 1
          from information_schema.tables it
          where it.table_schema = 'public'
            and it.table_name = t.table_name
        )
      ) then 'STOP'
      else 'PASS'
    end as result_status,
    4::bigint as item_count,
    'Required public tables: companies, workspaces, profiles, csv_uploads.' as detail

  union all

  select
    'required_columns' as check_name,
    case when exists (select 1 from missing_columns) then 'STOP' else 'PASS' end as result_status,
    (select count(*) from missing_columns)::bigint as item_count,
    concat('missing_columns=', coalesce((select string_agg(table_name || '.' || column_name, ', ' order by table_name, column_name) from missing_columns), 'none')) as detail

  union all

  select
    'rls_enabled' as check_name,
    case
      when count(*) filter (where c.relrowsecurity) = 4 then 'PASS'
      else 'STOP'
    end as result_status,
    count(*) filter (where c.relrowsecurity)::bigint as item_count,
    'RLS must be enabled on companies, workspaces, profiles, and csv_uploads.' as detail
  from (values ('companies'), ('workspaces'), ('profiles'), ('csv_uploads')) as t(table_name)
  left join pg_namespace n
    on n.nspname = 'public'
  left join pg_class c
    on c.relnamespace = n.oid
   and c.relname = t.table_name
   and c.relkind = 'r'

  union all

  select
    'authenticated_delete_grant' as check_name,
    case when exists (select 1 from direct_grants where grantee = 'authenticated' and privilege_type = 'DELETE') then 'PASS' else 'STOP' end as result_status,
    (select count(*) from direct_grants where grantee = 'authenticated' and privilege_type = 'DELETE')::bigint as item_count,
    'authenticated must have DELETE table privilege before DELETE Gate E2E.' as detail

  union all

  select
    'anon_public_delete_absence' as check_name,
    case when exists (select 1 from direct_grants where grantee in ('anon', 'PUBLIC') and privilege_type = 'DELETE') then 'STOP' else 'PASS' end as result_status,
    (select count(*) from direct_grants where grantee in ('anon', 'PUBLIC') and privilege_type = 'DELETE')::bigint as item_count,
    'anon/PUBLIC must not have DELETE privilege.' as detail

  union all

  select
    'delete_policy_exactly_expected' as check_name,
    case
      when (select count(*) from policy_inventory where cmd = 'DELETE') = 1
       and exists (
         select 1
         from policy_inventory
         where policyname = 'csv_uploads_owner_admin_delete_excluded_same_tenant'
           and cmd = 'DELETE'
           and roles = array['authenticated']::name[]
           and qual ilike '%excluded%'
           and qual ilike '%owner%'
           and qual ilike '%admin%'
           and qual ilike '%company_id%'
           and qual ilike '%workspace_id%'
           and qual ilike '%profiles%'
           and with_check is null
       ) then 'PASS'
      else 'STOP'
    end as result_status,
    (select count(*) from policy_inventory where cmd = 'DELETE')::bigint as item_count,
    concat('delete_policy_names=', coalesce((select string_agg(policyname, ', ' order by policyname) from policy_inventory where cmd = 'DELETE'), 'none')) as detail

  union all

  select
    'existing_select_insert_update_policies' as check_name,
    case
      when exists (select 1 from policy_inventory where policyname = 'csv_uploads_authenticated_select_same_tenant' and cmd = 'SELECT')
       and exists (select 1 from policy_inventory where policyname = 'csv_uploads_authenticated_insert_same_tenant' and cmd = 'INSERT')
       and exists (select 1 from policy_inventory where policyname = 'csv_uploads_owner_admin_update_same_tenant' and cmd = 'UPDATE') then 'PASS'
      else 'STOP'
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
    'Existing SELECT, INSERT, and UPDATE policies must remain present.' as detail

  union all

  select
    'test_marker_residue' as check_name,
    case when (select sum(item_count) from marker_counts) = 0 then 'PASS' else 'STOP' end as result_status,
    (select sum(item_count) from marker_counts)::bigint as item_count,
    concat('marker_counts=', (select string_agg(source_name || ':' || item_count, ', ' order by source_name) from marker_counts)) as detail
)
select check_name, result_status, item_count, detail
from preflight_rows
order by
  case check_name
    when 'project_confirmation' then 10
    when 'auth_user_creation_policy' then 20
    when 'required_tables' then 30
    when 'required_columns' then 40
    when 'rls_enabled' then 50
    when 'authenticated_delete_grant' then 60
    when 'anon_public_delete_absence' then 70
    when 'delete_policy_exactly_expected' then 80
    when 'existing_select_insert_update_policies' then 90
    when 'test_marker_residue' then 100
    else 999
  end;
