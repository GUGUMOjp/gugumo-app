-- GUGUMO csv_uploads permanent delete authorization apply
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Forbidden project: ivtaxvuysqqnzpnwndqt
-- Purpose: grant authenticated DELETE and add owner/admin same-tenant excluded-only DELETE policy.
--
-- DO NOT RUN until 01_read_only_preflight.sql and human review pass.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'csv_uploads'
      and c.relkind = 'r'
      and c.relrowsecurity
  ) then
    raise exception 'STOP: public.csv_uploads RLS is disabled or table is missing; review before applying permanent delete authorization.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'csv_uploads'
      and cmd = 'DELETE'
      and policyname <> 'csv_uploads_owner_admin_delete_excluded_same_tenant'
  ) then
    raise exception 'STOP: unexpected csv_uploads DELETE policy exists; review before applying permanent delete authorization.';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'csv_uploads'
      and grantee in ('anon', 'PUBLIC')
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'STOP: anon/PUBLIC csv_uploads table privilege exists; review before applying permanent delete authorization.';
  end if;
end $$;

grant delete on table public.csv_uploads to authenticated;

drop policy if exists "csv_uploads_owner_admin_delete_excluded_same_tenant" on public.csv_uploads;

create policy "csv_uploads_owner_admin_delete_excluded_same_tenant"
on public.csv_uploads
for delete
to authenticated
using (
  status = 'excluded'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = csv_uploads.company_id
      and p.workspace_id = csv_uploads.workspace_id
      and p.role in ('owner', 'admin')
  )
);

commit;
