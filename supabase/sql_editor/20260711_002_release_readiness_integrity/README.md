# GUGUMO Release Readiness Critical Four-Table RLS Draft

Target project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`

This package is for manual Supabase SQL Editor review. Codex has not applied it.

## Scope

Anonymous REST access was confirmed for:

- `public.companies`
- `public.workspaces`
- `public.profiles`
- `public.csv_uploads`
- `public.csv_uploads.file_data`

The older `csv_uploads`-only repair is obsolete. Release remains `NO-GO` until all four tables pass SQL metadata, anonymous REST, authenticated role, tenant-boundary, and app E2E checks.

## Execution Order

1. `01_verify_current_schema.sql`
2. `02_verify_rls_and_policies.sql`
3. `05a_preflight_four_table_rls.sql`
4. `05a2_verify_csv_uploads_id_generation.sql`
5. Human review and design confirmation
6. `05b_apply_four_table_rls.sql`
7. `05c_verify_four_table_rls.sql`
8. `06_verify_after_apply.sql`
9. Fully anonymous REST checks
10. Authenticated role-based REST checks
11. App E2E checks
12. Release decision

Do not run `05b_apply_four_table_rls.sql` if preflight shows missing tables, unknown policies, anon/public policies, ALL/DELETE policies, broad policies, duplicate permissive policies, invalid profile data, unexpected helper functions, or no owned identity sequence for `csv_uploads.id`.

## Active Files

- `01_verify_current_schema.sql`
  - Read-only schema, constraint, FK, and index verification.
- `02_verify_rls_and_policies.sql`
  - Read-only RLS and policy verification.
- `05a_preflight_four_table_rls.sql`
  - Read-only four-table preflight for schema, policy, grants, profile data quality, and helper absence.
- `05a2_verify_csv_uploads_id_generation.sql`
  - Read-only inspection for `csv_uploads.id` identity/default/sequence/trigger generation and sequence privileges.
- `05b_apply_four_table_rls.sql`
  - One-transaction write SQL for RLS enablement, six policies, and grant hardening.
- `05c_verify_four_table_rls.sql`
  - Read-only verification after write SQL.
- `06_verify_after_apply.sql`
  - Final SQL metadata checks plus REST and app verification procedures.

## Legacy / Disabled Files

These files are intentionally disabled because they were designed for the older `csv_uploads`-only approach:

- `05_apply_or_repair_rls.sql`
- `05a_enable_rls.sql`
- `05b_verify_existing_policy.sql`
- `05b2_verify_profiles_and_helpers.sql`
- `05c_authenticated_select.sql`
- `05d_authenticated_insert.sql`
- `05e_owner_admin_update.sql`
- `05f_verify_policy.sql`

`03_add_safe_constraints.sql` and `04_add_safe_indexes.sql` are not part of this Critical RLS repair.

## Policy Design

Policies are fixed-name and `TO authenticated` only:

- `profiles_authenticated_select_self`
  - `SELECT`
  - `USING (id = auth.uid())`
- `companies_authenticated_select_own`
  - `SELECT`
  - `USING EXISTS public.profiles` matching `auth.uid()` and `companies.id`
- `workspaces_authenticated_select_own`
  - `SELECT`
  - `USING EXISTS public.profiles` matching `auth.uid()`, `workspaces.id`, and `workspaces.company_id`
- `csv_uploads_authenticated_select_same_tenant`
  - `SELECT`
  - owner/admin/member/viewer can read same company/workspace rows
- `csv_uploads_authenticated_insert_same_tenant`
  - `INSERT`
  - owner/admin/member only, same company/workspace, `uploaded_by = auth.uid()`
- `csv_uploads_owner_admin_update_same_tenant`
  - `UPDATE`
  - owner/admin only, same company/workspace in both `USING` and `WITH CHECK`

No anon policy is created. No DELETE policy is created.

## Direct Profiles Reference

This package adopts direct `public.profiles` `EXISTS` checks instead of helper functions because the target DB and repository do not contain `gugumo_current_company_id`, `gugumo_current_workspace_id`, or `gugumo_current_role`.

`EXISTS` is preferred over scalar subqueries here because it expresses authorization as row existence, avoids scalar multi-row failure assumptions, and is easier to extend for future multi-workspace membership models. The current `profiles.id` primary key still gives one profile row per user in the current design.

This design depends on:

- `profiles_authenticated_select_self` existing before dependent table policies are evaluated.
- `profiles` policy not referencing `companies`, `workspaces`, or `csv_uploads`.
- authenticated users having SELECT privilege on `profiles`.
- profile tenant/role fields being non-null and valid.
- REST tests confirming PostgREST/JWT behavior, not just SQL metadata.

## Grants Design

The write SQL revokes all table privileges from `anon` and `PUBLIC` on the four target tables. PostgreSQL revokes corresponding column privileges when table privileges are revoked, and `05c` / `06` still verify that no anon/PUBLIC column privileges remain.

For `authenticated`:

- `companies`: SELECT only
- `workspaces`: SELECT only
- `profiles`: SELECT only
- `csv_uploads`: SELECT, INSERT, UPDATE only
- DELETE, TRUNCATE, REFERENCES, TRIGGER are revoked

`TRUNCATE` is RLS-exempt, so it must not remain on `anon` or `authenticated`. `service_role` is not used by the app and is not a valid release test path.

The real DB has `csv_uploads.id` as `bigint generated by default as identity` backed by `public.csv_uploads_id_seq`. The app does not explicitly insert `id`, so CSV Upload requires identity sequence auto-numbering.

Sequence privilege target:

- `anon`: no sequence privileges
- `PUBLIC`: no direct sequence ACL
- `authenticated`: `USAGE` only
- `service_role`: not changed by this package

`authenticated` does not need sequence `SELECT` or `UPDATE` for normal identity auto-numbering, so the write SQL resets `anon`, `PUBLIC`, and `authenticated` sequence privileges before granting only `USAGE` back to `authenticated`. `05c` and `06` verify effective sequence privileges with `has_sequence_privilege` and direct ACL entries with `aclexplode(pg_class.relacl)`.

If `pg_get_serial_sequence('public.csv_uploads', 'id')` cannot resolve the owned identity sequence, the write SQL stops before changing RLS or grants.

## FORCE RLS

FORCE RLS is not enabled in this phase.

Reason:

- anon/authenticated PostgREST protection should be handled by RLS plus grants.
- FORCE RLS affects table-owner behavior and can complicate SQL Editor, migrations, and maintenance.
- Service Role is not used by the app.
- The beta Critical fix should minimize blast radius.

Revisit FORCE RLS after beta if table-owner bypass hardening becomes a requirement.

## Residual Risks

- RLS is row-level, not column-level. owner/admin UPDATE on `csv_uploads` may still update columns beyond `status/excluded_at/excluded_by` through direct REST unless column privileges, triggers, or RPC-only writes are added later.
- Sensitive columns in this residual-risk set include `file_name`, `file_data`, `checksum`, `uploaded_by`, `company_id`, `workspace_id`, `snapshot_date`, `created_at`, and `uploaded_at`.
- Current data may have only one tenant/profile, so role and cross-tenant tests may require approved disposable test data.
- SQL Editor metadata does not prove final REST behavior.
- Future multiple-workspace support may require a membership table and policy redesign.

## App Impact Areas

The app currently resolves context as:

`auth user -> profiles -> companies -> workspaces`

After applying RLS, verify Login, session restoration, Home, Company/Workspace/Role display, CSV history, CSV upload, checksum duplicate detection, CSV exclusion/reactivation, Dashboard, Weekly, Monthly, Replace, Option, Logout, and reload session persistence.

CSV Upload E2E is mandatory after applying `05b` because sequence privileges are intentionally reduced to `authenticated` `USAGE` only.
