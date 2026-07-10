-- GUGUMO Beta Data Integrity Migration Draft
-- 02_backfill_existing_rows
--
-- Review status:
-- DRAFT ONLY. Do not apply before product / DB review.
--
-- Backfill policy:
-- Existing csv_uploads rows cannot be safely tied to company_id, workspace_id,
-- or uploaded_by from SQL alone unless the target tenant/user is explicitly
-- confirmed. checksum also requires the same normalization as the application
-- upload flow, so a reviewed app-side or one-off backfill script is required.
--
-- Safe SQL-only field:
-- status can be normalized to active for existing rows.

update public.csv_uploads
set status = 'active'
where status is null;

-- snapshot_date:
-- Beta UI currently derives the CSV data date from the file name.
-- A SQL regexp backfill is possible only if all historical file names follow
-- the known SUUMO pattern, but it should be reviewed against real data first.
--
-- Example only. Keep commented until reviewed:
--
-- update public.csv_uploads
-- set snapshot_date = to_date(match[1], 'YYYYMMDD')
-- from regexp_match(file_name, '([0-9]{8})') as match
-- where snapshot_date is null;

-- company_id / workspace_id / uploaded_by:
-- Required before enabling tenant-scoped reads. Use an explicit tenant mapping
-- after confirming the development or customer workspace.
--
-- checksum:
-- Must be generated from normalized CSV content:
-- - remove BOM
-- - normalize line endings
-- - trim trailing whitespace
-- - SHA-256
-- Existing file_data is JSON, not the original CSV body, so exact historical
-- checksum parity may require storing a canonical JSON checksum or re-uploading
-- original CSV files. Do not invent checksum values in SQL.
