-- GUGUMO Beta Data Integrity Migration Draft
-- 03_add_constraints_indexes
--
-- Review status:
-- DRAFT ONLY. Do not apply before product / DB review.
--
-- FK policy:
-- Constraints are added as NOT VALID so existing rows are not scanned before
-- backfill is complete. New non-null values will still be checked.
-- Validate constraints in a later reviewed step after backfill.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_status_check'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_status_check
      check (status in ('active', 'excluded'))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_company_id_fkey'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_company_id_fkey
      foreign key (company_id) references public.companies(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_workspace_id_fkey'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_workspace_id_fkey
      foreign key (workspace_id) references public.workspaces(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_uploaded_by_fkey'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_uploaded_by_fkey
      foreign key (uploaded_by) references auth.users(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'csv_uploads_excluded_by_fkey'
      and conrelid = 'public.csv_uploads'::regclass
  ) then
    alter table public.csv_uploads
      add constraint csv_uploads_excluded_by_fkey
      foreign key (excluded_by) references auth.users(id)
      not valid;
  end if;
end $$;

create index if not exists csv_uploads_workspace_id_idx
  on public.csv_uploads (workspace_id);

create index if not exists csv_uploads_snapshot_date_desc_idx
  on public.csv_uploads (snapshot_date desc);

create index if not exists csv_uploads_status_idx
  on public.csv_uploads (status);

create index if not exists csv_uploads_checksum_idx
  on public.csv_uploads (checksum);

create index if not exists csv_uploads_created_at_desc_idx
  on public.csv_uploads (created_at desc);

create index if not exists csv_uploads_workspace_checksum_idx
  on public.csv_uploads (workspace_id, checksum);

create index if not exists csv_uploads_workspace_snapshot_date_desc_idx
  on public.csv_uploads (workspace_id, snapshot_date desc);

-- Later, after backfill, review whether these should be validated:
--
-- alter table public.csv_uploads validate constraint csv_uploads_status_check;
-- alter table public.csv_uploads validate constraint csv_uploads_company_id_fkey;
-- alter table public.csv_uploads validate constraint csv_uploads_workspace_id_fkey;
-- alter table public.csv_uploads validate constraint csv_uploads_uploaded_by_fkey;
-- alter table public.csv_uploads validate constraint csv_uploads_excluded_by_fkey;
