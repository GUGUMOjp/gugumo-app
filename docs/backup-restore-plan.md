# Backup And Restore Plan

## Current State

Formal backup/restore operations are not finalized.

## Beta Minimum

- Confirm Supabase backup availability for the project.
- Document who can request restore.
- Document restore approval path.
- Run at least one restore drill before paid production use.

## Data To Consider

- Auth users.
- `companies`.
- `workspaces`.
- `profiles`.
- `csv_uploads`.
- Future `snapshots` and `snapshot_rows`.

## Restore Risks

- Restoring DB without Auth users can break profile links.
- Restoring Auth without DB can leave tenant-unlinked users.
- CSV upload rows with checksum NULL remain legacy rows.

## Human Decisions Needed

- Backup frequency.
- Retention period.
- Restore RTO/RPO.
- Customer notification policy.

