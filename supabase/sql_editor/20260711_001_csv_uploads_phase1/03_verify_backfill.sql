-- GUGUMO Beta Data Integrity Phase 1
-- 03_verify_backfill
--
-- Target project:
-- annvqxnupddnozyghqdw
--
-- Scope:
-- Read-only verification after 01_add_columns.sql and 02_backfill_existing_rows.sql.
-- This file must not mutate data.

-- 1. Total rows.
select
  count(*) as total_csv_uploads
from public.csv_uploads;

-- 2. Tenant/status/checksum NULL summary.
select
  count(*) filter (where company_id is null) as company_id_null_count,
  count(*) filter (where workspace_id is null) as workspace_id_null_count,
  count(*) filter (where uploaded_by is null) as uploaded_by_null_count,
  count(*) filter (where snapshot_date is null) as snapshot_date_null_count,
  count(*) filter (where status is null) as status_null_count,
  count(*) filter (where status <> 'active') as non_active_count,
  count(*) filter (where checksum is null) as checksum_null_count,
  count(*) filter (where excluded_at is not null) as excluded_at_not_null_count,
  count(*) filter (where excluded_by is not null) as excluded_by_not_null_count
from public.csv_uploads;

-- 3. Expected tenant rows.
select
  company_id,
  workspace_id,
  uploaded_by,
  status,
  count(*) as row_count
from public.csv_uploads
group by company_id, workspace_id, uploaded_by, status
order by row_count desc;

-- 4. snapshot_date coverage.
select
  snapshot_date,
  count(*) as row_count,
  min(created_at) as first_created_at,
  max(created_at) as latest_created_at
from public.csv_uploads
group by snapshot_date
order by snapshot_date desc;

-- 5. File-level verification.
select
  id,
  file_name,
  created_at,
  uploaded_at,
  snapshot_date,
  status,
  company_id,
  workspace_id,
  uploaded_by,
  checksum,
  jsonb_array_length(file_data::jsonb) as row_count
from public.csv_uploads
order by created_at desc;

-- 6. Abnormal rows. This should return zero rows.
select
  id,
  file_name,
  created_at,
  uploaded_at,
  company_id,
  workspace_id,
  uploaded_by,
  snapshot_date,
  status,
  checksum,
  excluded_at,
  excluded_by
from public.csv_uploads
where company_id is null
   or workspace_id is null
   or uploaded_by is null
   or snapshot_date is null
   or status is null
   or status <> 'active'
   or checksum is not null
   or excluded_at is not null
   or excluded_by is not null
order by created_at desc;
