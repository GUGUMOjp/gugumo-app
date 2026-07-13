# csv_uploads Permanent Delete Authorization

Target Supabase project:

- Project name: `GUGUMOjp's Project`
- Project ID: `annvqxnupddnozyghqdw`

Forbidden project:

- Project ID: `ivtaxvuysqqnzpnwndqt`

This package prepared the database authorization required for deleting only excluded `csv_uploads` rows. It has been applied to the formal project and post-apply verification passed.

Do not rerun the apply SQL without a fresh human review of the formal project, current policy state, and release plan.

## Files

1. `01_read_only_preflight.sql`
   - Confirms the DB is still in the expected pre-apply state.
2. `02_apply_delete_authorization.sql`
   - Grants `DELETE` on `public.csv_uploads` to `authenticated`.
   - Adds one DELETE policy: `csv_uploads_owner_admin_delete_excluded_same_tenant`.
3. `03_verify_after_apply.sql`
   - Read-only verification after applying the authorization SQL.

## Required Manual Project Check

Before running any SQL:

1. Open Supabase Dashboard.
2. Select `GUGUMOjp's Project`.
3. Confirm Project ID is exactly `annvqxnupddnozyghqdw`.
4. Confirm it is not `ivtaxvuysqqnzpnwndqt`.
5. Stop immediately if the project does not match.

## Intended DELETE Rule

`public.csv_uploads` DELETE is allowed only when all are true:

- Role is `owner` or `admin`.
- The row belongs to the user's `company_id`.
- The row belongs to the user's `workspace_id`.
- The row has `status = 'excluded'`.

`member`, `viewer`, anonymous users, active rows, and cross-tenant rows must remain denied. `uploaded_by` is intentionally not required for owner/admin tenant maintenance.

## Apply SQL Scope

The apply SQL changes only DELETE authorization:

- `grant delete on table public.csv_uploads to authenticated`
- `create policy "csv_uploads_owner_admin_delete_excluded_same_tenant" ... for delete ...`

It does not change SELECT, INSERT, or UPDATE policy semantics. It does not grant anything to `anon` or `PUBLIC`. It does not use helper functions or Service Role.

## Stop Conditions

Do not apply if:

- Project ID is not `annvqxnupddnozyghqdw`.
- Any unexpected existing DELETE policy is present.
- `anon` or `PUBLIC` has any `csv_uploads` table privilege.
- RLS is disabled.
- Required `profiles` role/tenant columns are missing.
- Required `csv_uploads` columns are missing.
- The status constraint no longer supports `active` and `excluded`.

## Post-Apply Verification

`03_verify_after_apply.sql` passed after the authorization SQL was applied.

## Minimal E2E After Apply

The DELETE-focused checks below have passed. Repeat them only when DELETE authorization, upload lifecycle code, or tenant authorization behavior changes:

### Browser

- Active row does not show `完全削除`.
- Active row can be changed to excluded.
- Excluded row shows `有効に戻す` and `完全削除`.
- Canceling the delete dialog leaves the row intact.
- Permanent delete succeeds for owner/admin.
- The row disappears from history.
- Reload keeps the row absent.
- Deleted data disappears from Home, Dashboard, Weekly, Monthly, Replace, and Option.
- Re-uploading the same CSV after physical delete does not trigger a duplicate checksum warning for the deleted row.

### REST / Security

- owner excluded own-tenant DELETE: allowed; target row absent.
- admin excluded own-tenant DELETE: allowed; target row absent.
- owner/admin active own-tenant DELETE: denied or no mutation; row remains.
- member excluded own-tenant DELETE: denied; row remains.
- viewer excluded own-tenant DELETE: denied; row remains.
- cross-tenant DELETE: denied or no mutation; row remains.
- anonymous DELETE: denied; row remains.

Use only a dedicated test tenant/user or a reviewed temporary test row. Do not use real customer rows. Do not store filled UUIDs, email addresses, JWTs, API keys, or Service Role keys in the repository.

DELETE Gate cleanup completed, and the dedicated test Auth user was manually deleted from Supabase Dashboard. Technical Beta readiness now depends on the final uncommitted diff review and remaining non-DELETE release gates, not on this authorization package.
