-- GUGUMO Release Readiness Integrity
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Purpose: read-only RLS and policy verification.

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads', 'snapshots', 'snapshot_rows')
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('companies', 'workspaces', 'profiles', 'csv_uploads', 'snapshots', 'snapshot_rows')
order by tablename, policyname;

