-- GUGUMO Release Readiness Integrity
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Purpose: read-only schema verification before any integrity changes.
-- Run in Supabase SQL Editor manually. Do not run from the app.

select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('companies', 'workspaces', 'profiles', 'csv_uploads', 'snapshots', 'snapshot_rows')
order by table_name, ordinal_position;

select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
  and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
  and tc.table_name in ('companies', 'workspaces', 'profiles', 'csv_uploads', 'snapshots', 'snapshot_rows')
order by tc.table_name, tc.constraint_type, tc.constraint_name;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads', 'snapshots', 'snapshot_rows')
order by tablename, indexname;

