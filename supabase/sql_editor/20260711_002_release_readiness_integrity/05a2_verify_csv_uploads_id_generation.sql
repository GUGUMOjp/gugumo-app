-- GUGUMO Release Readiness Critical RLS Repair
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Target table: public.csv_uploads
-- Purpose: read-only verification for csv_uploads.id generation before applying RLS/grant changes.
-- Read-only status: READ ONLY.
-- Execution order: run after 05a_preflight_four_table_rls.sql and before 05b_apply_four_table_rls.sql.
-- Stop conditions for write SQL:
--   - csv_uploads.id has no identity, default, owned sequence, or enabled trigger that can explain id generation.
--   - A sequence is used but authenticated lacks required sequence privileges after the approved write design.
--   - Any result conflicts with current app behavior, because the app does not explicitly insert csv_uploads.id.

select
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.is_identity,
  c.identity_generation,
  c.identity_start,
  c.identity_increment,
  c.identity_minimum,
  c.identity_maximum,
  c.identity_cycle,
  pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) as serial_or_identity_sequence
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'csv_uploads'
  and c.column_name = 'id';

select
  a.attname as column_name,
  a.attidentity as identity_kind,
  pg_get_expr(d.adbin, d.adrelid) as default_expression,
  pg_get_serial_sequence('public.csv_uploads', 'id') as serial_or_identity_sequence
from pg_attribute a
join pg_class cls on cls.oid = a.attrelid
join pg_namespace n on n.oid = cls.relnamespace
left join pg_attrdef d on d.adrelid = a.attrelid
  and d.adnum = a.attnum
where n.nspname = 'public'
  and cls.relname = 'csv_uploads'
  and a.attname = 'id'
  and a.attnum > 0
  and not a.attisdropped;

select
  t.tgname as trigger_name,
  t.tgenabled as trigger_enabled,
  pg_get_triggerdef(t.oid) as trigger_definition,
  p.proname as function_name,
  n.nspname as function_schema,
  pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where cn.nspname = 'public'
  and c.relname = 'csv_uploads'
  and not t.tgisinternal
order by t.tgname;

with id_sequence as (
  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass as seq_regclass
)
select
  ns.nspname as sequence_schema,
  seq.relname as sequence_name,
  seq.relkind as relation_kind,
  dep.deptype as dependency_type,
  owned_table_ns.nspname as owned_table_schema,
  owned_table.relname as owned_table_name,
  owned_col.attname as owned_column_name
from id_sequence ids
left join pg_class seq on seq.oid = ids.seq_regclass
left join pg_namespace ns on ns.oid = seq.relnamespace
left join pg_depend dep on dep.objid = seq.oid
  and dep.classid = 'pg_class'::regclass
  and dep.refclassid = 'pg_class'::regclass
left join pg_class owned_table on owned_table.oid = dep.refobjid
left join pg_namespace owned_table_ns on owned_table_ns.oid = owned_table.relnamespace
left join pg_attribute owned_col on owned_col.attrelid = dep.refobjid
  and owned_col.attnum = dep.refobjsubid
where ids.seq_regclass is not null
order by sequence_schema, sequence_name, dependency_type;

with id_sequence as (
  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass as seq_regclass
)
select
  'csv_uploads_id_sequence_relation_type' as check_name,
  case
    when ids.seq_regclass is null then 'FAIL: sequence missing'
    when seq.oid is null then 'FAIL: sequence relation missing'
    when seq.relkind = 'S' then 'PASS: owned identity sequence relation is a sequence'
    else 'FAIL: resolved relation is not a sequence'
  end as result,
  ids.seq_regclass::text as sequence_name,
  seq.relkind as relation_kind
from id_sequence ids
left join pg_class seq on seq.oid = ids.seq_regclass;

with id_sequence as (
  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass as seq_regclass
),
roles_to_check(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
)
select
  rtc.role_name,
  ids.seq_regclass::text as sequence_name,
  case
    when ids.seq_regclass is null then null
    when to_regrole(rtc.role_name) is null then null
    else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'USAGE')
  end as has_usage,
  case
    when ids.seq_regclass is null then null
    when to_regrole(rtc.role_name) is null then null
    else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'SELECT')
  end as has_select,
  case
    when ids.seq_regclass is null then null
    when to_regrole(rtc.role_name) is null then null
    else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'UPDATE')
  end as has_update
from id_sequence ids
cross join roles_to_check rtc
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
)
select
  coalesce(r.rolname, case when sa.grantee = 0 then 'PUBLIC' end) as grantee,
  sa.seq_regclass::text as sequence_name,
  sa.privilege_type,
  sa.is_grantable
from sequence_acl sa
left join pg_roles r on r.oid = sa.grantee
where coalesce(r.rolname, case when sa.grantee = 0 then 'PUBLIC' end)
  in ('anon', 'authenticated', 'PUBLIC', 'service_role')
order by grantee, privilege_type;

with id_generation as (
  select
    c.column_default,
    c.is_identity,
    c.identity_generation,
    pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) as id_sequence_name,
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
  'csv_uploads_id_generation_status' as check_name,
  case
    when is_identity = 'YES' then 'PASS: identity column'
    when column_default is not null then 'PASS: column default exists'
    when id_sequence_name is not null then 'PASS: owned sequence exists'
    when has_enabled_user_trigger then 'REVIEW: enabled user trigger exists'
    else 'FAIL: no id generation mechanism found'
  end as result,
  column_default,
  is_identity,
  identity_generation,
  id_sequence_name,
  has_enabled_user_trigger,
  'The app does not explicitly insert csv_uploads.id, so INSERT requires identity/default/sequence/trigger generation.' as expected
from id_generation;

with id_sequence as (
  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass as seq_regclass
)
select
  'csv_uploads_id_sequence_effective_privileges_before_apply' as check_name,
  rtc.role_name,
  case
    when ids.seq_regclass is null then 'FAIL: csv_uploads id sequence missing'
    when rtc.role_name = 'authenticated'
      and has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'USAGE')
      and not has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'SELECT')
      and not has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'UPDATE') then 'PASS: already least privilege'
    when rtc.role_name = 'service_role' then 'INFO: service_role observed only; not changed by 05b'
    else 'REVIEW: pre-apply privilege differs from target state'
  end as result,
  ids.seq_regclass::text as sequence_name,
  case when ids.seq_regclass is null then null else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'USAGE') end as has_usage,
  case when ids.seq_regclass is null then null else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'SELECT') end as has_select,
  case when ids.seq_regclass is null then null else has_sequence_privilege(rtc.role_name::name, ids.seq_regclass, 'UPDATE') end as has_update,
  'Target after 05b: anon=false/false/false, authenticated=true/false/false; service_role unchanged.' as expected
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
  'csv_uploads_id_sequence_direct_acl_before_apply' as check_name,
  rtc.role_name,
  case
    when ids.seq_regclass is null then 'FAIL: csv_uploads id sequence missing'
    when rtc.role_name = 'service_role' then 'INFO: service_role observed only; not changed by 05b'
    when rtc.role_name in ('anon', 'PUBLIC') and count(rg.privilege_type) > 0 then 'REVIEW: direct ACL will be removed by 05b'
    when rtc.role_name = 'authenticated'
      and bool_or(rg.privilege_type = 'USAGE') is true
      and coalesce(bool_or(rg.privilege_type = 'SELECT'), false) is false
      and coalesce(bool_or(rg.privilege_type = 'UPDATE'), false) is false then 'PASS: already USAGE only'
    when rtc.role_name = 'authenticated' then 'REVIEW: direct ACL will be reset to USAGE only by 05b'
    else 'PASS: no direct ACL'
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
