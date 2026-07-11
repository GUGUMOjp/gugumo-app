-- GUGUMO Release Readiness Integrity
-- Target project: GUGUMOjp's Project / annvqxnupddnozyghqdw
-- Purpose: indexes aligned with app queries.

create index if not exists csv_uploads_workspace_status_snapshot_date_idx
  on public.csv_uploads (workspace_id, status, snapshot_date desc, uploaded_at desc, created_at desc);

create index if not exists csv_uploads_workspace_checksum_idx
  on public.csv_uploads (workspace_id, checksum)
  where checksum is not null;

create index if not exists csv_uploads_workspace_created_at_idx
  on public.csv_uploads (workspace_id, created_at desc);

