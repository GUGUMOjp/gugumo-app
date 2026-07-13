# GUGUMO Authorization Matrix

This document describes the intended beta authorization behavior. It is operational design, not proof that RLS has been applied.

## Roles

| Role | View dashboard/reports | Upload CSV | Exclude/activate uploads | Permanently delete excluded CSV | Manage billing/legal | Notes |
| --- | --- | --- | --- | --- | --- |
| owner | Yes | Yes | Yes | Excluded own-tenant only | Manual operation | Contract owner or main customer admin |
| admin | Yes | Yes | Yes | Excluded own-tenant only | Manual operation | Store manager or delegated admin |
| member | Yes | Yes | No | No | No | Operational staff |
| viewer | Yes | No | No | No | No | Read-only stakeholder |

## Tenant-Unlinked Users

If a logged-in user exists but no profile has been created yet:

- Do not fall back to Demo Company.
- Do not show another tenant's data.
- Do not allow CSV upload, exclusion, activation, or analysis operations.
- Keep the session valid so the user can log out.
- Show the pending provisioning screen: `GUGUMOアカウントを準備しています`.

If a profile exists but has invalid role, missing tenant links, missing company/workspace rows, or a company/workspace mismatch, treat it as an unexpected configuration error. Do not show another tenant and do not classify it as normal pending provisioning.

## Current Implementation Notes

- Server Actions call `getCurrentWorkspaceContext` before CSV operations.
- Upload exclusion/activation is restricted to owner/admin.
- Permanent delete app code and DELETE GRANT/Policy have been applied to the formal DB; dedicated DELETE Gate E2E passed.
- CSV insert is allowed for owner/admin/member and blocked for viewer by RLS.
- CSV update is allowed for owner/admin and blocked for member/viewer by RLS.
- CSV delete behavior is owner/admin excluded own-tenant only; member/viewer/anonymous/cross-tenant and active rows remain denied.
- RLS metadata has been applied to `companies`, `workspaces`, `profiles`, and `csv_uploads`.
- Role/Tenant Manual E2E passed on 2026-07-12 using one dedicated test Auth user whose `profiles.role` was switched through owner/admin/member/viewer. The test tenant was cleaned up and the test Auth user was deleted manually.
- DELETE Gate E2E passed after applying permanent delete authorization. Owner/admin excluded own-tenant DELETE is allowed; active rows, member, viewer, cross-tenant, and anonymous DELETE remain denied. Dedicated Tenant B/C cleanup completed and the DELETE Gate test Auth user was manually deleted.

## Current csv_uploads Matrix After DELETE Authorization

| Role | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| owner | Allowed | Allowed | Allowed | Excluded own-tenant only |
| admin | Allowed | Allowed | Allowed | Excluded own-tenant only |
| member | Allowed | Allowed | No mutation | Denied |
| viewer | Allowed | Denied | No mutation | Denied |

## DELETE Gate E2E Matrix

The table below is the permanent-delete authorization result verified after DELETE GRANT/Policy application. Filled test values are not stored in the repository.

| Case | Expected / observed result |
| --- | --- |
| owner excluded own-tenant DELETE | PASS: allowed; target row absent |
| admin excluded own-tenant DELETE | PASS: allowed; target row absent |
| active row DELETE | PASS: denied/no mutation; row remains |
| member excluded own-tenant DELETE | PASS: denied/no mutation; row remains |
| viewer excluded own-tenant DELETE | PASS: denied/no mutation; row remains |
| owner cross-tenant excluded DELETE | PASS: denied/no mutation; row remains |
| anonymous excluded DELETE | PASS: denied/no mutation; row remains |
| unexpected marker rows | PASS: 0 |
| DELETE Gate cleanup | PASS: dedicated Tenant B/C test rows removed; test Auth user manually deleted |

## Manual E2E Matrix

The table below is the pre-permanent-delete beta authorization result verified on 2026-07-12. Filled test values are not stored in the repository.

| Case | owner | admin | member | viewer |
| --- | --- | --- | --- | --- |
| profile/company/workspace SELECT | Allowed | Allowed | Allowed | Allowed |
| csv_uploads SELECT | Allowed | Allowed | Allowed | Allowed |
| csv_uploads INSERT own tenant | Allowed | Allowed | Allowed | Denied: 403 RLS |
| csv_uploads UPDATE own tenant | Allowed | Allowed | Denied as 0-row update; row unchanged | Denied as 0-row update; row unchanged |
| csv_uploads DELETE | Denied: 403 | Denied: 403 | Denied: 403 | Denied: 403 |
| other-tenant company/workspace/csv_uploads SELECT | HTTP 200 `[]` | HTTP 200 `[]` | HTTP 200 `[]` | HTTP 200 `[]` |
| fake company_id INSERT | Denied: 403 RLS | Denied: 403 RLS | Denied: 403 RLS | Denied: 403 RLS |
| fake workspace_id INSERT | Denied: 403 RLS | Denied: 403 RLS | Denied: 403 RLS | Denied: 403 RLS |
| uploaded_by spoof INSERT | Denied: 403 RLS | Denied: 403 RLS | Denied: 403 RLS | Denied: 403 RLS |
| company_id/workspace_id change UPDATE | Denied: 403 RLS | Denied: 403 RLS | Denied / no mutation | Denied / no mutation |
