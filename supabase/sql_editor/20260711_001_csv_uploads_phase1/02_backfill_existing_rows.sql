-- GUGUMO Beta Data Integrity Phase 1
-- 02_backfill_existing_rows
--
-- Target project:
-- annvqxnupddnozyghqdw
--
-- Scope:
-- Backfill existing Demo csv_uploads rows after 01_add_columns.sql.
-- Existing checksum remains NULL because original CSV body checksums cannot be
-- safely reproduced from stored JSON file_data.
--
-- Tenant:
-- company_id   = cdc39330-e5a0-4aef-9f21-fbdbcbdcaf5b
-- workspace_id = 6a4690fb-5e23-483b-810c-d8fdbf0860a1
-- uploaded_by  = 3313c0cf-8515-440f-947b-e46eb287cbe3

do $$
declare
  missing_date_count integer;
  multi_date_count integer;
begin
  select count(*)
    into missing_date_count
  from public.csv_uploads
  where file_name is null
     or file_name !~ '20[0-9]{6}';

  if missing_date_count <> 0 then
    raise exception 'Found % csv_uploads rows without YYYYMMDD in file_name', missing_date_count;
  end if;

  select count(*)
    into multi_date_count
  from public.csv_uploads as upload
  where (
    select count(*)
    from regexp_matches(upload.file_name, '20[0-9]{6}', 'g')
  ) > 1;

  if multi_date_count <> 0 then
    raise exception 'Found % csv_uploads rows with multiple YYYYMMDD values in file_name', multi_date_count;
  end if;
end $$;

update public.csv_uploads
set
  company_id = 'cdc39330-e5a0-4aef-9f21-fbdbcbdcaf5b',
  workspace_id = '6a4690fb-5e23-483b-810c-d8fdbf0860a1',
  uploaded_by = '3313c0cf-8515-440f-947b-e46eb287cbe3',
  snapshot_date = to_date(substring(file_name from '(20[0-9]{6})'), 'YYYYMMDD'),
  status = 'active',
  checksum = null,
  excluded_at = null,
  excluded_by = null
where id in (
  select id
  from public.csv_uploads
  where company_id is null
     or workspace_id is null
     or uploaded_by is null
     or snapshot_date is null
     or status is null
     or checksum is not null
     or excluded_at is not null
     or excluded_by is not null
);
