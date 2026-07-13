-- GUGUMO csv_uploads permanent delete preflight
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Forbidden project: ivtaxvuysqqnzpnwndqt
-- Purpose: read-only inspection before designing excluded-only csv_uploads physical delete.
--
-- IMPORTANT:
-- - Confirm the Supabase Dashboard project name and project ID before running.
-- - SQL Editor may display only the last result set, so this file returns one
--   consolidated final result with a row per check section.
-- - This SQL intentionally does not show file_data, filenames, email addresses,
--   row-level UUID lists, JWTs, API keys, or customer CSV contents.
-- - This SQL is read-only. It uses metadata reads and aggregate reads only.

with expected_columns(column_name) as (
  values
    ('id'),
    ('company_id'),
    ('workspace_id'),
    ('uploaded_by'),
    ('file_name'),
    ('file_data'),
    ('snapshot_date'),
    ('checksum'),
    ('status'),
    ('excluded_at'),
    ('excluded_by'),
    ('created_at'),
    ('uploaded_at')
),
csv_table as (
  select
    c.oid,
    n.nspname as table_schema,
    c.relname as table_name,
    c.relrowsecurity,
    c.relforcerowsecurity,
    c.reltuples::bigint as estimated_row_count_after_analyze
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'csv_uploads'
    and c.relkind in ('r', 'p')
),
column_inventory as (
  select
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default,
    c.is_identity,
    c.identity_generation
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'csv_uploads'
),
missing_columns as (
  select e.column_name
  from expected_columns e
  left join column_inventory c on c.column_name = e.column_name
  where c.column_name is null
),
unexpected_columns as (
  select c.column_name
  from column_inventory c
  left join expected_columns e on e.column_name = c.column_name
  where e.column_name is null
),
constraints as (
  select
    con.conname,
    con.contype,
    con.convalidated,
    pg_get_constraintdef(con.oid, true) as constraint_definition
  from pg_constraint con
  where con.conrelid = 'public.csv_uploads'::regclass
),
indexes as (
  select indexname, indexdef
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'csv_uploads'
),
policy_inventory as (
  select
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'csv_uploads'
),
target_roles(role_name) as (
  values ('PUBLIC'), ('anon'), ('authenticated'), ('service_role')
),
target_privileges(privilege_type) as (
  values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')
),
direct_table_grants as (
  select grantee, privilege_type, is_grantable
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'csv_uploads'
    and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
),
privilege_matrix as (
  select
    tr.role_name,
    tp.privilege_type,
    case when dg.privilege_type is not null then true else false end as has_direct_grant,
    case
      when tr.role_name = 'PUBLIC' then null
      else has_table_privilege(tr.role_name::name, 'public.csv_uploads', tp.privilege_type)
    end as has_effective_privilege
  from target_roles tr
  cross join target_privileges tp
  left join direct_table_grants dg
    on dg.grantee = tr.role_name
   and dg.privilege_type = tp.privilege_type
),
helper_functions as (
  select
    n.nspname as function_schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_function_result(p.oid) as return_type,
    case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security_mode,
    p.proconfig as function_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname in (
    'gugumo_current_company_id',
    'gugumo_current_workspace_id',
    'gugumo_current_role'
  )
),
fk_columns as (
  select
    con.conname as constraint_name,
    src_ns.nspname as source_schema,
    src_cls.relname as source_table,
    src_att.attname as source_column,
    tgt_ns.nspname as target_schema,
    tgt_cls.relname as target_table,
    tgt_att.attname as target_column,
    con.confdeltype,
    con.confupdtype,
    src_cols.ordinality
  from pg_constraint con
  join pg_class src_cls on src_cls.oid = con.conrelid
  join pg_namespace src_ns on src_ns.oid = src_cls.relnamespace
  join pg_class tgt_cls on tgt_cls.oid = con.confrelid
  join pg_namespace tgt_ns on tgt_ns.oid = tgt_cls.relnamespace
  join unnest(con.conkey) with ordinality as src_cols(attnum, ordinality) on true
  join unnest(con.confkey) with ordinality as tgt_cols(attnum, ordinality) on tgt_cols.ordinality = src_cols.ordinality
  join pg_attribute src_att on src_att.attrelid = con.conrelid and src_att.attnum = src_cols.attnum
  join pg_attribute tgt_att on tgt_att.attrelid = con.confrelid and tgt_att.attnum = tgt_cols.attnum
  where con.contype = 'f'
    and (
      (src_ns.nspname = 'public' and src_cls.relname in ('csv_uploads', 'snapshots', 'snapshot_rows', 'companies', 'workspaces', 'profiles'))
      or (tgt_ns.nspname = 'public' and tgt_cls.relname in ('csv_uploads', 'snapshots', 'snapshot_rows', 'companies', 'workspaces', 'profiles'))
    )
),
foreign_keys as (
  select
    source_schema,
    source_table,
    constraint_name,
    string_agg(source_column, ', ' order by ordinality) as source_columns,
    target_schema,
    target_table,
    string_agg(target_column, ', ' order by ordinality) as target_columns,
    case confdeltype
      when 'a' then 'NO ACTION'
      when 'r' then 'RESTRICT'
      when 'c' then 'CASCADE'
      when 'n' then 'SET NULL'
      when 'd' then 'SET DEFAULT'
      else confdeltype::text
    end as on_delete,
    case confupdtype
      when 'a' then 'NO ACTION'
      when 'r' then 'RESTRICT'
      when 'c' then 'CASCADE'
      when 'n' then 'SET NULL'
      when 'd' then 'SET DEFAULT'
      else confupdtype::text
    end as on_update
  from fk_columns
  group by source_schema, source_table, constraint_name, target_schema, target_table, confdeltype, confupdtype
),
target_related_tables(table_schema, table_name) as (
  values
    ('public', 'csv_uploads'),
    ('public', 'snapshots'),
    ('public', 'snapshot_rows'),
    ('public', 'companies'),
    ('public', 'workspaces'),
    ('public', 'profiles')
),
related_tables as (
  select
    t.table_schema,
    t.table_name,
    c.oid is not null as table_exists,
    c.reltuples::bigint as estimated_row_count_after_analyze
  from target_related_tables t
  left join pg_namespace n on n.nspname = t.table_schema
  left join pg_class c on c.relnamespace = n.oid
    and c.relname = t.table_name
    and c.relkind in ('r', 'p')
),
triggers as (
  select
    trigger_name,
    action_timing,
    event_manipulation,
    action_orientation,
    action_statement
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table = 'csv_uploads'
),
status_distribution as (
  select
    coalesce(status, '<NULL>') as status_bucket,
    count(*) as row_count
  from public.csv_uploads
  group by status
),
data_shape as (
  select
    count(*) as total_rows,
    count(*) filter (where status = 'active') as active_rows,
    count(*) filter (where status = 'excluded') as excluded_rows,
    count(*) filter (where status is null) as null_status_rows,
    count(*) filter (where status not in ('active', 'excluded') and status is not null) as unexpected_status_rows,
    count(distinct (company_id, workspace_id)) as company_workspace_pair_count,
    count(*) filter (where company_id is null) as company_id_null_rows,
    count(*) filter (where workspace_id is null) as workspace_id_null_rows,
    count(*) filter (where uploaded_by is null) as uploaded_by_null_rows,
    count(*) filter (where checksum is null) as checksum_null_rows,
    count(*) filter (where file_data is null) as file_data_null_rows,
    min(created_at) as oldest_created_at,
    max(created_at) as newest_created_at
  from public.csv_uploads
),
duplicate_checksums as (
  select checksum, count(*) as checksum_count
  from public.csv_uploads
  where checksum is not null
  group by checksum
  having count(*) > 1
),
duplicate_checksum_summary as (
  select
    count(*) as duplicated_checksum_value_count,
    coalesce(sum(checksum_count), 0)::bigint as rows_with_duplicated_checksum
  from duplicate_checksums
),
preflight_rows as (
  select
    'table_and_columns' as check_name,
    case
      when not exists (select 1 from csv_table) then 'STOP'
      when exists (select 1 from missing_columns) then 'STOP'
      when exists (select 1 from unexpected_columns) then 'REVIEW'
      else 'PASS'
    end as result_status,
    (select count(*) from column_inventory)::bigint as item_count,
    concat(
      'table_exists=', exists (select 1 from csv_table),
      '; columns=', (select count(*) from column_inventory),
      '; missing_required=', coalesce((select string_agg(column_name, ', ' order by column_name) from missing_columns), 'none'),
      '; unexpected_columns=', coalesce((select string_agg(column_name, ', ' order by column_name) from unexpected_columns), 'none'),
      '; key_columns_present=',
      (select string_agg(column_name, ', ' order by column_name) from column_inventory where column_name in ('id', 'company_id', 'workspace_id', 'uploaded_by', 'file_name', 'file_data', 'snapshot_date', 'checksum', 'status', 'excluded_at', 'excluded_by', 'created_at', 'uploaded_at'))
    ) as detail

  union all

  select
    'constraints_and_indexes' as check_name,
    case
      when not exists (select 1 from constraints where contype = 'p') then 'STOP'
      when not exists (
        select 1
        from constraints
        where contype = 'c'
          and constraint_definition ilike '%status%'
          and constraint_definition ilike '%active%'
          and constraint_definition ilike '%excluded%'
      ) then 'REVIEW'
      else 'PASS'
    end as result_status,
    ((select count(*) from constraints) + (select count(*) from indexes))::bigint as item_count,
    concat(
      'constraint_count=', (select count(*) from constraints),
      '; index_count=', (select count(*) from indexes),
      '; primary_key_count=', (select count(*) from constraints where contype = 'p'),
      '; status_check_mentions_active_excluded=',
      exists (
        select 1
        from constraints
        where contype = 'c'
          and constraint_definition ilike '%status%'
          and constraint_definition ilike '%active%'
          and constraint_definition ilike '%excluded%'
      ),
      '; constraint_names=', coalesce((select string_agg(conname, ', ' order by conname) from constraints), 'none'),
      '; index_names=', coalesce((select string_agg(indexname, ', ' order by indexname) from indexes), 'none')
    ) as detail

  union all

  select
    'rls_state' as check_name,
    case
      when not exists (select 1 from csv_table) then 'STOP'
      when exists (select 1 from csv_table where not relrowsecurity) then 'STOP'
      else 'PASS'
    end as result_status,
    1::bigint as item_count,
    concat(
      'rls_enabled=', coalesce((select relrowsecurity::text from csv_table), 'missing'),
      '; force_rls=', coalesce((select relforcerowsecurity::text from csv_table), 'missing')
    ) as detail

  union all

  select
    'policies' as check_name,
    case
      when exists (select 1 from policy_inventory where cmd not in ('SELECT', 'INSERT', 'UPDATE')) then 'REVIEW'
      when (select count(*) from policy_inventory) = 0 then 'STOP'
      else 'PASS'
    end as result_status,
    (select count(*) from policy_inventory)::bigint as item_count,
    concat(
      'policy_count=', (select count(*) from policy_inventory),
      '; commands=', coalesce((select string_agg(cmd || ':' || policyname, '; ' order by cmd, policyname) from policy_inventory), 'none'),
      '; role_sets=', coalesce((select string_agg(policyname || '=' || array_to_string(roles, ','), '; ' order by policyname) from policy_inventory), 'none')
    ) as detail

  union all

  select
    'delete_policy' as check_name,
    case
      when exists (select 1 from policy_inventory where cmd = 'DELETE') then 'STOP'
      else 'PASS'
    end as result_status,
    (select count(*) from policy_inventory where cmd = 'DELETE')::bigint as item_count,
    concat(
      'delete_policy_count=', (select count(*) from policy_inventory where cmd = 'DELETE'),
      '; delete_policy_names=', coalesce((select string_agg(policyname, ', ' order by policyname) from policy_inventory where cmd = 'DELETE'), 'none')
    ) as detail

  union all

  select
    'table_privileges' as check_name,
    case
      when exists (select 1 from privilege_matrix where role_name in ('PUBLIC', 'anon') and has_direct_grant) then 'STOP'
      when exists (select 1 from privilege_matrix where role_name = 'authenticated' and privilege_type = 'DELETE' and (has_direct_grant or has_effective_privilege)) then 'STOP'
      else 'PASS'
    end as result_status,
    (select count(*) from privilege_matrix where has_direct_grant or coalesce(has_effective_privilege, false))::bigint as item_count,
    concat(
      'authenticated_delete_direct=', exists (select 1 from privilege_matrix where role_name = 'authenticated' and privilege_type = 'DELETE' and has_direct_grant),
      '; authenticated_delete_effective=', exists (select 1 from privilege_matrix where role_name = 'authenticated' and privilege_type = 'DELETE' and has_effective_privilege),
      '; anon_any_direct=', exists (select 1 from privilege_matrix where role_name = 'anon' and has_direct_grant),
      '; public_any_direct=', exists (select 1 from privilege_matrix where role_name = 'PUBLIC' and has_direct_grant),
      '; direct_grants=', coalesce((select string_agg(role_name || ':' || privilege_type, ', ' order by role_name, privilege_type) from privilege_matrix where has_direct_grant), 'none'),
      '; effective_named_role_grants=', coalesce((select string_agg(role_name || ':' || privilege_type, ', ' order by role_name, privilege_type) from privilege_matrix where coalesce(has_effective_privilege, false)), 'none')
    ) as detail

  union all

  select
    'helper_functions' as check_name,
    case
      when exists (select 1 from helper_functions) then 'REVIEW'
      else 'PASS'
    end as result_status,
    (select count(*) from helper_functions)::bigint as item_count,
    concat(
      'helper_count=', (select count(*) from helper_functions),
      '; helpers=', coalesce((select string_agg(function_schema || '.' || function_name || '(' || identity_arguments || '):' || security_mode || ':returns ' || return_type, '; ' order by function_schema, function_name, identity_arguments) from helper_functions), 'none'),
      '; expected_current_design=direct public.profiles EXISTS checks'
    ) as detail

  union all

  select
    'foreign_keys' as check_name,
    case
      when exists (select 1 from foreign_keys where target_table = 'csv_uploads') then 'REVIEW'
      when exists (select 1 from related_tables where table_name in ('snapshots', 'snapshot_rows') and table_exists) then 'REVIEW'
      else 'PASS'
    end as result_status,
    (select count(*) from foreign_keys)::bigint as item_count,
    concat(
      'foreign_key_count=', (select count(*) from foreign_keys),
      '; references_to_csv_uploads=', (select count(*) from foreign_keys where target_table = 'csv_uploads'),
      '; snapshots_present=', exists (select 1 from related_tables where table_name = 'snapshots' and table_exists),
      '; snapshot_rows_present=', exists (select 1 from related_tables where table_name = 'snapshot_rows' and table_exists),
      '; fk_summary=', coalesce((select string_agg(source_table || '(' || source_columns || ')->' || target_table || '(' || target_columns || ') on_delete=' || on_delete, '; ' order by source_table, constraint_name) from foreign_keys), 'none')
    ) as detail

  union all

  select
    'triggers' as check_name,
    case
      when exists (select 1 from triggers where event_manipulation = 'DELETE') then 'REVIEW'
      when exists (select 1 from triggers) then 'REVIEW'
      else 'PASS'
    end as result_status,
    (select count(*) from triggers)::bigint as item_count,
    concat(
      'trigger_count=', (select count(*) from triggers),
      '; delete_trigger_count=', (select count(*) from triggers where event_manipulation = 'DELETE'),
      '; triggers=', coalesce((select string_agg(trigger_name || ':' || action_timing || ':' || event_manipulation, '; ' order by trigger_name, event_manipulation) from triggers), 'none')
    ) as detail

  union all

  select
    'status_summary' as check_name,
    case
      when exists (select 1 from status_distribution where status_bucket = '<NULL>') then 'STOP'
      when exists (select 1 from status_distribution where status_bucket not in ('active', 'excluded', '<NULL>')) then 'STOP'
      else 'PASS'
    end as result_status,
    (select coalesce(sum(row_count), 0)::bigint from status_distribution) as item_count,
    concat(
      'status_distribution=', coalesce((select string_agg(status_bucket || '=' || row_count::text, ', ' order by status_bucket) from status_distribution), 'none'),
      '; unexpected_status_count=', (select coalesce(sum(row_count), 0)::bigint from status_distribution where status_bucket not in ('active', 'excluded', '<NULL>')),
      '; null_status_count=', (select coalesce(sum(row_count), 0)::bigint from status_distribution where status_bucket = '<NULL>')
    ) as detail

  union all

  select
    'data_shape_summary' as check_name,
    case
      when null_status_rows > 0 or unexpected_status_rows > 0 then 'STOP'
      when company_id_null_rows > 0 or workspace_id_null_rows > 0 or uploaded_by_null_rows > 0 or file_data_null_rows > 0 then 'REVIEW'
      else 'PASS'
    end as result_status,
    total_rows::bigint as item_count,
    concat(
      'total_rows=', total_rows,
      '; active_rows=', active_rows,
      '; excluded_rows=', excluded_rows,
      '; company_workspace_pair_count=', company_workspace_pair_count,
      '; company_id_null_rows=', company_id_null_rows,
      '; workspace_id_null_rows=', workspace_id_null_rows,
      '; uploaded_by_null_rows=', uploaded_by_null_rows,
      '; checksum_null_rows=', checksum_null_rows,
      '; file_data_null_rows=', file_data_null_rows,
      '; oldest_created_at=', coalesce(oldest_created_at::text, 'none'),
      '; newest_created_at=', coalesce(newest_created_at::text, 'none')
    ) as detail
  from data_shape

  union all

  select
    'duplicate_checksum_summary' as check_name,
    case
      when duplicated_checksum_value_count > 0 then 'REVIEW'
      else 'PASS'
    end as result_status,
    rows_with_duplicated_checksum::bigint as item_count,
    concat(
      'duplicated_checksum_value_count=', duplicated_checksum_value_count,
      '; rows_with_duplicated_checksum=', rows_with_duplicated_checksum,
      '; checksum_values_are_not_displayed=true'
    ) as detail
  from duplicate_checksum_summary

  union all

  select
    'delete_authorization_design_inputs' as check_name,
    'REVIEW' as result_status,
    1::bigint as item_count,
    'future DELETE requires authenticated table DELETE GRANT plus DELETE RLS policy; intended condition role owner/admin, same company_id, same workspace_id, status=excluded; uploaded_by should not be required unless product policy changes; anon/PUBLIC must remain without table privilege; member/viewer and cross-tenant DELETE must remain denied' as detail
)
select
  check_name,
  result_status,
  item_count,
  detail
from preflight_rows
order by
  case check_name
    when 'table_and_columns' then 10
    when 'constraints_and_indexes' then 20
    when 'rls_state' then 30
    when 'policies' then 40
    when 'delete_policy' then 50
    when 'table_privileges' then 60
    when 'helper_functions' then 70
    when 'foreign_keys' then 80
    when 'triggers' then 90
    when 'status_summary' then 100
    when 'data_shape_summary' then 110
    when 'duplicate_checksum_summary' then 120
    when 'delete_authorization_design_inputs' then 130
    else 999
  end;
