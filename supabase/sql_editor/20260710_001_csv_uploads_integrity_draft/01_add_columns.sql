-- GUGUMO Beta Data Integrity Migration Draft
-- 01_add_columns
--
-- Purpose:
-- Add durable upload metadata columns to csv_uploads so duplicate detection,
-- exclusion, tenant scoping, and analysis-target selection can move from
-- browser state to database state.
--
-- Review status:
-- DRAFT ONLY. Do not apply before product / DB review.
--
-- Explicitly out of scope:
-- - RLS enablement
-- - Supabase execution
-- - data backfill
-- - application behavior changes

alter table public.csv_uploads
  add column if not exists company_id uuid,
  add column if not exists workspace_id uuid,
  add column if not exists uploaded_by uuid,
  add column if not exists snapshot_date date,
  add column if not exists checksum text,
  add column if not exists status text not null default 'active',
  add column if not exists excluded_at timestamptz,
  add column if not exists excluded_by uuid;
