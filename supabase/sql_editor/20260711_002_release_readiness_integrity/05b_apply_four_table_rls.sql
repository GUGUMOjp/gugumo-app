-- GUGUMO Release Readiness Critical RLS Repair
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Target tables: public.companies, public.workspaces, public.profiles, public.csv_uploads
-- Purpose: atomically enable RLS, replace expected policies, and minimize unsafe grants for four tenant tables.
-- Write status: WRITE.
-- Execution order: run only after 05a_preflight_four_table_rls.sql and
-- 05a2_verify_csv_uploads_id_generation.sql outputs have been reviewed.
-- Transaction design:
--   - One explicit transaction covers all checks, RLS enablement, policy replacement, and grants.
--   - Any exception rolls back all changes in this file.
--   - Unknown policies stop before any DROP/CREATE/REVOKE/GRANT.
-- Stop conditions:
--   - Target project cannot be manually confirmed.
--   - Any target table is missing.
--   - Any policy exists outside the fixed allowlist below.
--   - Any anon/public/ALL/DELETE/broad policy exists.
--   - Same-table same-command permissive policy duplicates exist.
--   - Profile data quality prerequisites fail.
--   - csv_uploads.id has no owned identity sequence generation path.
-- FORCE RLS:
--   - Not enabled in this phase.
-- DELETE:
--   - No DELETE policy is created.

begin;

do $$
declare
  unexpected_policy text;
  duplicate_policy text;
  missing_table text;
  profile_issue text;
  id_generation_issue text;
  csv_uploads_id_sequence regclass;
  csv_uploads_id_sequence_relkind "char";
begin
  select string_agg(t.table_name, ', ' order by t.table_name)
    into missing_table
  from (
    values
      ('companies'),
      ('workspaces'),
      ('profiles'),
      ('csv_uploads')
  ) as t(table_name)
  where to_regclass('public.' || t.table_name) is null;

  if missing_table is not null then
    raise exception 'STOP: target table missing: %', missing_table;
  end if;

  select string_agg(tablename || '.' || policyname || ':' || cmd, ', ' order by tablename, policyname)
    into unexpected_policy
  from pg_policies
  where schemaname = 'public'
    and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads')
    and (
      'anon' = any(roles)
      or 'public' = any(roles)
      or cmd in ('ALL', 'DELETE')
      or (cmd in ('SELECT', 'UPDATE') and (qual is null or qual = 'true'))
      or (cmd in ('INSERT', 'UPDATE') and (with_check is null or with_check = 'true'))
      or policyname not in (
        'profiles_authenticated_select_self',
        'companies_authenticated_select_own',
        'workspaces_authenticated_select_own',
        'csv_uploads_authenticated_select_same_tenant',
        'csv_uploads_authenticated_insert_same_tenant',
        'csv_uploads_owner_admin_update_same_tenant'
      )
    );

  if unexpected_policy is not null then
    raise exception 'STOP: unexpected or unsafe existing policy found: %', unexpected_policy;
  end if;

  select string_agg(tablename || ':' || cmd || ':' || permissive || '=' || policy_count, ', ' order by tablename, cmd)
    into duplicate_policy
  from (
    select tablename, cmd, permissive, count(*) as policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads')
    group by tablename, cmd, permissive
    having permissive = 'PERMISSIVE'
       and count(*) > 1
  ) duplicates;

  if duplicate_policy is not null then
    raise exception 'STOP: same-command permissive policy overlap found: %', duplicate_policy;
  end if;

  select string_agg(issue, ', ' order by issue)
    into profile_issue
  from (
    select 'profile id null' as issue where exists (select 1 from public.profiles where id is null)
    union all
    select 'profile company_id null' where exists (select 1 from public.profiles where company_id is null)
    union all
    select 'profile workspace_id null' where exists (select 1 from public.profiles where workspace_id is null)
    union all
    select 'profile role null' where exists (select 1 from public.profiles where role is null)
    union all
    select 'profile invalid role' where exists (select 1 from public.profiles where role not in ('owner', 'admin', 'member', 'viewer'))
    union all
    select 'profile duplicate id' where exists (
      select 1
      from public.profiles
      group by id
      having count(*) > 1
    )
  ) issues;

  if profile_issue is not null then
    raise exception 'STOP: profile prerequisite failed: %', profile_issue;
  end if;

  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass
    into csv_uploads_id_sequence;

  select c.relkind
    into csv_uploads_id_sequence_relkind
  from pg_class c
  where c.oid = csv_uploads_id_sequence;

  select
    case
      when c.column_name is null then 'csv_uploads.id column missing'
      when c.is_identity <> 'YES' then 'csv_uploads.id is not an identity column'
      when csv_uploads_id_sequence is null then 'csv_uploads.id identity sequence missing'
      when csv_uploads_id_sequence_relkind is null then 'csv_uploads.id sequence relation missing'
      when csv_uploads_id_sequence_relkind <> 'S' then 'csv_uploads.id resolved relation is not a sequence'
    end
    into id_generation_issue
  from (select 1) guard
  left join information_schema.columns c on c.table_schema = 'public'
    and c.table_name = 'csv_uploads'
    and c.column_name = 'id';

  if id_generation_issue is not null then
    raise exception 'STOP: %; app insert does not provide id explicitly.', id_generation_issue;
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.workspaces enable row level security;
alter table public.csv_uploads enable row level security;

drop policy if exists "profiles_authenticated_select_self" on public.profiles;
drop policy if exists "companies_authenticated_select_own" on public.companies;
drop policy if exists "workspaces_authenticated_select_own" on public.workspaces;
drop policy if exists "csv_uploads_authenticated_select_same_tenant" on public.csv_uploads;
drop policy if exists "csv_uploads_authenticated_insert_same_tenant" on public.csv_uploads;
drop policy if exists "csv_uploads_owner_admin_update_same_tenant" on public.csv_uploads;

create policy "profiles_authenticated_select_self"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
);

create policy "companies_authenticated_select_own"
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = companies.id
  )
);

create policy "workspaces_authenticated_select_own"
on public.workspaces
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = workspaces.company_id
      and p.workspace_id = workspaces.id
  )
);

create policy "csv_uploads_authenticated_select_same_tenant"
on public.csv_uploads
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = csv_uploads.company_id
      and p.workspace_id = csv_uploads.workspace_id
      and p.role in ('owner', 'admin', 'member', 'viewer')
  )
);

create policy "csv_uploads_authenticated_insert_same_tenant"
on public.csv_uploads
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = csv_uploads.company_id
      and p.workspace_id = csv_uploads.workspace_id
      and p.role in ('owner', 'admin', 'member')
  )
);

create policy "csv_uploads_owner_admin_update_same_tenant"
on public.csv_uploads
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = csv_uploads.company_id
      and p.workspace_id = csv_uploads.workspace_id
      and p.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = csv_uploads.company_id
      and p.workspace_id = csv_uploads.workspace_id
      and p.role in ('owner', 'admin')
  )
);

revoke all privileges on table public.companies from anon;
revoke all privileges on table public.workspaces from anon;
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.csv_uploads from anon;

revoke all privileges on table public.companies from public;
revoke all privileges on table public.workspaces from public;
revoke all privileges on table public.profiles from public;
revoke all privileges on table public.csv_uploads from public;

revoke insert, update, delete, truncate, references, trigger on table public.companies from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.workspaces from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.profiles from authenticated;
revoke delete, truncate, references, trigger on table public.csv_uploads from authenticated;

grant select on table public.companies to authenticated;
grant select on table public.workspaces to authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update on table public.csv_uploads to authenticated;

do $$
declare
  csv_uploads_id_sequence regclass;
  csv_uploads_id_sequence_name text;
begin
  select pg_get_serial_sequence('public.csv_uploads', 'id')::regclass
    into csv_uploads_id_sequence;

  if csv_uploads_id_sequence is null then
    raise exception 'STOP: csv_uploads.id identity sequence missing; app insert does not provide id explicitly.';
  end if;

  select format('%I.%I', n.nspname, c.relname)
    into csv_uploads_id_sequence_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.oid = csv_uploads_id_sequence
    and c.relkind = 'S';

  if csv_uploads_id_sequence_name is null then
    raise exception 'STOP: csv_uploads.id resolved relation is not a sequence.';
  end if;

  execute format('revoke all privileges on sequence %s from anon, public, authenticated', csv_uploads_id_sequence_name);
  execute format('grant usage on sequence %s to authenticated', csv_uploads_id_sequence_name);
end $$;

commit;
