-- GUGUMO Release Readiness Integrity
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Purpose: safe constraint draft. Review 01/02 verify output before running.
-- This file is idempotent where PostgreSQL supports IF NOT EXISTS.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'csv_uploads_status_check'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_status_check
      check (status in ('active', 'excluded')) not valid;
  end if;
end $$;

alter table public.csv_uploads
  alter column status set default 'active';

-- FK constraints are drafted as NOT VALID to avoid blocking on legacy rows.
-- Validate only after 06_verify_after_apply.sql returns no abnormal rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_company_id_fkey'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_workspace_id_fkey'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_workspace_id_fkey
      foreign key (workspace_id)
      references public.workspaces(id)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_uploaded_by_fkey'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_uploaded_by_fkey
      foreign key (uploaded_by)
      references auth.users(id)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_excluded_by_fkey'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_excluded_by_fkey
      foreign key (excluded_by)
      references auth.users(id)
      not valid;
  end if;
end $$;

