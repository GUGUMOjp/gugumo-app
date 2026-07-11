# GUGUMO Authorization Matrix

This document describes the intended beta authorization behavior. It is operational design, not proof that RLS has been applied.

## Roles

| Role | View dashboard/reports | Upload CSV | Exclude/activate uploads | Manage billing/legal | Notes |
| --- | --- | --- | --- | --- | --- |
| owner | Yes | Yes | Yes | Manual operation | Contract owner or main customer admin |
| admin | Yes | Yes | Yes | Manual operation | Store manager or delegated admin |
| member | Yes | Yes | No | No | Operational staff |
| viewer | Yes | No | No | No | Read-only stakeholder |

## Tenant-Unlinked Users

If a logged-in user has no usable `company_id`, `workspace_id`, or `role`:

- Do not fall back to Demo Company.
- Do not show another tenant's data.
- Do not allow CSV upload, exclusion, activation, or analysis operations.
- Keep the session valid so the user can log out.
- Show an account setup incomplete screen with a support link.

## Current Implementation Notes

- Server Actions call `getCurrentWorkspaceContext` before CSV operations.
- Upload exclusion/activation is restricted to owner/admin.
- RLS is not confirmed in this document; SQL Editor verification is required.

