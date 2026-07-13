# csv_uploads DELETE Gate E2E Package

Target Supabase project:

- Project name: `GUGUMOjp's Project`
- Project ID: `annvqxnupddnozyghqdw`

Forbidden project:

- Project ID: `ivtaxvuysqqnzpnwndqt`

This package is dedicated to the final CSV permanent-delete gate. It creates only temporary DELETE Gate test tenants and rows. It must not be used with real customer tenants or rows.

## Current Gate Context

DELETE authorization has already been applied to the formal DB:

- `authenticated` has `DELETE` table privilege on `public.csv_uploads`.
- DELETE policy `csv_uploads_owner_admin_delete_excluded_same_tenant` exists.
- Post-apply verification passed before this package was prepared.

This package does not change RLS, GRANTs, schema, functions, triggers, or application code.

## Completion Record

DELETE Gate E2E has passed against the formal project:

- owner own-tenant excluded DELETE: PASS, target row absent.
- admin own-tenant excluded DELETE: PASS, target row absent.
- active row DELETE: PASS, denied/no mutation and row remained.
- member own-tenant excluded DELETE: PASS, denied/no mutation and row remained.
- viewer own-tenant excluded DELETE: PASS, denied/no mutation and row remained.
- owner cross-tenant excluded DELETE: PASS, denied/no mutation and row remained.
- anonymous DELETE: PASS, denied/no mutation and row remained.
- unexpected marker row count: PASS, 0.
- dedicated Tenant B/C cleanup: PASS.
- dedicated DELETE Gate test Auth user: manually deleted from Supabase Dashboard.

Filled UUIDs, email addresses, JWTs, API keys, and upload IDs used during manual verification are not stored in this repository.

## Files

1. `01_read_only_preflight.sql`
   - Read-only confirmation that DELETE authorization and policy shape are ready.
2. `02_create_delete_gate_test_data_template.sql`
   - Creates dedicated Tenant B, dedicated Tenant C, one Tenant B profile for the manually-created test Auth user, and three test `csv_uploads` rows.
3. `03_verify_delete_gate_test_data.sql`
   - Read-only verification of the dedicated test data.
4. `04_switch_test_role_template.sql`
   - Switches the same test user's Tenant B role.
5. `05_reseed_excluded_row_template.sql`
   - Adds one new Tenant B excluded row after a successful allowed DELETE consumes the previous one.
6. `06_verify_delete_gate_results.sql`
   - Read-only phase/final verification using expected present/absent states.
7. `07_cleanup_delete_gate_test_data_template.sql`
   - Deletes only dedicated DELETE Gate test data.

## Non-Negotiable Rules

- Confirm the Dashboard project is `GUGUMOjp's Project` / `annvqxnupddnozyghqdw` before every SQL block.
- Do not run on `ivtaxvuysqqnzpnwndqt`.
- Create the one DELETE Gate test Auth user manually in Supabase Dashboard.
- Do not create Auth users with SQL.
- Replace placeholders only in SQL Editor or an uncommitted scratchpad.
- Do not commit filled UUIDs, emails, passwords, JWTs, API keys, anon keys, or Service Role keys.
- Do not use Service Role.
- Do not use real customer tenant rows.
- Do not use existing formal owner/admin profiles.
- DELETE test rows must be dedicated marker rows containing `GUGUMO_DELETE_GATE_E2E_20260713`.

## Dedicated Test Structure

### Tenant B

Tenant B is the test user's own tenant:

- `GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_COMPANY`
- `GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_WORKSPACE`
- One `profiles` row for the manually-created test Auth user
- Initial role: `owner`

Tenant B starts with:

- active row: `GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_ACTIVE.csv`
- excluded row: `GUGUMO_DELETE_GATE_E2E_20260713_TENANT_B_EXCLUDED.csv`

### Tenant C

Tenant C is cross-tenant denial data:

- `GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_COMPANY`
- `GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_WORKSPACE`
- No profile for the test Auth user
- excluded row: `GUGUMO_DELETE_GATE_E2E_20260713_TENANT_C_EXCLUDED.csv`

## Placeholder Inventory

Common placeholders:

- `<confirmed-project-id>`: must be `annvqxnupddnozyghqdw` after manual Dashboard confirmation.
- `<test-auth-user-id>`: UUID of the manually-created test Auth user.
- `<test-auth-user-email-placeholder>`: non-secret placeholder value used only in SQL Editor.
- `<tenant-b-company-id>`
- `<tenant-b-workspace-id>`
- `<tenant-c-company-id>`
- `<tenant-c-workspace-id>`
- `<tenant-b-active-upload-id>`: positive bigint, not UUID.
- `<tenant-b-excluded-upload-id>`: positive bigint, not UUID.
- `<tenant-c-excluded-upload-id>`: positive bigint, not UUID.
- `<expected-current-role>`
- `<next-role>`
- `<new-tenant-b-excluded-upload-id>`: positive bigint, not UUID.
- `<reseed-label>`: lowercase letters, digits, and underscores only.
- `<expected-tenant-b-csv-upload-count>`
- `<expected-tenant-c-csv-upload-count>`
- `<tenant-b-active-expected-state>`: `present`, `absent`, or `skip`.
- `<owner-deleted-upload-id>` and `<owner-deleted-expected-state>`
- `<admin-deleted-upload-id>` and `<admin-deleted-expected-state>`
- `<member-denied-upload-id>` and `<member-denied-expected-state>`
- `<viewer-denied-upload-id>` and `<viewer-denied-expected-state>`
- `<tenant-c-excluded-expected-state>`
- `<anonymous-target-upload-id>`, `<anonymous-target-tenant>`, and `<anonymous-target-expected-state>`

`csv_uploads.id` is a bigint identity column in the formal DB. The templates use explicit positive bigint IDs so REST DELETE targets are deterministic. Each template stops if an ID already exists.

## Execution Sequence

Do not run all files blindly. Review the result after each step.

1. Run `01_read_only_preflight.sql`.
2. Require no `STOP`.
3. Confirm the one DELETE Gate test Auth user exists in Supabase Dashboard.
4. Fill `02_create_delete_gate_test_data_template.sql` placeholders outside the repository.
5. Run `02_create_delete_gate_test_data_template.sql`.
6. Run `03_verify_delete_gate_test_data.sql`.
7. Login as the test user and confirm Tenant B / owner on Home.
8. Execute DELETE Gate phases below.
9. Run `07_cleanup_delete_gate_test_data_template.sql` after all checks.
10. Delete the test Auth user manually in Supabase Dashboard after cleanup succeeds.

## REST Environment Placeholders

Use a local scratch terminal only. Do not commit filled values.

```bash
SUPABASE_URL="<supabase-url>"
SUPABASE_ANON_KEY="<anon-key>"
TEST_USER_JWT="<test-user-jwt>"
TENANT_B_COMPANY_ID="<tenant-b-company-id>"
TENANT_B_WORKSPACE_ID="<tenant-b-workspace-id>"
TENANT_C_COMPANY_ID="<tenant-c-company-id>"
TENANT_C_WORKSPACE_ID="<tenant-c-workspace-id>"
UPLOAD_ID="<upload-id>"
```

Avoid pasting real JWTs or keys into issue comments, docs, screenshots, or commits. Service Role must not be used.

## DELETE Request Template

Use all filters to avoid touching the wrong row.

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads?id=eq.$UPLOAD_ID&company_id=eq.$TENANT_B_COMPANY_ID&workspace_id=eq.$TENANT_B_WORKSPACE_ID&status=eq.excluded" \
  -X DELETE \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT"
```

For active-row denial, set `status=eq.active` and use the Tenant B active upload ID.

For cross-tenant denial, use Tenant C company/workspace/upload IDs while authenticated as the Tenant B test user.

For anonymous denial, omit the `Authorization` header:

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads?id=eq.$UPLOAD_ID&company_id=eq.$TENANT_B_COMPANY_ID&workspace_id=eq.$TENANT_B_WORKSPACE_ID&status=eq.excluded" \
  -X DELETE \
  -H "apikey: $SUPABASE_ANON_KEY"
```

## Result Interpretation

Do not rely on HTTP status alone.

Allowed DELETE PASS:

- Target row is absent in `06_verify_delete_gate_results.sql`.

Denied DELETE PASS:

- Target row remains in `06_verify_delete_gate_results.sql`.

RLS/PostgREST may return 401, 403, 200, 204, or an empty result depending on the path. The row's final existence is the source of truth.

## Phase 1: Owner

Initial role after create: `owner`.

1. Active row DELETE attempt:
   - Use `<tenant-b-active-upload-id>`.
   - Expected: denied/no mutation.
   - Verify: `tenant_b_active_row` expected state `present`.
2. Own excluded row DELETE:
   - Use `<tenant-b-excluded-upload-id>`.
   - Expected: allowed.
   - Verify: `owner_deleted_row` expected state `absent`.

After owner allowed DELETE, reseed is required before admin.

## Phase 2: Admin

1. Run `05_reseed_excluded_row_template.sql`.
   - Use a new `<new-tenant-b-excluded-upload-id>`.
   - Suggested `<reseed-label>`: `admin_allowed`.
2. Run `04_switch_test_role_template.sql`.
   - `<expected-current-role>` = `owner`
   - `<next-role>` = `admin`
3. Logout/login or refresh JWT/session.
4. DELETE the reseeded Tenant B excluded row.
5. Verify `admin_deleted_row` expected state `absent`.

After admin allowed DELETE, reseed is required before member.

## Phase 3: Member

1. Run `05_reseed_excluded_row_template.sql`.
   - Use a new `<new-tenant-b-excluded-upload-id>`.
   - Suggested `<reseed-label>`: `member_denied`.
2. Run `04_switch_test_role_template.sql`.
   - `<expected-current-role>` = `admin`
   - `<next-role>` = `member`
3. Logout/login or refresh JWT/session.
4. DELETE attempt against the reseeded Tenant B excluded row.
5. Expected: denied/no mutation.
6. Verify `member_denied_row` expected state `present`.

Do not reseed before viewer if the member-denied row remains. Reuse the same row for viewer denial if practical.

## Phase 4: Viewer

1. Run `04_switch_test_role_template.sql`.
   - `<expected-current-role>` = `member`
   - `<next-role>` = `viewer`
2. Logout/login or refresh JWT/session.
3. DELETE attempt against the same member-denied Tenant B excluded row, or another reseeded excluded row if a reviewer chose to create one.
4. Expected: denied/no mutation.
5. Verify `viewer_denied_row` expected state `present`.

## Phase 5: Cross-Tenant

Viewer denial does not prove tenant isolation. Switch back to owner or admin first.

1. Run `04_switch_test_role_template.sql`.
   - `<expected-current-role>` = `viewer`
   - `<next-role>` = `owner`
2. Logout/login or refresh JWT/session.
3. DELETE attempt against Tenant C excluded row.
4. Expected: denied/no mutation.
5. Verify `cross_tenant_row` expected state `present`.

## Phase 6: Anonymous

Use a remaining dedicated excluded row. Tenant B member/viewer denied row is easiest if it remains.

1. Omit `Authorization: Bearer`.
2. DELETE attempt against the remaining dedicated excluded row.
3. Expected: denied/no mutation.
4. Verify `anonymous_target_row` expected state `present`.

## Using `06_verify_delete_gate_results.sql`

For each phase, replace expected states for relevant rows:

- `present`: row must exist with expected tenant/status.
- `absent`: row must be gone.
- `skip`: ignore this row for the current phase; set its upload ID to `0`.

Example after owner phase:

- Tenant B active row: `present`
- Owner deleted row: `absent`
- Admin/member/viewer rows: `skip`
- Tenant C row: `present`

Final verification should show:

- active row remains.
- owner-deleted row absent.
- admin-deleted row absent.
- member-denied row present.
- viewer-denied row present if separate, or the same remaining denied row present.
- cross-tenant row present.
- anonymous target row present.
- profile current role matches the final expected role.
- no marker row exists outside Tenant B/C.

## Cleanup

Before cleanup:

1. Count remaining Tenant B marker `csv_uploads` rows.
2. Count remaining Tenant C marker `csv_uploads` rows.
3. Fill `<expected-tenant-b-csv-upload-count>` and `<expected-tenant-c-csv-upload-count>`.
4. Review all placeholder IDs and names.
5. Run `07_cleanup_delete_gate_test_data_template.sql`.

Cleanup order:

1. Tenant B/C test `csv_uploads`
2. Tenant B test `profiles`
3. Tenant B/C test `workspaces`
4. Tenant B/C test `companies`

After cleanup succeeds:

1. Open Supabase Dashboard.
2. Go to Authentication.
3. Go to Users.
4. Delete the one DELETE Gate test Auth user manually.

The cleanup SQL never deletes Auth users.

## Final Gate Criteria

DELETE Gate PASS requires:

- admin own-tenant excluded DELETE allowed.
- member own-tenant excluded DELETE denied/no mutation.
- viewer own-tenant excluded DELETE denied/no mutation.
- active row DELETE denied/no mutation.
- cross-tenant excluded DELETE denied/no mutation with role owner/admin.
- anonymous DELETE denied/no mutation.
- cleanup leaves no marker residue.
- test Auth user is deleted manually after cleanup.

DELETE Gate execution, review, cleanup, and test Auth user deletion are complete. Future reruns must use fresh placeholders and must not reuse previous filled test values.
