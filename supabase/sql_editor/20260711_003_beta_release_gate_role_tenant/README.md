# Beta Release Gate Role/Tenant Manual E2E Package

Target Supabase project: GUGUMOjp's Project / `annvqxnupddnozyghqdw`.

Do not use this package on `ivtaxvuysqqnzpnwndqt`.

## Files

- `01_read_only_preflight.sql`: read-only metadata and integrity checks.
- `02_create_test_tenant_template.sql`: write template for one temporary tenant B and one test profile.
- `03_verify_test_data.sql`: read-only verification for the one-user test tenant.
- `04_switch_test_role_template.sql`: write template to switch the same test user's role.
- `05_cleanup_test_data_template.sql`: cleanup template in foreign-key-safe order.

## Rules

- Use exactly one dedicated test Auth user for role/tenant E2E.
- Create or invite the test Auth user manually in Supabase Dashboard.
- Do not create Auth users with SQL.
- Do not modify existing info accounts, customer Auth users, or existing tenant A profiles.
- Do not paste real UUIDs, emails, JWTs, API keys, or Service Role keys back into the repository.
- Use only user JWTs from normal authenticated sessions for REST checks.
- Do not use Service Role for beta E2E.
- Stop immediately on wrong project, duplicate profile, tenant mismatch, unexpected role, or unexpected profile in tenant B.
- Role/Tenant Manual E2E passed on 2026-07-12.
- The SQL templates in this repository remain placeholders. Filled test values must stay outside the repository.
- The dedicated test Auth user was manually deleted after cleanup.
- Cleanup completed with 0 residual rows in `companies`, `workspaces`, `profiles`, and `csv_uploads`.
- Existing formal accounts and existing tenant A data were not changed.

## Verification Record

| Area | Result |
| --- | --- |
| owner role display after re-login | PASS |
| admin role display after re-login | PASS |
| member role display after re-login | PASS |
| viewer role display after re-login | PASS |
| owner own-tenant SELECT/INSERT/UPDATE | PASS |
| owner DELETE | PASS: 403 denied |
| admin own-tenant SELECT/INSERT/UPDATE | PASS: INSERT 201, UPDATE 200 |
| admin DELETE | PASS: 403 denied |
| member own-tenant SELECT/INSERT | PASS: INSERT 201 |
| member UPDATE | PASS: HTTP 200 `[]`; row unchanged |
| member DELETE | PASS: 403 denied |
| viewer own-tenant SELECT | PASS |
| viewer INSERT | PASS: 403 RLS denied |
| viewer UPDATE | PASS: HTTP 200 `[]`; row unchanged |
| viewer DELETE | PASS: 403 denied |
| tenant A `csv_uploads` SELECT | PASS: HTTP 200 `[]` |
| tenant A `company_id` INSERT | PASS: 403 RLS denied |
| tenant A `workspace_id` INSERT | PASS: 403 RLS denied |
| `uploaded_by` spoof | PASS: 403 RLS denied |
| tenant B row `company_id` changed to tenant A | PASS: 403 RLS denied |
| tenant B row `workspace_id` changed to tenant A | PASS: 403 RLS denied |
| cleanup residue | PASS: 0 rows in test `companies`, `workspaces`, `profiles`, `csv_uploads` |

## Setup Flow

1. Run `01_read_only_preflight.sql`.
2. In Supabase Dashboard, create or invite one dedicated test Auth user.
3. Fill placeholders in `02_create_test_tenant_template.sql` outside the repository.
4. Use `owner` as `<initial-test-role>` unless a reviewer explicitly chooses another valid role.
5. Run `02_create_test_tenant_template.sql`.
6. Run `03_verify_test_data.sql`.
7. Login to the app as the test user and confirm Home shows tenant B and the current role.

## Role Switch Flow

Run the same user through this order:

```text
owner
admin
member
viewer
```

For each role transition:

1. Fill `04_switch_test_role_template.sql`.
2. Set `<expected-current-role>` to the current role.
3. Set `<next-role>` to the next role.
4. Run the switch template.
5. Run `03_verify_test_data.sql`.
6. Logout from the app.
7. Login again as the same test user.
8. Confirm Home shows the expected role.
9. Run REST/App E2E for that role.

## REST Curl Templates

Replace placeholders only in a local terminal or scratchpad. Do not commit filled commands.

```bash
SUPABASE_URL="<supabase-url>"
SUPABASE_ANON_KEY="<anon-key>"
TEST_USER_JWT="<test-user-jwt>"
TEST_USER_ID="<test-user-id>"
TENANT_A_COMPANY_ID="<tenant-a-company-id>"
TENANT_A_WORKSPACE_ID="<tenant-a-workspace-id>"
TENANT_A_UPLOAD_ID="<tenant-a-upload-id>"
TENANT_A_USER_ID="<tenant-a-user-id>"
TEST_COMPANY_B_ID="<test-company-b-id>"
TEST_WORKSPACE_B_ID="<test-workspace-b-id>"
TEST_UPLOAD_ID="<test-upload-id>"
```

### Own Tenant SELECT

Run for owner, admin, member, and viewer after each role switch and re-login.

```bash
curl -i "$SUPABASE_URL/rest/v1/profiles?select=*" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $TEST_USER_JWT"
curl -i "$SUPABASE_URL/rest/v1/companies?select=*" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $TEST_USER_JWT"
curl -i "$SUPABASE_URL/rest/v1/workspaces?select=*" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $TEST_USER_JWT"
curl -i "$SUPABASE_URL/rest/v1/csv_uploads?select=id,file_name,company_id,workspace_id,uploaded_by,status" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $TEST_USER_JWT"
```

Expected:

- owner/admin/member/viewer: HTTP 200 with tenant B rows.

### Own Tenant INSERT

Run after each role switch.

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"file_name":"<role-test-file>.csv","file_data":[{"物件コード":"TEST-ROLE-001","物件名":"TEST PROPERTY","物件掲載":"掲載"}],"company_id":"'"$TEST_COMPANY_B_ID"'","workspace_id":"'"$TEST_WORKSPACE_B_ID"'","uploaded_by":"'"$TEST_USER_ID"'","snapshot_date":"<yyyy-mm-dd>","checksum":"<role-test-checksum>","status":"active"}'
```

Expected:

- owner/admin/member: allowed, HTTP 201/200 with inserted tenant B row.
- viewer: denied, HTTP 403-class RLS or permission error.

### Own Tenant UPDATE

Run after each role switch with a tenant B upload id.

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads?id=eq.$TEST_UPLOAD_ID" \
  -X PATCH \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"status":"excluded"}'
```

Expected:

- owner/admin: allowed, HTTP 200 with updated tenant B row.
- member/viewer: denied or no mutation. Release PASS requires the row not to change.

### DELETE

Run after each role switch with a tenant B upload id.

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads?id=eq.$TEST_UPLOAD_ID" \
  -X DELETE \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT"
```

Expected:

- owner/admin/member/viewer: denied, HTTP 401/403-class permission error.

## Tenant Crossing

The test user belongs to tenant B. Do not modify existing info accounts or tenant A profiles.

### Tenant A SELECT

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads?company_id=eq.$TENANT_A_COMPANY_ID&select=id,file_name" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $TEST_USER_JWT"
curl -i "$SUPABASE_URL/rest/v1/workspaces?id=eq.$TENANT_A_WORKSPACE_ID&select=*" -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $TEST_USER_JWT"
```

Expected:

- HTTP 200 with `[]`.
- This is different from permission denied; SELECT should simply reveal no tenant A rows.

### Tenant A company_id INSERT

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"file_name":"<cross-company-file>.csv","file_data":[{"物件コード":"TEST-CROSS-001","物件名":"TEST PROPERTY","物件掲載":"掲載"}],"company_id":"'"$TENANT_A_COMPANY_ID"'","workspace_id":"'"$TEST_WORKSPACE_B_ID"'","uploaded_by":"'"$TEST_USER_ID"'","snapshot_date":"<yyyy-mm-dd>","checksum":"<cross-company-checksum>","status":"active"}'
```

Expected: denied, HTTP 403-class RLS or permission error.

### Tenant A workspace_id INSERT

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"file_name":"<cross-workspace-file>.csv","file_data":[{"物件コード":"TEST-CROSS-002","物件名":"TEST PROPERTY","物件掲載":"掲載"}],"company_id":"'"$TEST_COMPANY_B_ID"'","workspace_id":"'"$TENANT_A_WORKSPACE_ID"'","uploaded_by":"'"$TEST_USER_ID"'","snapshot_date":"<yyyy-mm-dd>","checksum":"<cross-workspace-checksum>","status":"active"}'
```

Expected: denied, HTTP 403-class RLS or permission error.

### uploaded_by Spoof

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"file_name":"<spoof-uploaded-by-file>.csv","file_data":[{"物件コード":"TEST-SPOOF-001","物件名":"TEST PROPERTY","物件掲載":"掲載"}],"company_id":"'"$TEST_COMPANY_B_ID"'","workspace_id":"'"$TEST_WORKSPACE_B_ID"'","uploaded_by":"'"$TENANT_A_USER_ID"'","snapshot_date":"<yyyy-mm-dd>","checksum":"<spoof-uploaded-by-checksum>","status":"active"}'
```

Expected: denied, HTTP 403-class RLS or permission error.

### Cross-Tenant UPDATE

```bash
curl -i "$SUPABASE_URL/rest/v1/csv_uploads?id=eq.$TEST_UPLOAD_ID" \
  -X PATCH \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"company_id":"'"$TENANT_A_COMPANY_ID"'"}'

curl -i "$SUPABASE_URL/rest/v1/csv_uploads?id=eq.$TEST_UPLOAD_ID" \
  -X PATCH \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"workspace_id":"'"$TENANT_A_WORKSPACE_ID"'"}'
```

Expected:

- Both denied, HTTP 403-class RLS or permission error.

## Cleanup

1. Set `<expected-csv-upload-count>` to the exact number of tenant B `csv_uploads` rows.
2. Review target company/workspace/profile IDs and names in `05_cleanup_test_data_template.sql`.
3. Run cleanup only after counts and names match.
4. After cleanup succeeds, delete the one test Auth user manually in Supabase Dashboard.
