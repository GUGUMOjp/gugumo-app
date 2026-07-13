# csv_uploads Permanent Delete Preflight

Target Supabase project:

- Project name: `GUGUMOjp's Project`
- Project ID: `annvqxnupddnozyghqdw`

Forbidden project:

- Project ID: `ivtaxvuysqqnzpnwndqt`

This package is a read-only preflight for designing a future CSV permanent delete feature. It does not implement DELETE authorization, does not change RLS, does not grant privileges, and does not modify data.

## Planned Product Rule

Permanent delete is still under design and is not implemented.

The planned behavior is:

- Active CSV rows show only `分析から除外`.
- Excluded CSV rows show `有効に戻す` and `完全削除`.
- `完全削除` deletes the target `public.csv_uploads` row only after review confirms no related data risk.
- Only `owner` and `admin` may delete.
- `member`, `viewer`, anonymous users, and cross-tenant requests must be denied.
- Active rows must not be deletable.
- Server Action and RLS must enforce the same rule as the UI.

Technical Beta READY is not determined by this package. Review the preflight results before creating any apply SQL or app implementation.

## Files

1. `01_read_only_preflight.sql`
   - Read-only schema, RLS, privilege, helper, FK, trigger, and aggregate data-shape inspection.

## Before Running

Confirm the Supabase project manually before opening SQL Editor.

1. Open the Supabase Dashboard in your browser.
2. In the project list, select `GUGUMOjp's Project`.
3. Open the project settings or project overview where the Project ID is shown.
4. Confirm the Project ID is exactly `annvqxnupddnozyghqdw`.
5. Confirm the Project ID is not `ivtaxvuysqqnzpnwndqt`.
6. If the Project ID is not exactly `annvqxnupddnozyghqdw`, stop immediately.

SQL alone cannot reliably prove the Supabase Project ID. The Dashboard check is mandatory.

## How To Run

1. Open Supabase SQL Editor for `GUGUMOjp's Project`.
2. Paste the entire contents of `01_read_only_preflight.sql`.
3. Run it once.
4. Review the single consolidated result table.
   - Each row has `check_name`, `result_status`, `item_count`, and `detail`.
   - Stop on any `STOP` row.
   - Review every `REVIEW` row before moving to design or implementation.
5. Share only the necessary result summaries with ChatGPT.
6. Do not share file data, filenames, customer CSV content, JWTs, API keys, Service Role keys, real email addresses, or UUID lists.

## What The Preflight Checks

- `public.csv_uploads` table presence.
- Column inventory, data types, nullability, defaults, identity settings.
- Primary key and constraints.
- `status` check constraint and whether only `active` / `excluded` are expected.
- Indexes.
- RLS enabled state and FORCE RLS state.
- All `public.csv_uploads` policies, including any unexpected DELETE policy.
- Direct table privileges for `PUBLIC`, `anon`, `authenticated`, and `service_role`.
- Effective named-role table privileges for `anon`, `authenticated`, and `service_role`.
- PUBLIC ACL entries.
- Tenant/role helper function presence and definition for:
  - `gugumo_current_company_id`
  - `gugumo_current_workspace_id`
  - `gugumo_current_role`
- Foreign keys involving `csv_uploads`, `snapshots`, `snapshot_rows`, `companies`, `workspaces`, and `profiles`.
- `csv_uploads` triggers, especially DELETE triggers.
- Aggregate current data shape without showing row details.
- Duplicate checksum summary without showing checksum values.
- Design inputs for a future excluded-only DELETE policy.

## Stop Conditions

Stop and do not proceed to apply SQL or app implementation if any of these appear:

- The Dashboard Project ID is not `annvqxnupddnozyghqdw`.
- The Dashboard Project ID is `ivtaxvuysqqnzpnwndqt`.
- A DELETE policy already exists on `public.csv_uploads`.
- `authenticated` already has DELETE privilege on `public.csv_uploads`.
- `PUBLIC` or `anon` has any `public.csv_uploads` table privilege.
- RLS is disabled on `public.csv_uploads`.
- Unexpected helper functions exist and their security/search_path behavior has not been reviewed.
- Unexpected FK or cascade relationship means deleting `csv_uploads` may delete or orphan related data.
- `snapshots` or `snapshot_rows` are present and appear to be in active use.
- DELETE triggers or audit/cleanup triggers exist and are not understood.
- `status` contains values other than `active` or `excluded`.
- `status` has NULL rows.
- Excluded rows are unexpectedly large in number.
- Schema differs from the repository assumptions.
- Customer data impact cannot be judged from the read-only output.

## Confidentiality

Do not store or paste any of the following into the repository, docs, chat transcript, or issue tracker:

- Real UUID lists.
- Real email addresses.
- JWTs.
- API keys.
- Service Role keys.
- Filenames.
- `file_data`.
- CSV body text.
- Customer information.

The SQL intentionally returns aggregate counts and metadata instead of customer row details.

## Future Package Shape

Only after this preflight is reviewed, create a separate package for implementation. A possible future sequence is:

1. `01_read_only_preflight.sql`
2. `02_apply_delete_authorization.sql`
3. `03_verify_delete_authorization.sql`
4. `04_manual_e2e_guide.md`

Do not create or run apply SQL as part of this package.
