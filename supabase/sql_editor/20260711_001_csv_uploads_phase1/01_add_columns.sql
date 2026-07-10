-- GUGUMO Beta Data Integrity Phase 1
-- 01_add_columns
--
-- Target project:
-- annvqxnupddnozyghqdw
--
-- Scope:
-- Add nullable metadata columns for csv_uploads data-integrity backfill.
-- Do not add constraints, indexes, or RLS in Phase 1.

alter table public.csv_uploads
  add column if not exists company_id uuid,
  add column if not exists workspace_id uuid,
  add column if not exists uploaded_by uuid,
  add column if not exists snapshot_date date,
  add column if not exists checksum text,
  add column if not exists status text not null default 'active',
  add column if not exists excluded_at timestamptz,
  add column if not exists excluded_by uuid;
