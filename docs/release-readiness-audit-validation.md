# Release Readiness Audit Validation

Status: HISTORICAL validation record. Current gate state is maintained in `docs/technical-beta-readiness.md`.

Date: 2026-07-11

Target project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`

This document reclassifies the current release-readiness findings by observed facts. No SQL was executed and no DB changes were applied.

## Summary

- Confirmed: 8
- Partially Confirmed: 4
- Unverified: 5
- False Positive: 0
- Historical: 2

## Confirmed

### Password Reset was not formal before this phase

- Fact: The login screen showed a preparation message rather than sending a reset email.
- Evidence: `app/page.tsx` had a `setResetMessage("パスワード再設定（準備中）...")` path.
- Current status: Implemented in this phase using `resetPasswordForEmail` and `updateUser`.

### Tenant-unlinked users needed a safe screen

- Fact: `app/page.tsx` contained a TODO for tenant-unlinked users and continued rendering with fallback tenant display.
- Evidence: `getCurrentWorkspaceContextAction` was called, but errors were not surfaced as a dedicated screen.
- Current status: Implemented in this phase as an account setup incomplete screen.

### `csv_uploads` is reachable through anon REST

- Fact: Read-only REST checks returned `csv_uploads 200 0-25/26`.
- Impact: DB-level RLS/policy state must be verified before beta customer use.
- Current status: SQL verify drafts created.

### `csv_uploads` contains Data Integrity Phase1 columns

- Fact: Read-only REST selected `company_id`, `workspace_id`, `uploaded_by`, `snapshot_date`, `checksum`, `status`, `excluded_at`, `excluded_by`.
- Current status: 26 rows observed, all `status=active`, 22 checksum NULL legacy rows, no tenant NULL rows.

### `snapshots` and `snapshot_rows` are not REST-exposed

- Fact: Read-only REST returned 404 for `snapshots` and `snapshot_rows`.
- Interpretation: They are either absent or not exposed through PostgREST schema cache.
- Current status: SQL Editor verification required.

### Current analysis data loading still has payload risk

- Fact: Weekly/monthly reports need multiple historical CSV records, and `file_data` is still used to build day diffs.
- Current status: Repository now has metadata/file-data split functions, but the full report path still requires historical file data.

### Upload save can partially fail

- Fact: `saveCsvUploadRecords` inserts records sequentially and returns at the first failure.
- Impact: A multi-CSV upload can leave earlier rows saved while later rows fail.
- Current status: Transaction design document created; no pseudo-transaction was implemented.

### Legal pages are provisional

- Fact: Legal/support/data-policy pages exist, but formal contract/legal review is not complete.
- Current status: Legal finalization inventory created.

## Partially Confirmed

### RLS status

- Fact: Anon REST can read tenant tables and `csv_uploads`.
- Not confirmed: `pg_tables.rowsecurity` and `pg_policies` are not exposed via REST.
- Next action: Run `02_verify_rls_and_policies.sql` manually in SQL Editor.

### DB constraints and indexes

- Fact: App can read/write Phase1 columns.
- Not confirmed: Check constraints, FK constraints, and exact indexes require SQL Editor verification.
- Next action: Run `01_verify_current_schema.sql`.

### Recommendation internal score

- Fact: Release audit identifies internal scoring risk, but this phase did not modify recommendation formulas.
- Next action: User/domain review should decide whether internal ranking is acceptable and ensure it is not shown as SUUMO 37点.

### Current analysis target performance

- Fact: Repository had `getCurrentAnalysisCsvUploadRecord` and now also has metadata/file-data split functions.
- Not complete: UI still loads historical active records because weekly/monthly need day diffs.
- Next action: Snapshot table design or server-side summarized period data is needed for full payload reduction.

## Unverified

### Supabase Dashboard Auth URL settings

- Required checks: Site URL, Redirect URLs, password reset email template.
- Reason: Dashboard settings are not available from local code.

### RLS behavior with authenticated users

- Required checks: owner/admin/member/viewer select/insert/update flows after RLS is applied.

### Formal legal compatibility

- Required checks: Contract terms, privacy policy, data processing language, specific commercial transaction display necessity.

### Backup and restore procedure

- Required checks: Supabase backup plan, restore drill, owner responsibilities.

### Incident response contacts and SLA

- Required checks: Human operational policy.

## Historical

### Browser-state-only upload exclusion

- Historical: This has been replaced by DB status updates in the current app.

### Login mock authentication

- Historical: Supabase Auth is now used for sign-in/session/sign-out.

## SQL Drafts

Created under `supabase/sql_editor/20260711_002_release_readiness_integrity/`.

No SQL was executed by Codex.
